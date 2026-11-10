import type {
  LoadLevel,
  Observability,
  SkillTraceEvent,
} from './types'

export const LEVEL_LABELS: Record<LoadLevel, string> = {
  context: 'Turn context',
  metadata: 'Level 1 · Metadata',
  instructions: 'Level 2 · SKILL.md',
  reference: 'Level 3 · Reference',
  script: 'Level 3 · Script',
  output: 'Final output',
}

export const OBSERVABILITY_LABELS: Record<Observability, string> = {
  observed: '已观测',
  computed: '本地计算',
  documented: '文档推定',
}

export function formatCount(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString('en-US') : '—'
}

export function cumulativeContextTokens(
  events: SkillTraceEvent[],
  activeIndex: number,
): number {
  return events
    .slice(0, Math.max(0, activeIndex + 1))
    .reduce((sum, event) => sum + event.contextTokensAdded, 0)
}

export function loadedFiles(events: SkillTraceEvent[], activeIndex: number): Set<string> {
  const paths = new Set<string>()
  for (const event of events.slice(0, Math.max(0, activeIndex + 1))) {
    if (event.kind === 'read' && event.file) paths.add(event.file)
  }
  return paths
}

export function isFinalOutput(event: SkillTraceEvent | undefined): boolean {
  return event?.kind === 'message' && event.level === 'output'
}

export function usageTotal(usage: {
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
}): number {
  return usage.inputTokens + usage.cachedInputTokens + usage.outputTokens
}
