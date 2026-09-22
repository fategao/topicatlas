import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { KIND_LABELS, buildSearchIndex, searchItems, type SearchItem } from '../../lib/search'
import { hermesSteps } from '../../data/hermes/steps'
import { loadSearchIndex } from '../../data/hermes/loaders'
import type { SearchIndexEntry } from '../../data/hermes/types'

type CommandPaletteProps = {
  open: boolean
  onClose: () => void
}

/**
 * ⌘K / Ctrl+K 全局搜索。
 * 索引在第一次打开时才加载：首屏不需要为搜索付出任何体积代价。
 */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [entries, setEntries] = useState<SearchIndexEntry[] | null>(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open || entries) return
    let cancelled = false
    loadSearchIndex()
      .then((data) => {
        if (!cancelled) setEntries(data.entries)
      })
      .catch(() => {
        if (!cancelled) setEntries([])
      })
    return () => {
      cancelled = true
    }
  }, [open, entries])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      inputRef.current?.focus()
    }
  }, [open])

  const index = useMemo(
    () =>
      buildSearchIndex({
        steps: hermesSteps.map((step) => ({
          id: step.id,
          title: step.officialName,
          zhTitle: step.zhTitle,
          summary: `${step.goal} ${step.summary}`,
          url: `#step-${step.id}`,
        })),
        commands: (entries ?? [])
          .filter((entry) => entry.kind === 'command')
          .map((entry) => ({ id: entry.id, title: entry.title, summary: entry.summary, url: entry.url })),
        configEntries: (entries ?? [])
          .filter((entry) => entry.kind === 'config')
          .map((entry) => ({ id: entry.id, title: entry.title, summary: entry.summary, url: entry.url })),
        tools: (entries ?? [])
          .filter((entry) => entry.kind === 'tool')
          .map((entry) => ({ id: entry.id, title: entry.title, summary: entry.summary, url: entry.url })),
        providers: (entries ?? [])
          .filter((entry) => entry.kind === 'provider')
          .map((entry) => ({ id: entry.id, title: entry.title, summary: entry.summary, url: entry.url })),
      }),
    [entries],
  )

  const results = useMemo(() => searchItems(index, query, 12), [index, query])

  const activate = useCallback(
    (item: SearchItem) => {
      if (item.url.startsWith('#')) {
        window.location.hash = item.url
      } else {
        window.open(item.url, '_blank', 'noopener,noreferrer')
      }
      onClose()
    },
    [onClose],
  )

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((current) => Math.min(current + 1, Math.max(results.length - 1, 0)))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((current) => Math.max(current - 1, 0))
        return
      }
      if (event.key === 'Enter') {
        const item = results[activeIndex]
        if (item) {
          event.preventDefault()
          activate(item)
        }
      }
    },
    [results, activeIndex, activate, onClose],
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 px-4 pt-[12vh] backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-2xl overflow-hidden"
        style={{ background: 'var(--c-page-soft)' }}
        role="dialog"
        aria-modal="true"
        aria-label="全局搜索"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(0)
          }}
          placeholder="搜索 Hermes 学习步骤、CLI 命令、配置项、工具集或 provider…"
          className="w-full border-b border-line bg-transparent px-4 py-3.5 text-sm text-ink outline-none"
          aria-label="搜索关键词"
        />

        {query.trim().length === 0 ? (
          <p className="px-4 py-6 text-xs text-faint">
            输入关键词开始搜索。例如「安装」「/status」「terminal」「OpenRouter」。
          </p>
        ) : results.length === 0 ? (
          <p className="px-4 py-6 text-xs text-faint">没有匹配结果。</p>
        ) : (
          <ul className="max-h-[52vh] overflow-y-auto py-1">
            {results.map((item, index) => (
              <li key={`${item.kind}-${item.id}`}>
                <button
                  type="button"
                  className="flex w-full items-start gap-3 px-4 py-2.5 text-left"
                  style={
                    index === activeIndex ? { background: 'var(--c-surface-strong)' } : undefined
                  }
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => activate(item)}
                >
                  <span className="pill shrink-0">{KIND_LABELS[item.kind]}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-ink">{item.title}</span>
                    <span className="block truncate text-xs text-muted">{item.summary}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[11px] text-faint">
          <span>↑ ↓ 选择 · Enter 打开 · Esc 关闭</span>
          <span>{entries ? `${entries.length + hermesSteps.length} 条索引` : '正在加载索引…'}</span>
        </div>
      </div>
    </div>
  )
}
