import type {
  AgentRun,
  Composition,
  FlatStep,
  TokenUsage,
  ToolCall,
  TraceLoop,
  TraceStep,
} from './types'

const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{8,}\b/g,
  /\b(?:api[_-]?key|token|authorization)\s*[=:]\s*["']?[^\s"',;]+/gi,
  /\b[A-Z]:\\Users\\[^\\\s"'<>]+/gi,
]

export function redactTraceText(value: string): string {
  return SECRET_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, '[REDACTED]'),
    value,
  )
}

export function formatDuration(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '未记录'
  if (value < 1_000) return `${Math.round(value)} ms`
  if (value < 60_000) return `${(value / 1_000).toFixed(1)} s`
  const minutes = Math.floor(value / 60_000)
  const seconds = Math.round((value % 60_000) / 1_000)
  return `${minutes}m ${seconds}s`
}

export function formatClock(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--:--'
  return date.toISOString().slice(11, 19)
}

export function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未记录'
  return date.toLocaleString('zh-CN', { hour12: false })
}

export function formatCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return value.toLocaleString('zh-CN')
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${Math.round(value)}%`
}

export function tokenTotal(tokens: TokenUsage | null | undefined): number | null {
  if (!tokens) return null
  if (tokens.total != null) return tokens.total
  const values = [tokens.input, tokens.output, tokens.cacheRead, tokens.cacheWrite]
  if (values.every((value) => value == null)) return null
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0)
}

export function buildFlatSteps(run: AgentRun): FlatStep[] {
  return run.loops
    .flatMap((loop) =>
      loop.steps.map((step) => ({
        runId: run.id,
        loop,
        step,
      })),
    )
    .sort((left, right) => {
      const byTime = Date.parse(left.step.startedAt) - Date.parse(right.step.startedAt)
      if (byTime !== 0) return byTime
      return left.loop.id.localeCompare(right.loop.id)
    })
    .map((item, index) => ({ ...item, index }))
}

export function loopDuration(loop: TraceLoop): number {
  const start = Date.parse(loop.startedAt)
  const end = Date.parse(loop.endedAt)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0
  return end - start
}

export function stepToolCount(step: TraceStep): number {
  return step.toolCalls.length
}

export function stepFailed(step: TraceStep): boolean {
  return (
    step.status === 'failed' ||
    step.toolCalls.some((tool) => tool.status === 'failed')
  )
}

export function toolFailed(tool: ToolCall): boolean {
  return tool.status === 'failed'
}

export const COMPOSITION_SEGMENTS: ReadonlyArray<{
  key: keyof Pick<Composition, 'system' | 'tools' | 'user' | 'inject' | 'assistant' | 'toolResult'>
  label: string
  color: string
}> = [
  { key: 'system', label: '系统提示', color: 'is-system' },
  { key: 'tools', label: '工具 schema', color: 'is-tools' },
  { key: 'user', label: '用户消息', color: 'is-user' },
  { key: 'inject', label: '注入上下文', color: 'is-inject' },
  { key: 'assistant', label: '助手回复', color: 'is-assistant' },
  { key: 'toolResult', label: '工具结果', color: 'is-tool-result' },
]

export function compositionMax(composition: Composition): number {
  return Math.max(
    composition.system,
    composition.tools,
    composition.user,
    composition.inject,
    composition.assistant,
    composition.toolResult,
    1,
  )
}
