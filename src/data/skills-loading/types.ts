export type Observability = 'observed' | 'computed' | 'documented'

export type LoadLevel =
  | 'context'
  | 'metadata'
  | 'instructions'
  | 'reference'
  | 'script'
  | 'output'

export type TraceEventKind =
  | 'turn'
  | 'metadata'
  | 'selection'
  | 'read'
  | 'execute'
  | 'message'
  | 'usage'

export type TraceStatus = 'passed' | 'failed' | 'info'

export type SkillTraceEvent = {
  id: string
  ordinal: number
  kind: TraceEventKind
  level: LoadLevel
  observability: Observability
  title: string
  summary: string
  command?: string
  outputExcerpt?: string
  file?: string
  status: TraceStatus
  contextCharsAdded: number
  contextTokensAdded: number
  tokenLabel: 'provider' | 'estimated'
}

export type SkillFileKind = 'instructions' | 'reference' | 'script' | 'example'

export type SkillFile = {
  path: string
  kind: SkillFileKind
  bytes: number
  chars: number
  sha256: string
  excerpt: string
}

export type ProviderUsage = {
  inputTokens: number
  cachedInputTokens: number
  cacheWriteInputTokens: number
  outputTokens: number
  reasoningOutputTokens: number
  source: 'provider'
}

export type IndexBudget = {
  scannedSkillFiles: number
  metadataChars: number
  estimatedTokens: number
  defaultContextRatio: number
  rule: string
  scope: string[]
}

export type SkillSource = {
  label: string
  url: string
  usedFor: string
  retrievedAt: string
}

export type SkillsLoadingSnapshot = {
  schemaVersion: 1
  generatedAt: string
  title: string
  label: string
  provider: string
  model: string
  reasoningEffort: string
  environment: {
    os: string
    node: string
    codex: string
    sandbox: string
    captureMode: string
  }
  prompt: {
    text: string
    sha256: string
  }
  finalOutput: string
  skill: {
    name: string
    path: string
    description: string
    files: SkillFile[]
  }
  index: IndexBudget
  usage: ProviderUsage
  events: SkillTraceEvent[]
  sources: SkillSource[]
  notes: string[]
}
