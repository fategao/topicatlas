export const EVAL_LABELS = ['Hardware', 'Software', 'Other'] as const

export type EvalLabel = (typeof EVAL_LABELS)[number]
export type EvalCategory = 'typical' | 'edge'
export type PromptVersion = 'v1' | 'v2'

export type EvalCase = {
  id: string
  title: string
  ticket: string
  expectedLabel: EvalLabel
  category: EvalCategory
  note: string
}

export type EvalPrompt = {
  id: PromptVersion
  name: string
  summary: string
  system: string
  userTemplate: string
  changes: string[]
}

export type EvalSnapshotOutput = {
  caseId: string
  promptId: PromptVersion
  raw: string
  latencyMs: number
  inputTokens: number
  outputTokens: number
}

export type EvalSnapshot = {
  generatedAt: string
  provider: string
  endpoint: string
  model: string
  tokenSource: 'provider' | 'estimated'
  promptHashes: Record<PromptVersion, string>
  outputs: EvalSnapshotOutput[]
}

export const RUBRIC_CRITERIA = [
  {
    id: 'labelAccuracy',
    label: '标签正确率',
    description: '解析出的标签是否等于人工确认的标准答案。',
    defaultWeight: 4,
  },
  {
    id: 'formatCompliance',
    label: '格式合规',
    description: '是否严格返回只含 label 字段的 JSON。',
    defaultWeight: 3,
  },
  {
    id: 'edgeCaseHandling',
    label: '边界用例',
    description: '歧义、多语言与上下文混合的用例是否正确。',
    defaultWeight: 2,
  },
  {
    id: 'efficiency',
    label: '输出效率',
    description: '在保持可用性的前提下，输出 token 越少越好。',
    defaultWeight: 1,
  },
] as const

export type RubricCriterionId = (typeof RUBRIC_CRITERIA)[number]['id']
export type RubricWeights = Record<RubricCriterionId, number>

export type PromptCaseScore = {
  caseId: string
  promptId: PromptVersion
  raw: string
  label: EvalLabel | null
  expectedLabel: EvalLabel
  labelCorrect: boolean
  formatCompliant: boolean
  parseIssue: string | null
  latencyMs: number
  inputTokens: number
  outputTokens: number
  efficiency: number
  score: number
  passed: boolean
}

export type PromptRunScore = {
  promptId: PromptVersion
  cases: PromptCaseScore[]
  criteria: Record<RubricCriterionId, number>
  averageScore: number
  passRate: number
  passedCases: number
  averageLatencyMs: number
  totalOutputTokens: number
}

export type EvalComparison = {
  threshold: number
  weights: RubricWeights
  runs: Record<PromptVersion, PromptRunScore>
  winner: PromptVersion | 'tie'
}
