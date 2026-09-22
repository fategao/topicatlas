import { EVAL_LABELS, type EvalCase, type EvalComparison, type EvalLabel, type EvalSnapshotOutput, type PromptVersion, type RubricCriterionId, type RubricWeights } from './types'

export const DEFAULT_RUBRIC_WEIGHTS: RubricWeights = {
  labelAccuracy: 4,
  formatCompliance: 3,
  edgeCaseHandling: 2,
  efficiency: 1,
}

const PROMPT_VERSIONS: PromptVersion[] = ['v1', 'v2']

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value))
}

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim()
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return match?.[1]?.trim() ?? trimmed
}

function normalizeLabel(value: string): EvalLabel | null {
  const normalized = value
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[.,;:!?。！？]+$/g, '')
    .trim()
    .toLowerCase()

  return EVAL_LABELS.find((label) => label.toLowerCase() === normalized) ?? null
}

export type ParsedClassification = {
  label: EvalLabel | null
  formatCompliant: boolean
  parseIssue: string | null
}

export function parseClassification(raw: string): ParsedClassification {
  if (!raw.trim()) {
    return { label: null, formatCompliant: false, parseIssue: '空输出' }
  }

  const unwrapped = stripCodeFence(raw)
  try {
    const parsed: unknown = JSON.parse(unwrapped)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { label: null, formatCompliant: false, parseIssue: 'JSON 顶层不是对象' }
    }

    const record = parsed as Record<string, unknown>
    const keys = Object.keys(record)
    const label = typeof record.label === 'string' ? normalizeLabel(record.label) : null
    if (!label) {
      return { label: null, formatCompliant: false, parseIssue: '标签不在允许集合内' }
    }
    if (keys.length !== 1 || keys[0] !== 'label') {
      return { label, formatCompliant: false, parseIssue: 'JSON 含额外字段' }
    }
    return { label, formatCompliant: true, parseIssue: null }
  } catch {
    const matches = EVAL_LABELS.filter((label) =>
      unwrapped.toLowerCase().includes(label.toLowerCase()),
    )
    const label = matches.length === 1 ? matches[0] : null
    return {
      label,
      formatCompliant: false,
      parseIssue: '未返回严格 JSON',
    }
  }
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

function ratio(value: number): number {
  return Math.round(value * 1000) / 1000
}

export function buildEvaluation(
  cases: EvalCase[],
  outputs: EvalSnapshotOutput[],
  weights: RubricWeights = DEFAULT_RUBRIC_WEIGHTS,
  threshold = 60,
): EvalComparison {
  const minOutputTokens = Math.max(
    1,
    Math.min(...outputs.map((output) => Math.max(1, output.outputTokens))),
  )
  const caseMap = new Map(cases.map((item) => [item.id, item]))
  const runs = {} as Record<PromptVersion, ReturnType<typeof buildRun>>

  for (const promptId of PROMPT_VERSIONS) {
    runs[promptId] = buildRun(
      promptId,
      outputs.filter((output) => output.promptId === promptId),
      caseMap,
      weights,
      threshold,
      minOutputTokens,
    )
  }

  const scoreDiff = runs.v1.averageScore - runs.v2.averageScore
  return {
    threshold,
    weights: { ...weights },
    runs,
    winner: Math.abs(scoreDiff) < 0.1 ? 'tie' : scoreDiff > 0 ? 'v1' : 'v2',
  }
}

function buildRun(
  promptId: PromptVersion,
  outputs: EvalSnapshotOutput[],
  caseMap: Map<string, EvalCase>,
  weights: RubricWeights,
  threshold: number,
  minOutputTokens: number,
) {
  const scoredCases = outputs.flatMap((output) => {
    const evalCase = caseMap.get(output.caseId)
    if (!evalCase) return []

    const parsed = parseClassification(output.raw)
    const labelCorrect = parsed.label === evalCase.expectedLabel
    const efficiency = clamp(minOutputTokens / Math.max(1, output.outputTokens))
    const criteria: Record<RubricCriterionId, number> = {
      labelAccuracy: labelCorrect ? 1 : 0,
      formatCompliance: parsed.formatCompliant ? 1 : 0,
      edgeCaseHandling: evalCase.category === 'edge' ? (labelCorrect ? 1 : 0) : 1,
      efficiency,
    }

    const activeCriteria = Object.entries(criteria).filter(([id]) => {
      if (id !== 'edgeCaseHandling') return true
      return evalCase.category === 'edge'
    }) as [RubricCriterionId, number][]
    const totalWeight = activeCriteria.reduce((sum, [id]) => sum + weights[id], 0)
    const weighted = activeCriteria.reduce((sum, [id, value]) => sum + value * weights[id], 0)
    const score = totalWeight === 0 ? 0 : round((weighted / totalWeight) * 100)

    return [
      {
        caseId: output.caseId,
        promptId,
        raw: output.raw,
        label: parsed.label,
        expectedLabel: evalCase.expectedLabel,
        labelCorrect,
        formatCompliant: parsed.formatCompliant,
        parseIssue: parsed.parseIssue,
        latencyMs: output.latencyMs,
        inputTokens: output.inputTokens,
        outputTokens: output.outputTokens,
        efficiency,
        score,
        passed: score >= threshold,
      },
    ]
  })

  const edgeOutputs = scoredCases.filter(
    (item) => caseMap.get(item.caseId)?.category === 'edge',
  )
  const criteria: Record<RubricCriterionId, number> = {
    labelAccuracy: ratio(average(scoredCases.map((item) => (item.labelCorrect ? 1 : 0)))),
    formatCompliance: ratio(average(scoredCases.map((item) => (item.formatCompliant ? 1 : 0)))),
    edgeCaseHandling: ratio(average(edgeOutputs.map((item) => (item.labelCorrect ? 1 : 0)))),
    efficiency: ratio(average(scoredCases.map((item) => item.efficiency))),
  }
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0)
  const weighted = Object.entries(criteria).reduce(
    (sum, [id, value]) => sum + value * weights[id as RubricCriterionId],
    0,
  )
  const averageScore = totalWeight === 0 ? 0 : round((weighted / totalWeight) * 100)
  const passedCases = scoredCases.filter((item) => item.passed).length

  return {
    promptId,
    cases: scoredCases,
    criteria,
    averageScore,
    passRate: scoredCases.length === 0 ? 0 : round((passedCases / scoredCases.length) * 100),
    passedCases,
    averageLatencyMs: round(average(scoredCases.map((item) => item.latencyMs))),
    totalOutputTokens: scoredCases.reduce((sum, item) => sum + item.outputTokens, 0),
  }
}
