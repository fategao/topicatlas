// 一个只服务于本仓库的最小 Markdown 解析器。
// 不引入第三方解析库，是因为我们只需要「标题层级 + 表格 + 代码块 + 段落」这四类结构，
// 而这些结构在官方文档里是稳定且规整的。

/** 去掉行内的 markdown 强调符号，保留纯文本，用于列表摘要展示。 */
export function stripInline(text) {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1$2')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

/** GitHub 风格标题锚点：与 Docusaurus 的 slug 行为一致。 */
export function slugify(heading) {
  return stripInline(heading)
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
}

/**
 * 把 markdown 拆成「文档块」序列，同时跟踪标题栈。
 * 返回的每一项形如：
 *   { kind: 'heading', level, text, anchor }
 *   { kind: 'code', lang, value }
 *   { kind: 'table', head: string[], rows: string[][] }
 *   { kind: 'list', items: string[] }
 *   { kind: 'paragraph', text }
 *   { kind: 'admonition', label, text }
 */
export function parseBlocks(markdown) {
  const lines = markdown.split(/\r?\n/)
  const blocks = []
  let i = 0
  let inFrontMatter = false
  if (lines[0]?.trim() === '---') {
    inFrontMatter = true
    i = 1
  }

  while (i < lines.length) {
    const line = lines[i]

    if (inFrontMatter) {
      if (line.trim() === '---') inFrontMatter = false
      i += 1
      continue
    }

    // 代码围栏
    const fence = /^\s*(```|~~~)\s*([\w+-]*)\s*$/.exec(line)
    if (fence) {
      const marker = fence[1]
      const lang = fence[2] || 'text'
      const buf = []
      i += 1
      while (i < lines.length && !new RegExp(`^\\s*${marker}\\s*$`).test(lines[i])) {
        buf.push(lines[i])
        i += 1
      }
      i += 1
      blocks.push({ kind: 'code', lang, value: buf.join('\n') })
      continue
    }

    // 标题
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      const text = heading[2].trim()
      blocks.push({ kind: 'heading', level: heading[1].length, text, anchor: slugify(text) })
      i += 1
      continue
    }

    // 表格：当前行是 |...|，下一行是分隔行
    if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? '')) {
      const head = splitRow(line)
      i += 2
      const rows = []
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(splitRow(lines[i]))
        i += 1
      }
      blocks.push({ kind: 'table', head, rows })
      continue
    }

    // Docusaurus admonition：:::tip Title ... :::
    const adm = /^\s*:::\s*([\w-]*)\s*(.*)$/.exec(line)
    if (adm && adm[1]) {
      const buf = []
      i += 1
      while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) {
        buf.push(lines[i])
        i += 1
      }
      i += 1
      blocks.push({
        kind: 'admonition',
        label: (adm[2] || adm[1]).trim(),
        text: stripInline(buf.join(' ')),
      })
      continue
    }

    // 列表：连续的 -、*、数字项
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        const buf = [lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, '')]
        i += 1
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
          buf.push(lines[i].trim())
          i += 1
        }
        items.push(stripInline(buf.join(' ')))
      }
      blocks.push({ kind: 'list', items })
      continue
    }

    // 段落
    if (line.trim() !== '') {
      const buf = [line.trim()]
      i += 1
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !/^(#{1,6})\s+/.test(lines[i]) &&
        !/^\s*(```|~~~)/.test(lines[i]) &&
        !/^\s*\|.*\|\s*$/.test(lines[i]) &&
        !/^\s*([-*+]|\d+\.)\s+/.test(lines[i]) &&
        !/^\s*:::/.test(lines[i])
      ) {
        buf.push(lines[i].trim())
        i += 1
      }
      blocks.push({ kind: 'paragraph', text: stripInline(buf.join(' ')) })
      continue
    }

    i += 1
  }

  return blocks
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => stripInline(cell))
}

/**
 * 把块序列折成一棵「章节树」：每个标题节点带上自己的直接内容。
 * 用于把官方文档的 heading 结构映射成站点上的条目标题。
 */
export function toSectionTree(blocks) {
  const root = { level: 0, text: '', anchor: '', content: [], children: [] }
  const stack = [root]

  for (const block of blocks) {
    if (block.kind === 'heading') {
      while (stack.length > 1 && stack[stack.length - 1].level >= block.level) stack.pop()
      const node = { level: block.level, text: block.text, anchor: block.anchor, content: [], children: [] }
      stack[stack.length - 1].children.push(node)
      stack.push(node)
      continue
    }
    stack[stack.length - 1].content.push(block)
  }

  return root
}

/** 深度优先展平章节树。 */
export function flattenSections(node, depth = 0, out = []) {
  for (const child of node.children) {
    out.push({ ...child, depth })
    flattenSections(child, depth + 1, out)
  }
  return out
}

/** 段落的完整文本（用于做条目描述）。 */
export function firstParagraph(node, maxLength = 240) {
  const para = node.content.find((b) => b.kind === 'paragraph' && b.text.length > 12)
  const text = para?.text ?? ''
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}
