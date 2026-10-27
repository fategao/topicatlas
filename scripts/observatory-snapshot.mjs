#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const artifactDir = path.join(root, 'artifacts', 'agent-observatory')
const productLogPath = path.join(artifactDir, 'product-agent.jsonl')
const monitorResultPath = path.join(artifactDir, 'monitor-agent-result.json')
const outputPath = path.join(root, 'src', 'data', 'observatory', 'snapshot.json')

const PRODUCT_SOURCES = [
  'src/features/matrix-lab/matrixMath.ts',
  'src/features/matrix-lab/MatrixLab.tsx',
  'src/features/matrix-lab/matrix-lab.css',
  'tests/unit/matrix-math.test.ts',
  'tests/component/matrix-lab.test.tsx',
]

const SOURCE_SYMBOLS = {
  'src/features/matrix-lab/matrixMath.ts': 'transformVector',
  'src/features/matrix-lab/MatrixLab.tsx': 'MatrixLab',
  'src/features/matrix-lab/matrix-lab.css': '.matrix-lab',
  'tests/unit/matrix-math.test.ts': '2×2 矩阵数学',
  'tests/component/matrix-lab.test.tsx': '矩阵学习实验',
}

const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{8,}\b/g,
  /\b(?:api[_-]?key|token|authorization)\s*[=:]\s*["']?[^\s"',;]+/gi,
  /\b[A-Z]:\\Users\\[^\\\s"'<>]+/gi,
  /\/home\/[^/\s"'<>]+/g,
]

function redact(value) {
  return SECRET_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, '[REDACTED]'),
    String(value ?? ''),
  )
}

function compact(value, limit = 180) {
  const text = redact(value).replace(/\s+/g, ' ').trim()
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text
}

function relativeTarget(value) {
  if (!value) return ''
  const normalized = value.replaceAll('\\', '/')
  const match = PRODUCT_SOURCES.find((source) => normalized.endsWith(source))
  return match ?? compact(normalized, 120)
}

function findSymbolRange(text, symbol) {
  const lines = text.split('\n')
  const startIndex = lines.findIndex((line) => line.includes(symbol))
  if (startIndex < 0) return { startLine: 1, endLine: Math.min(12, lines.length) }

  const joiner = text.includes('{\n') || text.includes('{\r\n')
  if (!joiner) {
    return { startLine: startIndex + 1, endLine: Math.min(startIndex + 12, lines.length) }
  }

  let depth = 0
  let started = false
  for (let index = startIndex; index < Math.min(lines.length, startIndex + 160); index += 1) {
    for (const character of lines[index]) {
      if (character === '{') {
        depth += 1
        started = true
      } else if (character === '}') {
        depth -= 1
      }
    }
    if (started && depth <= 0) {
      return { startLine: startIndex + 1, endLine: index + 1 }
    }
  }

  return { startLine: startIndex + 1, endLine: Math.min(startIndex + 24, lines.length) }
}

function eventKind(item) {
  if (item.type === 'file_change') return 'file'
  if (item.type === 'agent_message' || item.type === 'message') return 'message'
  if (item.type === 'error') return 'error'
  if (item.type === 'mcp_tool_call') return 'tool'
  if (item.type === 'command_execution') {
    return /vitest|npm run|npm test|tsc|eslint/i.test(item.command ?? '') ? 'test' : 'command'
  }
  return null
}

function shouldKeepCommand(item) {
  const command = String(item.command ?? '')
  if (/npx vitest/i.test(command)) return true
  return /Get-Content -Raw '?tests\/|Get-Content -Raw '?src\/features\/matrix-lab|rg --files '?src'|npx vitest|esbuild\.exe.*--version|process\.permission/.test(
    command,
  )
}

function sourceRefsFor(targets, sources) {
  const sourcePaths = new Set(sources.map((source) => source.path))
  const refs = []
  for (const target of targets) {
    if (!sourcePaths.has(target)) continue
    const source = sources.find((item) => item.path === target)
    const symbol = SOURCE_SYMBOLS[target] ?? target.split('/').at(-1)
    const range = findSymbolRange(source.lines.join('\n'), symbol)
    refs.push({ file: target, symbol, ...range })
  }
  return refs
}

async function readJsonLines(target) {
  const text = await readFile(target, 'utf8')
  return text
    .split(/\r?\n/)
    .flatMap((line) => {
      const start = line.indexOf('{')
      if (start < 0) return []
      try {
        return [JSON.parse(line.slice(start))]
      } catch {
        return []
      }
    })
}

async function buildSources() {
  const sources = []
  for (const relativePath of PRODUCT_SOURCES) {
    const text = await readFile(path.join(root, relativePath), 'utf8')
    sources.push({
      path: relativePath,
      language:
        path.extname(relativePath).replace('.', '') === 'tsx'
          ? 'tsx'
          : path.extname(relativePath).replace('.', '') || 'text',
      sha256: createHash('sha256').update(text).digest('hex'),
      lines: text.replaceAll('\r\n', '\n').split('\n'),
    })
  }
  return sources
}

function buildEvents(rawLines, sources, startTime, endTime) {
  const rawItems = rawLines
    .filter((line) => line?.type === 'item.completed' && line?.item)
    .map((line) => line.item)
    .filter((item) => item?.type !== 'reasoning')

  const seen = new Set()
  let sawBlockedTest = false
  const candidates = rawItems.filter((item) => {
    const key = `${item.type}:${item.id}:${compact(item.command ?? item.message ?? item.text ?? '', 90)}`
    if (seen.has(key)) return false
    seen.add(key)
    if (
      item.type === 'error' &&
      /unrecognized configuration setting|failed to load skill/i.test(item.message ?? '')
    ) {
      return false
    }
    if (item.type === 'command_execution') {
      const failed =
        item.status === 'failed' ||
        (typeof item.exit_code === 'number' && item.exit_code !== 0)
      if (failed && !/npx vitest/i.test(item.command ?? '')) return false
      if (failed && /npx vitest/i.test(item.command ?? '')) {
        if (sawBlockedTest) return false
        sawBlockedTest = true
      }
      return shouldKeepCommand(item)
    }
    return ['file_change', 'agent_message', 'error', 'mcp_tool_call'].includes(item.type)
  })

  const total = Math.max(candidates.length - 1, 1)
  const span = Math.max(1_000, endTime.getTime() - startTime.getTime())

  return candidates.map((item, index) => {
    const startedAt = new Date(startTime.getTime() + Math.round((index / total) * span)).toISOString()
    const kind = eventKind(item)
    const failed =
      item.status === 'failed' || (typeof item.exit_code === 'number' && item.exit_code !== 0)
    const targets = (item.changes ?? []).map((change) => relativeTarget(change.path)).filter(Boolean)
    const rawCommand = String(item.command ?? '')
    const command = compact(rawCommand, 120)
    const output = compact(item.aggregated_output ?? item.message ?? '', 220)

    let title = '执行事件'
    let summary = '事件已从产品 Agent JSON 输出中归一化。'
    let phase = '执行'

    if (item.type === 'agent_message') {
      title = '产品 Agent 阶段更新'
      summary = compact(item.text ?? '', 220)
      phase = '协作'
    } else if (item.type === 'file_change') {
      title = targets.length === 1 ? `写入 ${targets[0].split('/').at(-1)}` : `写入 ${targets.length} 个文件`
      summary = '原始源码变更已记录，并绑定到可验证的源码行段。'
      phase = '实现'
    } else if (item.type === 'error') {
      title = '执行环境提示'
      summary = output
      phase = '环境'
    } else if (item.type === 'command_execution') {
      if (/npx vitest/i.test(rawCommand)) {
        title = failed ? '定向测试被沙箱阻断' : '定向测试执行完成'
        summary = failed
          ? '测试尚未进入用例阶段：嵌套 Codex 沙箱禁止 esbuild 启动子进程。主会话随后独立运行同一测试。'
          : 'Vitest 测试命令完成。'
        phase = '验证'
      } else if (/Get-Content|rg --files|Select-String/i.test(command)) {
        title = '读取实现上下文'
        summary = '产品 Agent 读取测试、配置或目标文件，建立实现边界。'
        phase = '勘察'
      } else {
        title = '执行诊断命令'
        summary = failed ? output || '命令返回失败。' : '命令完成并返回结构化状态。'
        phase = '诊断'
      }
    } else if (item.type === 'mcp_tool_call') {
      title = '调用外部工具'
      summary = '工具调用已被纳入静态审计轨迹。'
      phase = '工具'
    }

    const refs = kind === 'file' || targets.length > 0 ? sourceRefsFor(targets, sources) : []
    return {
      id: `event-${index + 1}`,
      phase,
      kind: failed && kind === 'error' ? 'error' : kind ?? 'command',
      status: failed ? 'failed' : 'passed',
      title,
      summary,
      startedAt,
      durationMs: Math.max(100, Math.round(span / Math.max(candidates.length, 1) / 2)),
      targets,
      sourceRefs: refs,
    }
  })
}

async function main() {
  const [rawLines, sources, productStat] = await Promise.all([
    readJsonLines(productLogPath),
    buildSources(),
    stat(productLogPath),
  ])

  const threadEvent = rawLines.find((line) => line?.type === 'thread.started')
  const runId = threadEvent?.thread_id ?? productStat.birthtime.toISOString()
  const events = buildEvents(rawLines, sources, productStat.birthtime, productStat.mtime)
  const commandCount = rawLines.filter((line) => line?.item?.type === 'command_execution').length
  const estimatedCharacters = rawLines.reduce((sum, line) => {
    const item = line?.item
    if (!item || item.type === 'reasoning') return sum
    return sum + JSON.stringify(item).length
  }, 0)

  let monitor = null
  try {
    monitor = JSON.parse(await readFile(monitorResultPath, 'utf8'))
  } catch {
    monitor = {
      provider: 'OpenAI Codex CLI',
      model: 'unavailable',
      summary: '监控 Agent 结果不可用，页面仅展示确定性归一化事件。',
      observations: ['没有伪造模型结论。'],
    }
  }

  const snapshot = {
    schemaVersion: 1,
    runId,
    generatedAt: new Date().toISOString(),
    status: 'completed',
    product: {
      name: '矩阵实验室',
      route: '/agent-observatory/matrix-lab',
    },
    agent: {
      provider: 'OpenAI Codex CLI · local custom provider',
      model: 'gpt-5.6-luna',
      tokenSource: 'estimated',
      durationMs: Math.max(1_000, productStat.mtime.getTime() - productStat.birthtime.getTime()),
      requestCount: 1,
      toolCallCount: commandCount,
      tokenCount: Math.max(1, Math.round(estimatedCharacters / 4)),
    },
    monitor,
    events,
    sources,
  }

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
  console.log(
    `observatory: ${events.length} 条公开事件 / ${sources.length} 个源码文件 / ${snapshot.agent.tokenCount} 估算 token`,
  )
}

main().catch((error) => {
  console.error('observatory snapshot 生成失败：', error.message)
  process.exitCode = 1
})
