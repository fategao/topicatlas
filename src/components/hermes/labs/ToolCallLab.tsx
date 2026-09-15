import { useEffect, useMemo, useState } from 'react'
import { CopyButton } from '../../ui/CopyButton'
import { buildToolCallPrompt } from '../../../lib/generators'
import { loadTools } from '../../../data/hermes/loaders'
import type { ToolsetEntry } from '../../../data/hermes/types'

const TOOLSET_ORDER = ['file', 'terminal', 'web', 'browser', 'todo', 'delegation', 'memory', 'skills']
const PAGE_SIZE = 10

export function ToolCallLab() {
  const [inputFile, setInputFile] = useState('sales.csv')
  const [outputFile, setOutputFile] = useState('summary.md')
  const [toolsets, setToolsets] = useState<ToolsetEntry[]>([])
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE_SIZE)

  useEffect(() => {
    let cancelled = false
    loadTools()
      .then((data) => {
        if (cancelled) return
        const sorted = [...data.toolsets].sort((a, b) => {
          const ai = TOOLSET_ORDER.findIndex((name) => a.name.startsWith(name))
          const bi = TOOLSET_ORDER.findIndex((name) => b.name.startsWith(name))
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
        })
        setToolsets(sorted)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const prompt = useMemo(() => buildToolCallPrompt({ inputFile, outputFile }), [inputFile, outputFile])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return toolsets
    return toolsets.filter((toolset) =>
      `${toolset.name} ${toolset.tools.map((tool) => `${tool.name} ${tool.description}`).join(' ')}`
        .toLowerCase()
        .includes(needle),
    )
  }, [toolsets, query])

  const visible = filtered.slice(0, limit)

  return (
    <>
      <div className="card mt-6 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-ink">练习：让工具真的动起来</h3>
        <p className="mt-1 text-xs text-faint">
          填上你的数据文件名和想要的结果文件，下面会生成一段可以直接粘进 Hermes 的提示词。
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-muted">输入数据文件</span>
            <input
              className="mt-1 w-full rounded-lg border border-line bg-page-soft px-3 py-2 font-mono text-sm text-ink"
              value={inputFile}
              onChange={(event) => setInputFile(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">结果文件</span>
            <input
              className="mt-1 w-full rounded-lg border border-line bg-page-soft px-3 py-2 font-mono text-sm text-ink"
              value={outputFile}
              onChange={(event) => setOutputFile(event.target.value)}
            />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted">可直接粘贴的提示词</span>
          <CopyButton getText={() => prompt} />
        </div>
        <pre
          className="mt-2 overflow-x-auto rounded-xl border border-line p-3 text-xs whitespace-pre-wrap"
          style={{ background: 'var(--c-code-bg)', color: '#e6edf3' }}
        >
          <code>{prompt}</code>
        </pre>
      </div>

      <div className="card mt-6 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-ink">
          工具集浏览器
          {toolsets.length > 0 ? (
            <span className="ml-2 text-xs font-normal text-faint tabular-nums">
              {toolsets.length} 个工具集
            </span>
          ) : null}
        </h3>
        <p className="mt-1 text-xs text-faint">
          来自官方内置工具参考；想知道某个工具的确切参数与前置条件，点开官方原文核对。
        </p>

        <label className="mt-4 block">
          <span className="sr-only">搜索工具集或工具名</span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setLimit(PAGE_SIZE)
            }}
            placeholder="搜索工具集或工具名，例如 file、terminal、web_search…"
            className="w-full rounded-lg border border-line bg-page-soft px-3 py-2 text-sm text-ink"
          />
        </label>

        {toolsets.length === 0 ? (
          <p className="mt-3 text-xs text-muted">正在加载工具集数据…</p>
        ) : filtered.length === 0 ? (
          <p className="mt-3 text-xs text-muted">没有匹配的工具集。</p>
        ) : (
          <>
            <ul className="mt-4 space-y-3">
              {visible.map((toolset) => (
                <li key={toolset.id}>
                  <details className="rounded-xl border border-line p-3">
                    <summary className="flex cursor-pointer flex-wrap items-center gap-2">
                      <span className="font-mono text-sm text-ink">{toolset.name}</span>
                      <span className="pill tabular-nums">{toolset.tools.length} 个工具</span>
                    </summary>
                    <ul className="mt-3 space-y-2">
                      {toolset.tools.map((tool) => (
                        <li key={tool.name} className="text-xs">
                          <code className="font-mono text-accent">{tool.name}</code>
                          <span className="ml-2 text-muted">{tool.description}</span>
                          {tool.requires && tool.requires !== '—' ? (
                            <span className="ml-2 text-faint">（需要：{tool.requires}）</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    <a
                      className="mt-3 inline-block text-[11px] text-accent link-underline"
                      href={toolset.source.url}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      官方原文 ↗
                    </a>
                  </details>
                </li>
              ))}
            </ul>

            {filtered.length > visible.length ? (
              <button
                type="button"
                className="btn mt-4"
                onClick={() => setLimit((current) => current + PAGE_SIZE)}
              >
                显示更多（还有 {filtered.length - visible.length} 个）
              </button>
            ) : null}
          </>
        )}
      </div>
    </>
  )
}
