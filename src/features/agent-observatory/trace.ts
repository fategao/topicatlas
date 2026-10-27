import type {
  RawTraceEvent,
  TraceEvent,
  TraceEventStatus,
  TraceFilter,
} from './types'

const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{8,}\b/g,
  /\b(?:api[_-]?key|token|authorization)\s*[=:]\s*["']?[^\s"',;]+/gi,
  /\b[A-Z]:\\Users\\[^\\\s"'<>]+/gi,
]

function truncate(value: string, length = 180): string {
  const compact = value.replace(/\s+/g, ' ').trim()
  return compact.length > length ? `${compact.slice(0, length - 1)}…` : compact
}

export function redactTraceText(value: string): string {
  return SECRET_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, '[REDACTED]'),
    value,
  )
}

function statusOf(item: NonNullable<RawTraceEvent['item']>): TraceEventStatus {
  if (item.status === 'failed' || (typeof item.exit_code === 'number' && item.exit_code !== 0)) {
    return 'failed'
  }
  if (item.exit_code === 0 || item.status === 'completed') return 'passed'
  return 'pending'
}

function eventFromItem(
  item: NonNullable<RawTraceEvent['item']>,
  timestamp: string,
  index: number,
): TraceEvent | null {
  const id = item.id || `event-${index + 1}`
  const startedAt = timestamp

  switch (item.type) {
    case 'command_execution': {
      const command = redactTraceText(item.command || '未记录命令')
      return {
        id,
        phase: '执行',
        kind: 'command',
        status: statusOf(item),
        title: truncate(command, 90),
        summary:
          statusOf(item) === 'failed'
            ? '命令执行失败，失败结果被保留用于回溯。'
            : '命令完成并通过结构化事件流记录。',
        startedAt,
        targets: [],
        sourceRefs: [],
      }
    }
    case 'file_change': {
      const targets = (item.changes ?? [])
        .map((change) => change.path)
        .filter((path): path is string => Boolean(path))
        .map(redactTraceText)
      return {
        id,
        phase: '实现',
        kind: 'file',
        status: statusOf(item),
        title: targets.length === 1 ? `修改 ${targets[0]}` : `修改 ${targets.length} 个文件`,
        summary: '源代码变更已被记录，并可通过源码检查器定位。',
        startedAt,
        targets,
        sourceRefs: [],
      }
    }
    case 'agent_message':
      return {
        id,
        phase: '协作',
        kind: 'message',
        status: 'passed',
        title: '产品 Agent 更新',
        summary: truncate(redactTraceText(item.text || 'Agent 完成了一次阶段更新。')),
        startedAt,
        targets: [],
        sourceRefs: [],
      }
    case 'error':
      return {
        id,
        phase: '环境',
        kind: 'error',
        status: 'failed',
        title: '执行环境返回错误',
        summary: truncate(redactTraceText(item.message || '未提供错误详情。')),
        startedAt,
        targets: [],
        sourceRefs: [],
      }
    case 'mcp_tool_call':
    case 'tool_call':
      return {
        id,
        phase: '工具',
        kind: 'tool',
        status: statusOf(item),
        title: '调用执行工具',
        summary: '工具调用已归一化为可审计事件。',
        startedAt,
        targets: [],
        sourceRefs: [],
      }
    case 'reasoning':
      return null
    default:
      return null
  }
}

export function normalizeTraceEvents(events: RawTraceEvent[]): TraceEvent[] {
  return events.flatMap((event, index) => {
    if (!event.item) return []
    const normalized = eventFromItem(
      event.item,
      event.timestamp || new Date(Date.UTC(2026, 9, 27, 0, 0, index)).toISOString(),
      index,
    )
    return normalized ? [normalized] : []
  })
}

export function eventMatchesFilter(event: TraceEvent, filter: TraceFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'error') return event.status === 'failed' || event.kind === 'error'
  return event.kind === filter
}
