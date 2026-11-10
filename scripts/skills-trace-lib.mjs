import { createHash } from 'node:crypto'
import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{8,}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi,
  /\b(?:api[_-]?key|authorization)\s*[=:]\s*["']?[^\s"',;]+/gi,
  /\b[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\b/gi,
]

export function compact(value, limit = 260) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text
}

export function redactText(value, root = '') {
  let text = String(value ?? '')
    .replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(
      /[A-Z]:[\\/]+Windows[\\/]+System32[\\/]+WindowsPowerShell[\\/]+v1\.0[\\/]+powershell\.exe/gi,
      'powershell.exe',
    )
    .replace(/[A-Z]:[\\/]+Program Files[\\/]+PowerShell[\\/]+[^\\/]+[\\/]+pwsh\.exe/gi, 'pwsh.exe')
    .replaceAll(path.resolve(root), '<workspace>')
    .replace(/[A-Z]:\\Users\\[^\\\s"'<>]+/gi, '~')
    .replace(/\/home\/[^/\s"'<>]+/g, '~')

  for (const pattern of SECRET_PATTERNS) text = text.replace(pattern, '[REDACTED]')
  return text
}

export function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex')
}

export function parseJsonLines(text) {
  return String(text)
    .split(/\r?\n/)
    .map((line) => {
      const candidate = line.trim()
      if (!candidate.startsWith('{')) return null
      try {
        return JSON.parse(candidate)
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

export function providerUsage(rawLines) {
  const usage = [...rawLines].reverse().find((line) => line?.type === 'turn.completed')?.usage
  if (!usage) throw new Error('Codex JSON 中缺少 turn.completed.usage')

  return {
    inputTokens: Number(usage.input_tokens) || 0,
    cachedInputTokens: Number(usage.cached_input_tokens) || 0,
    cacheWriteInputTokens: Number(usage.cache_write_input_tokens) || 0,
    outputTokens: Number(usage.output_tokens) || 0,
    reasoningOutputTokens: Number(usage.reasoning_output_tokens) || 0,
    source: 'provider',
  }
}

function readableItems(rawLines) {
  return rawLines
    .filter((line) => line?.type === 'item.completed' && line?.item)
    .map((line) => line.item)
    .filter((item) => item?.type !== 'reasoning')
}

function normalizedCommand(item) {
  return String(item?.command ?? '').replaceAll('\\', '/')
}

function itemFailed(item) {
  return (
    item?.status === 'failed' ||
    (typeof item?.exit_code === 'number' && item.exit_code !== 0)
  )
}

function finalAgentMessage(items) {
  const messages = items
    .filter((item) => item?.type === 'agent_message' && String(item.text ?? '').trim())
    .map((item) => String(item.text).trim())
  return messages.at(-1) ?? ''
}

export function normalizeTraceEvents(
  rawLines,
  {
    root,
    prompt,
    skillName,
    skillPath,
    referencePath,
    scriptPath,
    fileChars,
    indexMetadataChars,
    indexEstimatedTokens,
  },
) {
  const events = []
  const push = (event) => {
    events.push({
      id: `skill-event-${events.length + 1}`,
      ordinal: events.length + 1,
      status: 'info',
      contextCharsAdded: 0,
      contextTokensAdded: 0,
      tokenLabel: 'estimated',
      ...event,
    })
  }

  push({
    kind: 'turn',
    level: 'context',
    observability: 'observed',
    title: '显式调用进入当前 turn',
    summary: compact(redactText(prompt, root), 220),
    status: 'passed',
  })

  push({
    kind: 'metadata',
    level: 'metadata',
    observability: 'computed',
    title: '初始技能索引已准备',
    summary: `扫描到的 SKILL.md 元数据共 ${indexMetadataChars.toLocaleString('en-US')} 字符；按 chars/4 估算约 ${indexEstimatedTokens.toLocaleString('en-US')} token。`,
    status: 'passed',
    contextCharsAdded: indexMetadataChars,
    contextTokensAdded: indexEstimatedTokens,
  })

  push({
    kind: 'selection',
    level: 'instructions',
    observability: 'documented',
    title: `显式命中 ${skillName}`,
    summary:
      '当前 Codex JSON 事件不暴露完整 system prompt，因此这一项依据显式调用和后续文件读取判定，不展示未捕获的原始索引。',
    file: skillPath,
    status: 'passed',
  })

  for (const item of readableItems(rawLines)) {
    if (item?.type !== 'command_execution') continue

    const command = redactText(compact(item.command, 360), root)
    const normalized = normalizedCommand(item)
    const output = redactText(compact(item.aggregated_output ?? item.output ?? '', 900), root)
    const failed = itemFailed(item)

    if (/SKILL\.md/i.test(normalized)) {
      const chars = fileChars.get(skillPath) ?? 0
      push({
        kind: 'read',
        level: 'instructions',
        observability: 'observed',
        title: '读取 SKILL.md 正文',
        summary: '技能根文档进入当前上下文；此时才加载 Level 2 的过程性指令。',
        command,
        outputExcerpt: output || '[文件读取完成，原始正文不重复写入快照]',
        file: skillPath,
        status: failed ? 'failed' : 'passed',
        contextCharsAdded: chars,
        contextTokensAdded: Math.ceil(chars / 4),
      })
      continue
    }

    if (/editorial-checklist\.md/i.test(normalized)) {
      const chars = fileChars.get(referencePath) ?? 0
      push({
        kind: 'read',
        level: 'reference',
        observability: 'observed',
        title: '按需读取审查清单',
        summary: '只有任务需要的参考文件才进入上下文；未引用资源保持零 token。',
        command,
        outputExcerpt: output || '[参考文件读取完成，原始全文不重复写入快照]',
        file: referencePath,
        status: failed ? 'failed' : 'passed',
        contextCharsAdded: chars,
        contextTokensAdded: Math.ceil(chars / 4),
      })
      continue
    }

    if (/audit-brief\.mjs/i.test(normalized)) {
      const chars = output.length
      push({
        kind: 'execute',
        level: 'script',
        observability: 'observed',
        title: '执行确定性审计脚本',
        summary: '脚本源码不进入模型上下文；回放中记录的是命令与脚本输出。',
        command,
        outputExcerpt: output || '[脚本执行完成但没有输出]',
        file: scriptPath,
        status: failed ? 'failed' : 'passed',
        contextCharsAdded: chars,
        contextTokensAdded: Math.ceil(chars / 4),
      })
    }
  }

  const finalOutput = redactText(finalAgentMessage(readableItems(rawLines)), root)
  if (!finalOutput) throw new Error('Codex JSON 中缺少最终 agent_message')

  push({
    kind: 'message',
    level: 'output',
    observability: 'observed',
    title: '形成可复核的发布建议',
    summary: '最终可见输出返回给用户；这里不保存模型内部 reasoning。',
    outputExcerpt: compact(finalOutput, 900),
    status: 'passed',
  })

  const usage = providerUsage(rawLines)
  push({
    kind: 'usage',
    level: 'context',
    observability: 'observed',
    title: '收束 provider usage',
    summary: `input ${usage.inputTokens.toLocaleString('en-US')} · cached ${usage.cachedInputTokens.toLocaleString('en-US')} · output ${usage.outputTokens.toLocaleString('en-US')} · reasoning ${usage.reasoningOutputTokens.toLocaleString('en-US')}`,
    status: 'passed',
    tokenLabel: 'provider',
  })

  return { events, finalOutput, usage }
}

export function assertTraceEvidence(events) {
  const checks = [
    ['SKILL.md 读取', (event) => event.kind === 'read' && event.level === 'instructions'],
    ['引用文件读取', (event) => event.kind === 'read' && event.level === 'reference'],
    ['脚本执行', (event) => event.kind === 'execute' && event.level === 'script'],
    ['最终输出', (event) => event.kind === 'message' && event.level === 'output'],
  ]
  const missing = checks.filter(([, test]) => !events.some(test)).map(([label]) => label)
  if (missing.length > 0) {
    throw new Error(`真实轨迹缺少证据：${missing.join('、')}。请检查技能指令后重录，不生成伪造事件。`)
  }
}

function frontmatterField(text, field) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return ''
  const line = match[1]
    .split(/\r?\n/)
    .find((item) => item.startsWith(`${field}:`))
  return line ? line.slice(field.length + 1).trim().replace(/^['"]|['"]$/g, '') : ''
}

async function walkFiles(directory) {
  const found = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) found.push(...(await walkFiles(target)))
    else found.push(target)
  }
  return found
}

export async function scanSkillIndex(rootEntries) {
  const seen = new Set()
  let metadataChars = 0
  let scannedSkillFiles = 0

  for (const { absolute, label } of rootEntries) {
    try {
      const files = await walkFiles(absolute)
      for (const file of files) {
        if (path.basename(file) !== 'SKILL.md') continue
        const resolved = path.resolve(file)
        if (seen.has(resolved)) continue
        seen.add(resolved)
        const text = await readFile(file, 'utf8')
        const name = frontmatterField(text, 'name')
        const description = frontmatterField(text, 'description')
        metadataChars += `${name}\n${description}\n${path.relative(absolute, file)}`.length
        scannedSkillFiles += 1
      }
    } catch {
      // Missing optional skill roots do not invalidate the project-level trace.
    }
  }

  return {
    scannedSkillFiles,
    metadataChars,
    estimatedTokens: Math.ceil(metadataChars / 4),
    defaultContextRatio: 0.02,
    rule:
      'Codex 官方文档说明初始技能列表最多使用模型上下文窗口的 2%；窗口未知时按 8,000 字符回退。页面只展示本地元数据实测规模，不冒充 provider token。',
    scope: rootEntries.map((entry) => entry.label),
  }
}

export async function buildSkillFileRecords(skillDirectory) {
  const files = await walkFiles(skillDirectory)
  const records = []

  for (const absolute of files.sort()) {
    const relative = path.relative(skillDirectory, absolute).replaceAll('\\', '/')
    const [text, info] = await Promise.all([readFile(absolute, 'utf8'), stat(absolute)])
    const kind =
      relative === 'SKILL.md'
        ? 'instructions'
        : relative.startsWith('references/')
          ? 'reference'
          : relative.startsWith('scripts/')
            ? 'script'
            : 'example'
    records.push({
      path: relative,
      kind,
      bytes: info.size,
      chars: text.length,
      sha256: sha256(text),
      excerpt:
        kind === 'script'
          ? 'Executable helper. The trace records its command and output, not source-body loading.'
          : compact(text, 900),
    })
  }

  return records
}

export function skillFrontmatter(text) {
  return {
    name: frontmatterField(text, 'name'),
    description: frontmatterField(text, 'description'),
  }
}
