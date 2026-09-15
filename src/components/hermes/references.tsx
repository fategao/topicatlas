import { useMemo, useState } from 'react'
import { CopyButton } from '../ui/CopyButton'
import { useLazyData } from '../../lib/useLazyData'
import {
  loadCliCommands,
  loadConfigKeys,
  loadProviders,
  loadTools,
} from '../../data/hermes/loaders'
import type { TableBlock } from '../../data/hermes/types'

const PAGE_SIZE = 20

function SearchInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string
  onChange: (next: string) => void
  placeholder: string
  label: string
}) {
  return (
    <label className="mt-4 block">
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-line bg-page-soft px-3 py-2 text-sm text-ink"
      />
    </label>
  )
}

function More({ hidden, onClick }: { hidden: number; onClick: () => void }) {
  if (hidden <= 0) return null
  return (
    <button type="button" className="btn mt-4" onClick={onClick}>
      显示更多（还有 {hidden} 条）
    </button>
  )
}

function DataTable({ block }: { block: TableBlock }) {
  return (
    <div className="mt-3 overflow-x-auto">
      {block.title ? <p className="mb-1 text-xs text-faint">{block.title}</p> : null}
      <table className="w-full text-xs">
        <thead>
          <tr>
            {block.head.map((cell) => (
              <th
                key={cell}
                className="border-b border-line py-2 pr-4 text-left font-medium text-muted"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={
                    cellIndex === 0
                      ? 'border-b border-line py-2 pr-4 align-top font-mono text-ink'
                      : 'border-b border-line py-2 pr-4 align-top text-muted'
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CliReference() {
  const { data, loading, error } = useLazyData(loadCliCommands)
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    if (!data) return []
    const needle = query.trim().toLowerCase()
    if (!needle) return data.commands
    return data.commands.filter((command) =>
      `${command.command} ${command.usage} ${command.summary}`.toLowerCase().includes(needle),
    )
  }, [data, query])

  if (loading) return <p className="text-xs text-muted">正在加载 CLI 命令数据…</p>
  if (error || !data) return <p className="text-xs text-muted">数据加载失败，请刷新重试。</p>

  const visible = filtered.slice(0, limit)

  return (
    <div>
      <p className="text-xs text-faint">
        共 {data.totalCommands} 条命令，每条都带官方锚点；展开可以看到用法、选项表与示例。
      </p>
      <SearchInput
        value={query}
        label="搜索 CLI 命令"
        onChange={(next) => {
          setQuery(next)
          setLimit(PAGE_SIZE)
        }}
        placeholder="搜索命令，例如 logs、config、gateway…"
      />
      <p className="mt-2 text-xs text-faint tabular-nums">命中 {filtered.length} 条</p>

      <ul className="mt-3 space-y-2">
        {visible.map((command) => (
          <li key={command.id}>
            <details className="rounded-xl border border-line p-3">
              <summary className="cursor-pointer">
                <span className="font-mono text-sm text-ink">{command.command}</span>
                {command.summary ? (
                  <span className="ml-2 text-xs text-muted">{command.summary}</span>
                ) : null}
              </summary>

              {command.usage ? (
                <div className="mt-3 flex items-start justify-between gap-3">
                  <pre
                    className="flex-1 overflow-x-auto rounded-lg border border-line p-2.5 text-xs"
                    style={{ background: 'var(--c-code-bg)', color: '#e6edf3' }}
                  >
                    <code>{command.usage}</code>
                  </pre>
                  <CopyButton getText={() => command.usage} />
                </div>
              ) : null}

              {command.tables.map((table, index) => (
                <DataTable key={`${command.id}-table-${index}`} block={table} />
              ))}

              {command.examples.map((example, index) => (
                <div key={`${command.id}-example-${index}`} className="mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-faint">{example.title || '示例'}</span>
                    <CopyButton getText={() => example.code} />
                  </div>
                  <pre
                    className="mt-1 overflow-x-auto rounded-lg border border-line p-2.5 text-xs"
                    style={{ background: 'var(--c-code-bg)', color: '#e6edf3' }}
                  >
                    <code>{example.code}</code>
                  </pre>
                </div>
              ))}

              <a
                className="mt-3 inline-block text-[11px] text-accent link-underline"
                href={command.source.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                官方原文 ↗
              </a>
            </details>
          </li>
        ))}
      </ul>

      <More hidden={filtered.length - visible.length} onClick={() => setLimit((c) => c + PAGE_SIZE)} />
    </div>
  )
}

export function ConfigReference() {
  const { data, loading, error } = useLazyData(loadConfigKeys)
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    if (!data) return []
    const needle = query.trim().toLowerCase()
    if (!needle) return data.entries
    return data.entries.filter((entry) =>
      `${entry.title} ${entry.summary} ${entry.keys.map((key) => key.key).join(' ')}`
        .toLowerCase()
        .includes(needle),
    )
  }, [data, query])

  if (loading) return <p className="text-xs text-muted">正在加载配置索引…</p>
  if (error || !data) return <p className="text-xs text-muted">数据加载失败，请刷新重试。</p>

  const visible = filtered.slice(0, limit)

  return (
    <div>
      <p className="text-xs text-faint">
        官方 configuration 文档共 {data.totalSections} 个小节、{data.totalKeys} 个配置键（原文{' '}
        {data.docLineCount} 行）。这里做了结构化索引，方便按关键词定位。
      </p>
      <SearchInput
        value={query}
        label="搜索配置项索引"
        onChange={(next) => {
          setQuery(next)
          setLimit(PAGE_SIZE)
        }}
        placeholder="搜索配置键或小节，例如 terminal、compaction、tts…"
      />
      <p className="mt-2 text-xs text-faint tabular-nums">命中 {filtered.length} 个小节</p>

      <ul className="mt-3 divide-y divide-line">
        {visible.map((entry) => (
          <li key={entry.id} className="py-3">
            <details>
              <summary className="cursor-pointer text-sm text-ink">
                {entry.title}
                {entry.keys.length > 0 ? (
                  <span className="ml-2 text-[11px] text-faint tabular-nums">
                    {entry.keys.length} 个键
                  </span>
                ) : null}
              </summary>
              {entry.summary ? <p className="mt-2 text-xs text-muted">{entry.summary}</p> : null}
              {entry.keys.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {entry.keys.map((key) => (
                    <li
                      key={`${entry.id}-${key.key}`}
                      className="rounded border border-line px-1.5 py-0.5 font-mono text-[11px] text-accent"
                    >
                      {key.key}
                    </li>
                  ))}
                </ul>
              ) : null}
              {entry.snippets.slice(0, 1).map((snippet, index) => (
                <pre
                  key={`${entry.id}-snippet-${index}`}
                  className="mt-2 overflow-x-auto rounded-lg border border-line p-2.5 text-[11px]"
                  style={{ background: 'var(--c-code-bg)', color: '#e6edf3' }}
                >
                  <code>{snippet}</code>
                </pre>
              ))}
              <a
                className="mt-2 inline-block text-[11px] text-accent link-underline"
                href={entry.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                官方原文 ↗
              </a>
            </details>
          </li>
        ))}
      </ul>

      <More hidden={filtered.length - visible.length} onClick={() => setLimit((c) => c + PAGE_SIZE)} />
    </div>
  )
}

export function ToolsReference() {
  const { data, loading, error } = useLazyData(loadTools)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!data) return []
    const needle = query.trim().toLowerCase()
    if (!needle) return data.toolsets
    return data.toolsets.filter((toolset) =>
      `${toolset.name} ${toolset.tools.map((tool) => `${tool.name} ${tool.description}`).join(' ')}`
        .toLowerCase()
        .includes(needle),
    )
  }, [data, query])

  if (loading) return <p className="text-xs text-muted">正在加载工具集数据…</p>
  if (error || !data) return <p className="text-xs text-muted">数据加载失败，请刷新重试。</p>

  const totalTools = data.toolsets.reduce((sum, toolset) => sum + toolset.tools.length, 0)

  return (
    <div>
      <p className="text-xs text-faint">
        {data.toolsets.length} 个工具集、{totalTools} 个内置工具；按工具集分组，展开看每个工具的用途与前置条件。
      </p>
      <SearchInput
        value={query}
        label="搜索工具"
        onChange={setQuery}
        placeholder="搜索工具集或工具名，例如 browser、patch、web_search…"
      />
      <p className="mt-2 text-xs text-faint tabular-nums">命中 {filtered.length} 个工具集</p>

      <ul className="mt-3 space-y-2">
        {filtered.map((toolset) => (
          <li key={toolset.id}>
            <details className="rounded-xl border border-line p-3">
              <summary className="flex cursor-pointer items-center gap-2">
                <span className="font-mono text-sm text-ink">{toolset.name}</span>
                <span className="pill tabular-nums">{toolset.tools.length}</span>
              </summary>
              {toolset.summary ? <p className="mt-2 text-xs text-muted">{toolset.summary}</p> : null}
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
    </div>
  )
}

const AUTH_LABEL: Record<string, string> = {
  oauth: 'OAuth 登录',
  'api-key': 'API Key',
  custom: '自定义端点',
  local: '本地模型',
  manual: '手动配置',
}

export function ProviderReference() {
  const { data, loading, error } = useLazyData(loadProviders)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!data) return []
    const needle = query.trim().toLowerCase()
    if (!needle) return data.providers
    return data.providers.filter((provider) =>
      `${provider.name} ${provider.method} ${provider.envVars.join(' ')} ${provider.providerId}`
        .toLowerCase()
        .includes(needle),
    )
  }, [data, query])

  if (loading) return <p className="text-xs text-muted">正在加载 provider 列表…</p>
  if (error || !data) return <p className="text-xs text-muted">数据加载失败，请刷新重试。</p>

  return (
    <div>
      <p className="text-xs text-faint">
        官方 providers 文档里的 {data.providers.length} 个 provider 及其配置方式；密钥一律进
        ~/.hermes/.env。
      </p>
      <SearchInput
        value={query}
        label="搜索 provider"
        onChange={setQuery}
        placeholder="搜索 provider 名称或环境变量，例如 OPENROUTER、GLM、kimi…"
      />
      <p className="mt-2 text-xs text-faint tabular-nums">命中 {filtered.length} 个</p>

      <ul className="mt-3 space-y-2">
        {filtered.map((provider) => (
          <li key={provider.id} className="rounded-xl border border-line p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink">{provider.name}</span>
              <span className="pill">{AUTH_LABEL[provider.authMode] ?? provider.authMode}</span>
              {provider.providerId ? (
                <code className="font-mono text-[11px] text-accent">
                  provider: {provider.providerId}
                </code>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-muted">配置方式：{provider.method}</p>
            {provider.envVars.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {provider.envVars.map((envVar) => (
                  <li
                    key={envVar}
                    className="rounded border border-line px-1.5 py-0.5 font-mono text-[11px] text-accent"
                  >
                    {envVar}
                  </li>
                ))}
              </ul>
            ) : null}
            <a
              className="mt-2 inline-block text-[11px] text-accent link-underline"
              href={provider.source.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              官方原文 ↗
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
