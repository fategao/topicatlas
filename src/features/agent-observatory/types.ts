export type TraceEventKind = 'message' | 'command' | 'file' | 'tool' | 'test' | 'error'

export type TraceEventStatus = 'passed' | 'failed' | 'pending'

export type TraceFilter = 'all' | TraceEventKind

export type SourceRef = {
  file: string
  symbol: string
  startLine: number
  endLine: number
}

export type TraceEvent = {
  id: string
  phase: string
  kind: TraceEventKind
  status: TraceEventStatus
  title: string
  summary: string
  startedAt: string
  durationMs?: number
  targets: string[]
  sourceRefs: SourceRef[]
}

export type SourceFile = {
  path: string
  language: string
  sha256: string
  lines: string[]
}

export type AgentRunMeta = {
  provider: string
  model: string
  tokenSource: 'provider' | 'estimated'
  durationMs: number
  requestCount: number
  toolCallCount: number
  tokenCount: number
}

export type MonitorSummary = {
  provider: string
  model: string
  summary: string
  observations: string[]
}

export type ObservatorySnapshot = {
  schemaVersion: 1
  runId: string
  generatedAt: string
  status: 'completed' | 'failed'
  product: {
    name: string
    route: string
  }
  agent: AgentRunMeta
  monitor?: MonitorSummary
  events: TraceEvent[]
  sources: SourceFile[]
}

export type RawTraceEvent = {
  type?: string
  timestamp?: string
  item?: {
    id?: string
    type?: string
    command?: string
    aggregated_output?: string
    exit_code?: number | null
    status?: string
    message?: string
    changes?: Array<{ path?: string; kind?: string }>
    text?: string
  }
}
