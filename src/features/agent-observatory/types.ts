export type RunStatus = 'completed' | 'failed'
export type StepStatus = 'passed' | 'failed' | 'pending'
export type TimeScale = 'recorded' | 'normalized'
export type SourceKind = 'codex-jsonl' | 'cctrace-public-sample'
export type TokenSource = 'provider' | 'estimated'
export type StepRole = 'main' | 'subagent'
export type LoopKind = 'human' | 'subagent'
export type ToolStatus = 'passed' | 'failed' | 'pending'
export type ContextEventKind = 'injection' | 'compaction' | 'failure' | 'subagent'
export type CompositionSource = 'cctrace-demo-data' | 'estimated-chars4'
export type ContextSourceKind =
  | 'memory'
  | 'system'
  | 'environment'
  | 'tools'
  | 'injection'
  | 'compaction'
  | 'subagent'
  | 'note'

export type SourceRef = {
  file: string
  symbol: string
  startLine: number
  endLine: number
}

export type SourceFile = {
  path: string
  language: string
  sha256: string
  lines: string[]
}

export type Composition = {
  system: number
  tools: number
  user: number
  inject: number
  assistant: number
  toolResult: number
  total: number
  source: CompositionSource
}

export type TokenUsage = {
  input: number | null
  output: number | null
  cacheRead: number | null
  cacheWrite: number | null
  thinking: number | null
  cachePct?: number | null
  source: TokenSource
  total: number | null
}

export type ToolCall = {
  id: string
  name: string
  preview: string
  input: string
  result: string
  status: ToolStatus
  timingSource: 'step'
}

export type TraceStep = {
  id: string
  pairId?: string
  eventId?: string
  loopId: string
  ordinal?: number
  role: StepRole
  model: string
  startedAt: string
  endedAt: string
  durationMs: number
  status: StepStatus
  reply: string
  toolCalls: ToolCall[]
  tokens: TokenUsage | null
  composition: Composition | null
  kind?: string
  title?: string
  summary?: string
  targets?: string[]
  sourceRefs?: SourceRef[]
}

export type ContextEvent = {
  id: string
  kind: ContextEventKind
  label: string
  detail: string
  startedAt: string
  stepId?: string
  source: string
  fromTurns?: number
  toTurns?: number
  targetLoopId?: string
}

export type TraceLoop = {
  id: string
  parentLoopId?: string
  label: string
  prompt: string
  kind: LoopKind
  status: StepStatus
  startedAt: string
  endedAt: string
  steps: TraceStep[]
  contextEvents: ContextEvent[]
}

export type ContextSource = {
  id: string
  kind: ContextSourceKind
  label: string
  path?: string
  excerpt: string
  chars: number
  tokens: number | null
  source: string
  note: string
}

export type RunMetrics = {
  durationMs: number
  requestCount: number
  wirePairCount: number | null
  stepCount: number
  loopCount: number
  subagentCount: number
  toolCallCount: number
  sampledToolCallCount: number
  toolNames: Array<{ name: string; count: number }>
  token: TokenUsage
}

export type Product = {
  name: string
  route: string
}

export type MonitorSummary = {
  provider: string
  model: string
  summary: string
  observations: string[]
}

export type AgentRun = {
  id: string
  label: string
  shortLabel: string
  subtitle: string
  status: RunStatus
  provider: string
  model: string
  modelIds: string[]
  sourceKind: SourceKind
  capturedAt: string
  timeScale: TimeScale
  tokenSource: TokenSource
  product: Product | null
  metrics: RunMetrics
  loops: TraceLoop[]
  context: ContextSource[]
  sources: SourceFile[]
  monitor: MonitorSummary | null
  notes: string[]
}

export type ReferenceLink = {
  label: string
  url: string
}

export type ReferenceProbe = {
  url: string
  label: string
  status: number
  checkedAt: string
  note: string
}

export type ReferenceInfo = {
  name: string
  repoUrl: string
  pagesUrl: string
  sampleUrl: string
  license: string
  capturedAt: string
  note: string
  links: ReferenceLink[]
  probes: ReferenceProbe[]
}

export type ObservatorySnapshot = {
  schemaVersion: 2
  generatedAt: string
  disclaimer: string
  reference: ReferenceInfo
  runs: AgentRun[]
  sourceHash: {
    agentsMd: string
    cctraceSample: string
  }
}

export type FlatStep = {
  runId: string
  loop: TraceLoop
  step: TraceStep
  index: number
}
