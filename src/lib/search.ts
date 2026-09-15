/**
 * 全局搜索（⌘K）。索引在构建期由内容数据生成，这里是纯函数实现，
 * 便于用单测锁住排序与匹配行为。
 */

export type SearchKind = 'step' | 'command' | 'config' | 'tool' | 'provider'

export type SearchItem = {
  id: string
  kind: SearchKind
  title: string
  subtitle: string
  summary: string
  url: string
  /** 用于匹配的小写文本，构建索引时算好，避免每次输入都重复计算。 */
  haystack: string
}

export type SearchIndexInput = {
  steps: { id: string; title: string; zhTitle?: string; summary: string; url: string }[]
  commands: { id: string; title: string; summary: string; url: string }[]
  configEntries: { id: string; title: string; summary: string; url: string }[]
  tools: { id: string; title: string; summary: string; url: string }[]
  providers: { id: string; title: string; summary: string; url: string }[]
}

export const KIND_LABELS: Record<SearchKind, string> = {
  step: '学习步骤',
  command: 'CLI 命令',
  config: '配置项',
  tool: '工具集',
  provider: 'Provider',
}

const KIND_ORDER: SearchKind[] = ['step', 'command', 'config', 'tool', 'provider']

function makeItem(
  kind: SearchKind,
  entry: { id: string; title: string; summary: string; url: string },
  subtitle = '',
): SearchItem {
  const haystack = `${entry.title} ${subtitle} ${entry.summary}`.toLowerCase()
  return { id: entry.id, kind, title: entry.title, subtitle, summary: entry.summary, url: entry.url, haystack }
}

export function buildSearchIndex(input: SearchIndexInput): SearchItem[] {
  return [
    ...input.steps.map((step) =>
      makeItem('step', { ...step, title: step.zhTitle ?? step.title }, step.title),
    ),
    ...input.commands.map((entry) => makeItem('command', entry)),
    ...input.configEntries.map((entry) => makeItem('config', entry)),
    ...input.tools.map((entry) => makeItem('tool', entry)),
    ...input.providers.map((entry) => makeItem('provider', entry)),
  ]
}

export function searchItems(index: SearchItem[], query: string, limit = 12): SearchItem[] {
  const needle = query.trim().toLowerCase()
  if (needle.length === 0) return []

  const scored: { item: SearchItem; score: number }[] = []
  for (const item of index) {
    const titleIndex = item.title.toLowerCase().indexOf(needle)
    const subtitleIndex = item.subtitle.toLowerCase().indexOf(needle)
    const summaryIndex = item.summary.toLowerCase().indexOf(needle)

    let score = -1
    if (titleIndex >= 0) score = 1000 - titleIndex
    else if (subtitleIndex >= 0) score = 600 - subtitleIndex
    else if (summaryIndex >= 0) score = 300 - Math.min(summaryIndex, 200)
    else if (item.haystack.includes(needle)) score = 100

    if (score >= 0) scored.push({ item, score })
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const kindDiff = KIND_ORDER.indexOf(a.item.kind) - KIND_ORDER.indexOf(b.item.kind)
    if (kindDiff !== 0) return kindDiff
    return a.item.title.localeCompare(b.item.title)
  })

  return scored.slice(0, limit).map((entry) => entry.item)
}
