#!/usr/bin/env node
/**
 * 生成 Agent Observatory 的构建期快照（schemaVersion 2）。
 *
 * 输入：
 * - src/data/observatory/project-run.json：本项目之前的真实 Codex 运行快照。
 * - artifacts/cctrace-sample.html：cctrace 官方公开样例的真实抓包快照。
 *   可用 CCTRACE_SAMPLE 指定本地路径；CI 不运行本脚本，只校验已提交产物。
 *
 * 输出：
 * - src/data/observatory/snapshot.json
 *
 * 脚本只做确定性归一化、脱敏与截断，不生成任何模型结论。
 */
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const projectRunPath = path.join(root, 'src', 'data', 'observatory', 'project-run.json')
const samplePath = process.env.CCTRACE_SAMPLE || path.join(root, 'artifacts', 'cctrace-sample.html')
const agentsPath = path.join(root, 'AGENTS.md')
const experimentPath = path.join(root, 'scripts', 'observatory-experiment.mjs')
const outputPath = path.join(root, 'src', 'data', 'observatory', 'snapshot.json')

const REFERENCE_URLS = {
  repo: 'https://github.com/thevibeworks/cctrace',
  pages: 'https://thevibeworks.github.io/cctrace/',
  sample: 'https://thevibeworks.github.io/cctrace/demo/sample.html',
  types: 'https://github.com/thevibeworks/cctrace/blob/main/src/types.ts',
  session: 'https://github.com/thevibeworks/cctrace/blob/main/src/session.ts',
  replay: 'https://github.com/thevibeworks/cctrace/blob/main/src/replay.ts',
  traces: 'https://github.com/thevibeworks/cctrace/blob/main/docs/traces.md',
  webUi: 'https://github.com/thevibeworks/cctrace/blob/main/docs/web-ui.md',
  demoData: 'https://thevibeworks.github.io/cctrace/assets/demo-data.js',
  missing: 'https://thevibeworks.github.io/CRTrace',
}

const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{8,}\b/g,
  /\b(?:api[_-]?key|authorization)\s*[=:]\s*["']?[^\s"',;]+/gi,
  /\bdd-api-key["']?\s*[:=]\s*["']?[^\s"',;]+/gi,
  /\b[A-Z]:\\Users\\[^\\\s"'<>]+/gi,
  /\/home\/[a-z0-9._-]+/gi,
  /\/tmp\/claude-[^/\s"'<>]+/gi,
  /\b646a7535-[0-9a-f-]{20,}\b/gi,
]

function redact(value) {
  let text = String(value ?? '')
  for (const pattern of SECRET_PATTERNS) text = text.replace(pattern, '[REDACTED]')
  return text
}

function normalizePath(value) {
  return redact(
    String(value ?? '')
      .replaceAll('/home/deva/cctrace-demo', '/workspace')
      .replaceAll('/home/agent/cctrace-demo', '/workspace')
      .replaceAll('/home/deva', '/workspace')
      .replaceAll('/home/agent', '~')
      .replaceAll('/work/cctrace', '/workspace/cctrace')
      .replaceAll('/tmp/claude-501', '~/.claude/tmp')
      .replaceAll('-home-deva-cctrace-demo-cctrace', '-project')
      .replaceAll('-home-agent-cctrace-demo-cctrace', '-project'),
  )
}

function clean(value, limit = 260) {
  const text = normalizePath(value).replace(/\s+/g, ' ').trim()
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text
}

/** 去掉模型内部摘要块与计费头，页面只展示可审计的会话结果。 */
function stripInternal(text) {
  return String(text ?? '')
    .replace(/x-anthropic-billing-header:[^\n]*\n?/gi, '')
    .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '[内部推理摘要已省略]\n')
    .replace(/<\/?summary>/gi, '')
}

function blockText(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
}

function parsePairs(html) {
  const marker = 'window.__PAIRS__ = '
  const from = html.indexOf(marker)
  if (from < 0) throw new Error('样例 HTML 中找不到 window.__PAIRS__')
  const start = from + marker.length
  const end = html.indexOf('</script>', start)
  if (end < 0) throw new Error('样例 HTML 的 PAIRS 数据没有闭合')
  return JSON.parse(html.slice(start, end).trim().replace(/;\s*$/, ''))
}

function parseSseBlocks(raw) {
  const blocks = []
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith('data: ')) continue
    let data
    try {
      data = JSON.parse(line.slice(6))
    } catch {
      continue
    }
    if (data.type === 'content_block_start' && data.content_block) {
      blocks[data.index] = { ...data.content_block }
    } else if (data.type === 'content_block_delta' && data.delta) {
      const block = blocks[data.index] || (blocks[data.index] = {})
      if (data.delta.type === 'text_delta') block.text = (block.text || '') + data.delta.text
      else if (data.delta.type === 'thinking_delta') block.thinking = (block.thinking || '') + data.delta.thinking
      else if (data.delta.type === 'input_json_delta') block.partial_json = (block.partial_json || '') + (data.delta.partial_json || '')
    } else if (data.type === 'content_block_stop') {
      const block = blocks[data.index]
      if (block && block.partial_json) {
        try {
          block.input = JSON.parse(block.partial_json)
        } catch {
          // 原始流不完整时保留已到达的内容，不补造输入。
        }
      }
    }
  }
  return blocks.filter(Boolean)
}

function responseBlocks(pair) {
  const response = pair.response
  if (!response) return []
  if (response.body && Array.isArray(response.body.content)) return response.body.content
  if (typeof response.bodyRaw === 'string') return parseSseBlocks(response.bodyRaw)
  return []
}

function resultText(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (!block) return ''
        if (block.type === 'text') return block.text || ''
        if (block.type === 'image') return '[image]'
        return ''
      })
      .join('\n')
  }
  if (content != null) {
    try {
      return JSON.stringify(content)
    } catch {
      return ''
    }
  }
  return ''
}

function buildToolResultIndex(pairs) {
  const index = new Map()
  for (const pair of pairs) {
    const messages = pair.request?.body?.messages
    if (!Array.isArray(messages)) continue
    for (const message of messages) {
      if (!Array.isArray(message.content)) continue
      for (const block of message.content) {
        if (!block || block.type !== 'tool_result' || !block.tool_use_id) continue
        index.set(block.tool_use_id, {
          text: resultText(block.content),
          isError: Boolean(block.is_error),
        })
      }
    }
  }
  return index
}

function toolPreview(name, input) {
  const value = input || {}
  if (name === 'Bash') {
    return `$ ${clean(value.command || '', 150)}`
  }
  if (name === 'Read') {
    const target = normalizePath(value.file_path || value.path || value.file || '')
    const range = []
    if (typeof value.offset === 'number') range.push(`from line ${value.offset}`)
    if (typeof value.limit === 'number') range.push(`${value.limit} lines`)
    return `${target}${range.length ? ` · ${range.join(' · ')}` : ''}`
  }
  if (name === 'Edit') {
    return `${normalizePath(value.file_path || value.path || '')} · ${String(value.old_string || '').length} → ${String(value.new_string || '').length} chars`
  }
  if (name === 'Agent' || name === 'Task') {
    return `[${value.subagent_type || 'subagent'}] ${clean(value.description || '', 100)}`
  }
  for (const key of ['path', 'file_path', 'pattern', 'query', 'command', 'url', 'name']) {
    if (typeof value[key] === 'string' && value[key]) return clean(value[key], 140)
  }
  return ''
}

function toolInput(value) {
  if (value == null) return ''
  let text
  try {
    text = JSON.stringify(value, null, 2)
  } catch {
    text = String(value)
  }
  return normalizePath(text).slice(0, 900)
}

function buildToolCalls(pair, resultIndex) {
  return responseBlocks(pair)
    .filter((block) => block && (block.type === 'tool_use' || block.type === 'server_tool_use'))
    .map((block) => {
      const result = block.id ? resultIndex.get(block.id) : undefined
      return {
        id: block.id || `tool-${pair.id}-${block.name}`,
        name: block.name || 'tool',
        preview: toolPreview(block.name, block.input),
        input: toolInput(block.input),
        result: result ? clean(result.text, 420) : '',
        status: result ? (result.isError ? 'failed' : 'passed') : 'pending',
        timingSource: 'step',
      }
    })
}

function extractReminderBlocks(text) {
  const blocks = []
  const re = /<system-reminder>([\s\S]*?)<\/system-reminder>/g
  for (const match of text.matchAll(re)) blocks.push(match[1].trim())
  return blocks
}

function splitReminderText(text) {
  const re = /<system-reminder>[\s\S]*?<\/system-reminder>/g
  const injectLength = [...text.matchAll(re)].reduce((sum, match) => sum + match[0].length, 0)
  return { injectLength, rest: text.replace(re, '') }
}

const EXACT_COMPOSITIONS = {
  '1789446045890_n': { system: 3596, tools: 7723, user: 3640, inject: 12493, assistant: 0, toolResult: 0 },
  '1789446050306_o': { system: 3607, tools: 7723, user: 3640, inject: 12533, assistant: 38, toolResult: 117 },
  '1789446054882_p': { system: 3594, tools: 7723, user: 3981, inject: 12533, assistant: 203, toolResult: 117 },
  '1789446183615_x': { system: 3607, tools: 7723, user: 198, inject: 16512, assistant: 203, toolResult: 117 },
  '1789446199201_11': { system: 3594, tools: 7723, user: 539, inject: 16630, assistant: 656, toolResult: 891 },
  '1789446414001_25': { system: 3594, tools: 7723, user: 565, inject: 17948, assistant: 3081, toolResult: 4369 },
  '1789446414031_26': { system: 3594, tools: 7723, user: 1815, inject: 17948, assistant: 2749, toolResult: 4369 },
  '1789446514452_2y': { system: 8093, tools: 11675, user: 129, inject: 19419, assistant: 332, toolResult: 0 },
  '1789446528478_30': { system: 8081, tools: 11675, user: 470, inject: 20676, assistant: 932, toolResult: 551 },
}

function estimateComposition(pair) {
  const body = pair.request?.body || {}
  const chars = { system: 0, tools: 0, user: 0, inject: 0, assistant: 0, toolResult: 0 }
  const system = body.system
  if (typeof system === 'string') chars.system += system.length
  else if (Array.isArray(system)) chars.system += system.map((block) => (block?.text || '')).join('\n').length

  chars.tools += JSON.stringify(body.tools || []).length

  for (const message of body.messages || []) {
    if (typeof message.content === 'string') {
      const split = splitReminderText(message.content)
      chars.inject += split.injectLength
      if (message.role === 'assistant') chars.assistant += split.rest.length
      else chars.user += split.rest.length
      continue
    }
    if (!Array.isArray(message.content)) continue
    for (const block of message.content) {
      if (!block) continue
      if (block.type === 'text') {
        const split = splitReminderText(block.text || '')
        chars.inject += split.injectLength
        if (message.role === 'assistant') chars.assistant += split.rest.length
        else chars.user += split.rest.length
      } else if (block.type === 'tool_result') {
        chars.toolResult += resultText(block.content).length
      } else if (block.type === 'tool_use') {
        chars.assistant += JSON.stringify(block.input || {}).length
      }
    }
  }

  const sums = Object.fromEntries(Object.entries(chars).map(([key, value]) => [key, Math.round(value / 4)]))
  sums.total = Object.values(sums).reduce((sum, value) => sum + value, 0)
  return sums
}

function compositionFor(pair) {
  const exact = EXACT_COMPOSITIONS[pair.id]
  if (exact) {
    return {
      ...exact,
      total: exact.system + exact.tools + exact.user + exact.inject + exact.assistant + exact.toolResult,
      source: 'cctrace-demo-data',
    }
  }
  return { ...estimateComposition(pair), source: 'estimated-chars4' }
}

function tokenUsage(pair) {
  const usage = pair._ci || {}
  const input = usage.input || 0
  const output = usage.output || 0
  const cacheRead = usage.cacheRead || 0
  const cacheWrite = usage.cacheWrite || 0
  return {
    input,
    output,
    cacheRead,
    cacheWrite,
    thinking: usage.thinking || 0,
    cachePct: typeof usage.cachePct === 'number' ? usage.cachePct : null,
    source: 'provider',
    total: input + output + cacheRead + cacheWrite,
  }
}

const REFERENCE_LOOPS = [
  {
    id: 'q1-project',
    label: '问题一：项目做什么、谁决定解密范围',
    prompt:
      'In one sentence each: what does this project do, and which module decides which hosts the mitm proxy decrypts?',
    pairIds: ['1789446045890_n', '1789446050306_o'],
  },
  {
    id: 'q2-label',
    label: '问题二：客户端标签何时消失',
    prompt:
      'On the dashboard, a run row shows its client label only in some groupings (src/dashboard.ts, runIdentity). Read that code and explain exactly when the label goes missing and why.',
    pairIds: ['1789446183615_x', '1789446188673_y', '1789446191048_z'],
  },
  {
    id: 'q3-fix',
    label: '修复：最小改动补回可访问标签',
    prompt:
      'Fix it with the smallest change that keeps the existing grouped-label behavior, then show me the diff.',
    pairIds: [
      '1789446229454_14',
      '1789446257808_18',
      '1789446270097_1a',
      '1789446284038_1c',
      '1789446316500_1f',
      '1789446334063_1h',
      '1789446337165_1i',
      '1789446339701_1j',
      '1789446345635_1k',
      '1789446350359_1n',
      '1789446353937_1o',
      '1789446356533_1p',
      '1789446360356_1q',
      '1789446364222_1r',
      '1789446375348_1t',
      '1789446380655_1v',
      '1789446386868_1x',
      '1789446402830_20',
      '1789446514452_2y',
      '1789446518603_2z',
    ],
  },
]

const REFERENCE_SUBAGENT_LOOP = {
  id: 'subagent-review',
  parentLoopId: 'q3-fix',
  label: '子代理：复查 dashboard 标签改动',
  prompt:
    'Use a subagent to review that change for regressions in how the dashboard groups and labels runs.',
  pairIds: [
    '1789446402819_1z',
    '1789446405976_21',
    '1789446410471_23',
    '1789446414228_27',
    '1789446418672_29',
    '1789446420886_2a',
    '1789446423547_2b',
    '1789446428656_2c',
    '1789446435930_2f',
    '1789446442753_2h',
    '1789446445197_2i',
    '1789446447443_2j',
    '1789446451141_2l',
    '1789446458304_2m',
    '1789446461457_2n',
    '1789446464773_2p',
    '1789446467939_2r',
  ],
}

function withOrdinals(steps) {
  steps.forEach((step, index) => {
    step.ordinal = index + 1
  })
  return steps
}

function buildStep(pair, loopId, resultIndex, role) {
  const blocks = responseBlocks(pair)
  const text = blocks
    .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
  const tools = buildToolCalls(pair, resultIndex)
  const usage = tokenUsage(pair)
  const startedAt = new Date((pair.request?.timestamp || 0) * 1000).toISOString()
  const endedAt = pair.response?.timestamp
    ? new Date(pair.response.timestamp * 1000).toISOString()
    : startedAt
  const durationMs = Math.max(0, Math.round((pair.duration || 0) * 1))

  return {
    id: `step-${pair.id}`,
    pairId: pair.id,
    loopId,
    role,
    model: pair.request?.body?.model || pair._ci?.model || 'unknown',
    startedAt,
    endedAt,
    durationMs,
    status: pair._ci?.error ? 'failed' : 'passed',
    reply: text ? clean(text, 900) : '',
    toolCalls: tools,
    tokens: usage,
    composition: compositionFor(pair),
  }
}

function buildReferenceRun(pairs) {
  const resultIndex = buildToolResultIndex(pairs)
  const pairById = new Map(pairs.map((pair) => [pair.id, pair]))
  const loops = []

  for (const definition of REFERENCE_LOOPS) {
    const steps = withOrdinals(
      definition.pairIds
        .map((id) => pairById.get(id))
        .filter(Boolean)
        .map((pair) => buildStep(pair, definition.id, resultIndex, 'main')),
    )
    const first = steps[0]
    const last = steps.at(-1)
    loops.push({
      id: definition.id,
      label: definition.label,
      prompt: definition.prompt,
      kind: 'human',
      status: steps.some((step) => step.status === 'failed') ? 'failed' : 'passed',
      startedAt: first?.startedAt || '',
      endedAt: last?.endedAt || '',
      steps,
      contextEvents: [],
    })
  }

  const q3 = loops.find((loop) => loop.id === 'q3-fix')
  if (q3) {
    q3.contextEvents = [
      {
        id: 'addendum-subagent',
        kind: 'injection',
        label: '用户中途补充：要求子代理复查',
        detail:
          'Use a subagent to review that change for regressions in how the dashboard groups and labels runs.',
        startedAt: '2026-09-15T04:24:44.038Z',
        stepId: 'step-1789446284038_1c',
        source: 'system-reminder（用户 mid-turn 消息）',
      },
      {
        id: 'addendum-tests',
        kind: 'injection',
        label: '用户中途补充：只跑最窄测试',
        detail: 'Run the narrowest relevant tests for what you changed.',
        startedAt: '2026-09-15T04:25:34.063Z',
        stepId: 'step-1789446334063_1h',
        source: 'system-reminder（用户 mid-turn 消息）',
      },
      {
        id: 'compaction-main',
        kind: 'compaction',
        label: '上下文压缩：71 条消息 → 4 条',
        detail:
          '压缩请求先让模型输出会话摘要，随后请求只携带 4 条消息继续。统计来自两侧请求的 messages 数量。',
        startedAt: '2026-09-15T04:28:34.057Z',
        stepId: 'step-1789446514452_2y',
        source: 'wire history drop · pair 1789446414031_26 → 1789446514452_2y',
        fromTurns: 71,
        toTurns: 4,
      },
      {
        id: 'subagent-spawn',
        kind: 'subagent',
        label: 'Agent 工具派生子代理',
        detail:
          'Review a one-hunk diff in /workspace/cctrace/src/dashboard.ts. Check for regressions in grouping/labeling, and run the narrowest relevant tests.',
        startedAt: '2026-09-15T04:26:26.868Z',
        stepId: 'step-1789446386868_1x',
        source: 'Agent tool_use · pair 1789446386868_1x',
        targetLoopId: 'subagent-review',
      },
    ]
  }

  const subagentSteps = withOrdinals(
    REFERENCE_SUBAGENT_LOOP.pairIds
      .map((id) => pairById.get(id))
      .filter(Boolean)
      .map((pair) => buildStep(pair, REFERENCE_SUBAGENT_LOOP.id, resultIndex, 'subagent')),
  )
  const subagentFirst = subagentSteps[0]
  const subagentLast = subagentSteps.at(-1)
  loops.push({
    id: REFERENCE_SUBAGENT_LOOP.id,
    parentLoopId: REFERENCE_SUBAGENT_LOOP.parentLoopId,
    label: REFERENCE_SUBAGENT_LOOP.label,
    prompt: REFERENCE_SUBAGENT_LOOP.prompt,
    kind: 'subagent',
    status: 'passed',
    startedAt: subagentFirst?.startedAt || '',
    endedAt: subagentLast?.endedAt || '',
    steps: subagentSteps,
    contextEvents: [],
  })

  const messagePairs = pairs.filter((pair) => pair.request?.body?.messages)
  const loopToolIds = new Set()
  const toolNames = new Map()
  for (const loop of loops) {
    for (const step of loop.steps) {
      for (const tool of step.toolCalls) {
        loopToolIds.add(tool.id)
        toolNames.set(tool.name, (toolNames.get(tool.name) || 0) + 1)
      }
    }
  }
  const usageTotals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, thinking: 0 }
  for (const pair of messagePairs) {
    const usage = pair._ci || {}
    usageTotals.input += usage.input || 0
    usageTotals.output += usage.output || 0
    usageTotals.cacheRead += usage.cacheRead || 0
    usageTotals.cacheWrite += usage.cacheWrite || 0
    usageTotals.thinking += usage.thinking || 0
  }
  const firstTimestamp = Math.min(...messagePairs.map((pair) => pair.request.timestamp))
  const lastTimestamp = Math.max(
    ...messagePairs.map((pair) => pair.response?.timestamp || pair.request.timestamp),
  )
  const models = [...new Set(messagePairs.map((pair) => pair.request?.body?.model).filter(Boolean))]

  const context = buildReferenceContext(pairs, messagePairs, resultIndex, subagentSteps)
  const stepsCount = loops.reduce((sum, loop) => sum + loop.steps.length, 0)

  return {
    id: 'cctrace-reference',
    label: 'cctrace 公开样例：补回 dashboard 客户端标签',
    shortLabel: 'cctrace 真实样例',
    subtitle:
      'Claude Code 真实会话，由 cctrace 在 TLS 层抓取。这里只回放与标签修复相关的三个工作循环和子代理分支。',
    status: 'completed',
    provider: 'Anthropic Claude Code · cctrace capture',
    model: 'claude-sonnet-5',
    modelIds: models,
    sourceKind: 'cctrace-public-sample',
    capturedAt: new Date(firstTimestamp * 1000).toISOString(),
    timeScale: 'recorded',
    tokenSource: 'provider',
    product: null,
    metrics: {
      durationMs: Math.round((lastTimestamp - firstTimestamp) * 1000),
      requestCount: messagePairs.length,
      wirePairCount: pairs.length,
      stepCount: stepsCount,
      loopCount: loops.length - 1,
      subagentCount: 1,
      toolCallCount: loopToolIds.size,
      sampledToolCallCount: loopToolIds.size,
      toolNames: [...toolNames.entries()].map(([name, count]) => ({ name, count })),
      token: {
        ...usageTotals,
        total: usageTotals.input + usageTotals.output + usageTotals.cacheRead + usageTotals.cacheWrite,
        source: 'provider',
      },
    },
    loops,
    context,
    sources: [],
    monitor: null,
    notes: [
      '数据来自 cctrace 官方公开样例 sample.html：真实 Claude Code 会话，按参考项目文档在沙箱中采集并脱敏。',
      '页面只保留 3 个相关工作循环与 1 个子代理分支；title / quota / suggestion 等 harness 请求从回放中省略。',
      'token 是 provider 在响应中返回的 usage；上下文六分类中 9 个 step 来自 cctrace demo-data.js，其余为 chars/4 估算并标注 ≈。',
      '工具调用没有独立的 wire 耗时；工具详情中的时间范围继承所在 step，页面不会为单个调用编造耗时。',
      '模型内部推理未写入快照，页面不展示思考内容。',
    ],
  }
}

function buildReferenceContext(pairs, messagePairs, resultIndex, subagentSteps) {
  const anchor = pairs.find((pair) => pair.id === '1789446045890_n')
  const firstMessage = anchor?.request?.body?.messages?.[0]
  const firstText = blockText(firstMessage?.content)
  const system = anchor?.request?.body?.system
  const systemText = stripInternal(
    Array.isArray(system)
      ? system
          .filter((block) => !String(block?.text || '').startsWith('x-anthropic-billing-header'))
          .map((block) => block?.text || '')
          .join('\n')
      : typeof system === 'string'
        ? system
        : '',
  )
  const environment = messagePairs
    .flatMap((pair) => pair.request.body.messages || [])
    .find((message) => message.role === 'system' && blockText(message.content).includes('# Environment'))
  const environmentText = blockText(environment?.content)
  const tools = anchor?.request?.body?.tools || []
  const toolNames = tools.map((tool) => tool.name).filter(Boolean)

  const sections = [...firstText.matchAll(/Contents of ([^:]+):\n([\s\S]*?)(?=\nContents of |\n<\/system-reminder>|$)/g)]
  const memory = []
  const seenMemory = new Set()
  for (const match of sections) {
    const body = match[2]
    const key = body.replace(/\s+/g, ' ').slice(0, 180)
    if (seenMemory.has(key)) continue
    seenMemory.add(key)
    memory.push({
      id: `memory-${memory.length + 1}`,
      kind: 'memory',
      label:
        memory.length === 0
          ? 'CLAUDE.md · 用户级与项目副本'
          : memory.length === 1
            ? '项目 CLAUDE.md'
            : '项目附加记忆',
      path: normalizePath(match[1]).replace(/ \(.*?\)$/, ''),
      excerpt: clean(body, 320),
      chars: body.length,
      tokens: Math.round(body.length / 4),
      source: 'wire request · pair 1789446045890_n',
      note: '真实进入请求的长期指令；页面只保留片段。',
    })
    if (memory.length >= 3) break
  }

  const reminders = []
  for (const pair of messagePairs.slice(0, 12)) {
    const messages = pair.request.body.messages || []
    for (const message of messages) {
      const text = blockText(message.content)
      for (const reminder of extractReminderBlocks(text)) {
        const firstLine = clean(reminder.split('\n').find((line) => line.trim()) || '', 110)
        if (!firstLine) continue
        const key = firstLine.slice(0, 80)
        if (reminders.some((item) => item.key === key)) continue
        reminders.push({
          key,
          label: firstLine,
          chars: reminder.length,
          pairId: pair.id,
        })
      }
    }
  }

  const summaryPair = pairs.find((pair) => pair.id === '1789446414031_26')
  const summaryText = stripInternal(
    responseBlocks(summaryPair)
      .filter((block) => block?.type === 'text')
      .map((block) => block.text)
      .join('\n'),
  )

  const context = [
    ...memory,
    {
      id: 'system-prompt',
      kind: 'system',
      label: 'Claude Code 系统提示词',
      excerpt: clean(systemText.slice(0, 360), 360),
      chars: systemText.length,
      tokens: Math.round(systemText.length / 4),
      source: 'wire request · pair 1789446045890_n',
      note: '系统提示词按字符数估算 token；provider 实际 prompt 计数见 step 指标。',
    },
    {
      id: 'environment',
      kind: 'environment',
      label: '环境上下文',
      excerpt: clean(environmentText, 360),
      chars: environmentText.length,
      tokens: Math.round(environmentText.length / 4),
      source: 'wire request · role=system',
      note: '工作目录、平台、Shell、模型等环境信息由 harness 注入。',
    },
    {
      id: 'tool-schemas',
      kind: 'tools',
      label: '工具 schema',
      excerpt: `${tools.length} 个工具：${toolNames.join('、')}`,
      chars: JSON.stringify(tools).length,
      tokens: Math.round(JSON.stringify(tools).length / 4),
      source: 'wire request · pair 1789446045890_n',
      note: '工具声明原文进入每次请求；token 为 chars/4 估算。',
    },
    {
      id: 'injection-index',
      kind: 'injection',
      label: '注入提醒索引',
      excerpt: reminders.slice(0, 4).map((item) => item.label).join('；'),
      chars: reminders.reduce((sum, item) => sum + item.chars, 0),
      tokens: Math.round(reminders.reduce((sum, item) => sum + item.chars, 0) / 4),
      source: 'wire request · system-reminder 去重',
      note: `在快照前 12 个请求中识别到 ${reminders.length} 类注入提醒；示例按首次出现排序。`,
    },
    {
      id: 'compaction',
      kind: 'compaction',
      label: '压缩摘要',
      excerpt: clean(summaryText, 360),
      chars: summaryText.length,
      tokens: Math.round(summaryText.length / 4),
      source: 'wire response · pair 1789446414031_26',
      note: '压缩请求要求模型只输出会话摘要；随后请求历史降到 4 条消息。',
    },
    {
      id: 'subagent-branch',
      kind: 'subagent',
      label: '子代理分支',
      excerpt: clean(subagentSteps.at(-1)?.reply || '', 360),
      chars: subagentSteps.reduce((sum, step) => sum + (step.reply?.length || 0), 0),
      tokens: null,
      source: 'wire requests · x-claude-code-agent-id=aaf038e35825167d5',
      note: `子代理共 ${subagentSteps.length} 个真实 step；最终报告来自子代理自己的响应。`,
    },
  ]

  return context
}

function groupProjectLoops(legacy) {
  const events = legacy.events || []
  const groups = [
    { id: 'p1-spec', label: '规格与勘察', upTo: 7 },
    { id: 'p2-build', label: '实现三个限定文件', upTo: 11 },
    { id: 'p3-verify', label: '验证与收敛', upTo: events.length },
  ]
  const loops = []
  let start = 0
  for (const group of groups) {
    const chunk = events.slice(start, group.upTo)
    start = group.upTo
    if (chunk.length === 0) continue
    const first = chunk[0]
    const last = chunk.at(-1)
    const steps = chunk.map((event, index) => ({
      id: `pstep-${event.id}`,
      eventId: event.id,
      loopId: group.id,
      ordinal: index + 1,
      role: 'main',
      model: legacy.agent.model,
      startedAt: event.startedAt,
      endedAt: new Date(Date.parse(event.startedAt) + (event.durationMs || 0)).toISOString(),
      durationMs: event.durationMs || 0,
      status: event.status,
      reply: event.kind === 'message' ? event.summary : '',
      kind: event.kind,
      title: event.title,
      summary: event.summary,
      targets: event.targets,
      sourceRefs: event.sourceRefs,
      toolCalls:
        event.kind === 'command' || event.kind === 'test' || event.kind === 'file'
          ? [
              {
                id: `ptool-${event.id}`,
                name:
                  event.kind === 'test'
                    ? 'vitest'
                    : event.kind === 'file'
                      ? 'apply_patch'
                      : 'shell',
                preview: event.title,
                input: event.summary,
                result: event.summary,
                status: event.status,
                timingSource: 'step',
              },
            ]
          : [],
      tokens: null,
      composition: null,
    }))
    loops.push({
      id: group.id,
      label: group.label,
      prompt: first.summary,
      kind: 'human',
      status: chunk.some((event) => event.status === 'failed') ? 'failed' : 'passed',
      startedAt: first.startedAt,
      endedAt: last.startedAt,
      steps,
      contextEvents:
        group.id === 'p1-spec'
          ? [
              {
                id: 'project-blocked-test',
                kind: 'failure',
                label: '嵌套沙箱阻断 Vitest',
                detail: 'Vitest 在嵌套 Codex 沙箱中因 esbuild 子进程 EPERM 未能启动；失败被保留。',
                startedAt: '2026-10-27T07:03:11.470Z',
                stepId: 'pstep-event-5',
                source: 'Codex JSONL · item.completed error',
              },
            ]
          : group.id === 'p3-verify'
            ? [
                {
                  id: 'project-independent-tests',
                  kind: 'injection',
                  label: '主会话独立验证 9/9',
                  detail: '主会话在沙箱外运行同一组 unit + component 测试，9/9 通过。',
                  startedAt: '2026-10-27T07:07:19.544Z',
                  stepId: 'pstep-event-17',
                  source: 'docs/agent-observatory-log.md',
                },
              ]
            : [],
    })
  }
  return loops
}

async function buildProjectRun(legacy) {
  const agentsText = await readFile(agentsPath, 'utf8')
  const experimentText = await readFile(experimentPath, 'utf8')
  const promptMatch = experimentText.match(/const PRODUCT_PROMPT = `([\s\S]*?)`\n/)
  const promptText = promptMatch?.[1] || ''
  const loops = groupProjectLoops(legacy)
  return {
    id: 'matrix-build',
    label: '本项目 run：矩阵实验室构建',
    shortLabel: '矩阵构建 run',
    subtitle:
      '产品 Agent 按冻结测试实现矩阵学习页；公开快照保留 17 条归一化事件，源码行段在构建期重新做哈希。',
    status: legacy.status,
    provider: legacy.agent.provider,
    model: legacy.agent.model,
    modelIds: [legacy.agent.model],
    sourceKind: 'codex-jsonl',
    capturedAt: legacy.generatedAt,
    timeScale: 'normalized',
    tokenSource: legacy.agent.tokenSource,
    product: legacy.product,
    metrics: {
      durationMs: legacy.agent.durationMs,
      requestCount: legacy.agent.requestCount,
      wirePairCount: null,
      stepCount: loops.reduce((sum, loop) => sum + loop.steps.length, 0),
      loopCount: loops.length,
      subagentCount: 0,
      toolCallCount: legacy.agent.toolCallCount,
      sampledToolCallCount: loops.reduce(
        (sum, loop) => sum + loop.steps.reduce((count, step) => count + step.toolCalls.length, 0),
        0,
      ),
      toolNames: [...loops]
        .flatMap((loop) => loop.steps)
        .flatMap((step) => step.toolCalls)
        .reduce((counts, tool) => {
          const existing = counts.find((item) => item.name === tool.name)
          if (existing) existing.count += 1
          else counts.push({ name: tool.name, count: 1 })
          return counts
        }, []),
      token: {
        input: null,
        output: null,
        cacheRead: null,
        cacheWrite: null,
        thinking: null,
        total: legacy.agent.tokenCount,
        source: legacy.agent.tokenSource,
      },
    },
    loops,
    context: [
      {
        id: 'agents-md',
        kind: 'memory',
        label: '项目规则 AGENTS.md',
        path: 'AGENTS.md',
        excerpt: clean(agentsText, 320),
        chars: agentsText.length,
        tokens: Math.round(agentsText.length / 4),
        source: 'repo file · build-time hash',
        note: '这是仓库中的项目规则；旧快照没有保留模型消息，不能证明它如何进入上下文，只能证明文件与任务规格存在。',
      },
      {
        id: 'product-prompt',
        kind: 'system',
        label: '产品 Agent 任务规格',
        path: 'scripts/observatory-experiment.mjs',
        excerpt: clean(promptText, 340),
        chars: promptText.length,
        tokens: Math.round(promptText.length / 4),
        source: 'experiment script · fixed prompt',
        note: '任务规格原文来自构建前使用的实验脚本；它约束可改文件与验证命令。',
      },
      {
        id: 'token-scope',
        kind: 'note',
        label: 'Token 口径',
        excerpt: `公开快照 token=${legacy.agent.tokenCount.toLocaleString('en-US')}，按事件字符数估算；provider 未返回完整 usage。`,
        chars: 0,
        tokens: null,
        source: 'docs/agent-observatory-log.md',
        note: '估算只用于规模参考，不替代 provider 计费数据。',
      },
    ],
    sources: legacy.sources || [],
    monitor: legacy.monitor || null,
    notes: [
      '事件来自真实 Codex JSONL；发布快照为了静态回放把时间戳等间隔归一化，不应当作逐事件的真实墙钟。',
      '原始日志 80 次工具调用；公开快照只保留 5 条命令/测试事件与 4 次文件变更，避免把长日志和本机路径带上线。',
      'token 为 chars/4 估算，tokenSource=estimated；页面明确显示「估算」。',
      '源码文件在构建期计算 SHA-256；content:validate 在 CI 重新核对。',
    ],
  }
}

async function main() {
  const [legacy, sampleHtml, agentsText] = await Promise.all([
    readFile(projectRunPath, 'utf8').then(JSON.parse),
    readFile(samplePath, 'utf8'),
    readFile(agentsPath, 'utf8'),
  ])
  const pairs = parsePairs(sampleHtml)
  const referenceRun = buildReferenceRun(pairs)
  const projectRun = await buildProjectRun(legacy)

  const snapshot = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    disclaimer:
      '这是构建前生成的静态回放。浏览器不请求模型、不保存或发送 API Key；两条 run 分开标注数据来源、时间口径与 token 口径。',
    reference: {
      name: 'cctrace',
      repoUrl: REFERENCE_URLS.repo,
      pagesUrl: REFERENCE_URLS.pages,
      sampleUrl: REFERENCE_URLS.sample,
      license: 'MIT',
      capturedAt: '2026-09-15',
      note: 'cctrace 通过本地 TLS 拦截代理记录 Claude Code / Codex 等 CLI 的请求/响应；官方样例由项目在沙箱中采集并脱敏。',
      links: [
        { label: 'src/types.ts · TracePair / RequestData / ResponseData', url: REFERENCE_URLS.types },
        { label: 'src/session.ts · loops / turns / steps', url: REFERENCE_URLS.session },
        { label: 'src/replay.ts · beat / chapters', url: REFERENCE_URLS.replay },
        { label: 'docs/traces.md · store 与 .jsonl.zst', url: REFERENCE_URLS.traces },
        { label: 'docs/web-ui.md · sessions / context / replay', url: REFERENCE_URLS.webUi },
        { label: 'demo-data.js · 9 个 step 的上下文分类', url: REFERENCE_URLS.demoData },
      ],
      probes: [
        {
          url: REFERENCE_URLS.missing,
          label: '黑板给出的 CRTrace 地址',
          status: 404,
          checkedAt: '2026-11-03',
          note: 'GitHub Pages 与 api.github.com/repos/thevibeworks/CRTrace 均返回 404；实际可访问的项目是 thevibeworks/cctrace。',
        },
        {
          url: REFERENCE_URLS.repo,
          label: 'thevibeworks/cctrace',
          status: 200,
          checkedAt: '2026-11-03',
          note: 'README 将 homepage 指向 thevibeworks.github.io/cctrace，并提供 demo/sample.html 真实会话。',
        },
      ],
    },
    runs: [projectRun, referenceRun],
    sourceHash: {
      agentsMd: createHash('sha256').update(agentsText).digest('hex'),
      cctraceSample: createHash('sha256').update(sampleHtml).digest('hex'),
    },
  }

  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
  console.log(
    `observatory: v2 snapshot · ${snapshot.runs.length} runs · reference ${referenceRun.metrics.stepCount} steps / ${referenceRun.metrics.toolCallCount} tool ids · sample ${snapshot.sourceHash.cctraceSample.slice(0, 12)}`,
  )
}

main().catch((error) => {
  console.error('observatory snapshot 生成失败：', error.message)
  process.exitCode = 1
})
