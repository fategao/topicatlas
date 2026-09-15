import { useEffect, useMemo, useState } from 'react'
import { CopyButton } from '../../ui/CopyButton'
import { loadConfigKeys } from '../../../data/hermes/loaders'
import type { ConfigEntry } from '../../../data/hermes/types'

const PRECEDENCE = [
  { level: '1', title: 'CLI 参数', detail: '例如 hermes chat --model anthropic/claude-sonnet-4，只覆盖这一次调用' },
  { level: '2', title: '~/.hermes/config.yaml', detail: '所有非机密设置的主配置文件' },
  { level: '3', title: '~/.hermes/.env', detail: '环境变量回退；API Key、bot token、密码这类机密必须放这里' },
  { level: '4', title: '内置默认值', detail: '什么都没设置时的硬编码安全默认值' },
]

const TREE = `~/.hermes/
├── config.yaml     # 设置（模型、终端、TTS、压缩等）
├── .env            # API 密钥和机密
├── auth.json       # OAuth provider 凭据（Nous Portal 等）
├── SOUL.md         # 主要 agent 身份（系统提示词第 #1 槽位）
├── memories/       # 持久记忆（MEMORY.md、USER.md）
├── skills/         # Agent 创建的技能（通过 skill_manage 工具管理）
├── cron/           # 定时任务
├── sessions/       # Gateway 会话
└── logs/           # 日志（errors.log、gateway.log — 机密自动脱敏）`

const PAGE_SIZE = 24

export function ConfigLab() {
  const [entries, setEntries] = useState<ConfigEntry[]>([])
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadConfigKeys()
      .then((data) => {
        if (!cancelled) setEntries(data.entries)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return entries
    return entries.filter((entry) => {
      const haystack = `${entry.title} ${entry.summary} ${entry.keys.map((k) => k.key).join(' ')}`
      return haystack.toLowerCase().includes(needle)
    })
  }, [entries, query])

  const visible = filtered.slice(0, limit)

  return (
    <>
      <div className="card mt-6 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-ink">两个文件，各管各的</h3>
        <p className="mt-1 text-xs text-faint">
          理解「普通配置 vs Secret 配置」最快的方式：看清 ~/.hermes/ 的目录职责和配置优先级。
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">目录职责</span>
              <CopyButton getText={() => TREE} />
            </div>
            <pre
              className="mt-2 overflow-x-auto rounded-xl border border-line p-3 text-[11px] leading-relaxed"
              style={{ background: 'var(--c-code-bg)', color: '#e6edf3' }}
            >
              <code>{TREE}</code>
            </pre>
          </div>

          <div>
            <span className="text-xs text-muted">配置优先级（从高到低）</span>
            <ol className="mt-2 space-y-2">
              {PRECEDENCE.map((item) => (
                <li key={item.level} className="flex gap-3 rounded-xl border border-line p-3">
                  <span className="font-mono text-xs text-accent">{item.level}</span>
                  <span>
                    <span className="block font-mono text-xs text-ink">{item.title}</span>
                    <span className="mt-0.5 block text-xs text-muted">{item.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <p className="mt-4 text-xs text-muted">
          经验法则：机密（API Key、bot token、密码）进 <code className="font-mono">.env</code>，
          其余（模型、终端后端、压缩设置、工具集）进 <code className="font-mono">config.yaml</code>。
          config.yaml 里还可以用 <code className="font-mono">{'${VAR_NAME}'}</code> 引用 .env 中的变量。
        </p>
      </div>

      <div className="card mt-6 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-ink">
          配置项速查
          {entries.length > 0 ? (
            <span className="ml-2 text-xs font-normal text-faint tabular-nums">
              {entries.length} 个小节
            </span>
          ) : null}
        </h3>
        <p className="mt-1 text-xs text-faint">
          直接来自官方 configuration 文档的结构化索引：搜小节名或配置键（例如 terminal、compaction、tts）。
        </p>

        <label className="mt-4 block">
          <span className="sr-only">搜索配置小节或键名</span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setLimit(PAGE_SIZE)
            }}
            placeholder="搜索配置小节或键名…"
            className="w-full rounded-lg border border-line bg-page-soft px-3 py-2 text-sm text-ink"
          />
        </label>

        {failed ? (
          <p className="mt-3 text-xs text-muted">数据加载失败，请刷新页面重试。</p>
        ) : entries.length === 0 ? (
          <p className="mt-3 text-xs text-muted">正在加载配置索引…</p>
        ) : (
          <>
            <p className="mt-2 text-xs text-faint tabular-nums">
              命中 {filtered.length} 个小节
            </p>
            <ul className="mt-3 divide-y divide-line">
              {visible.map((entry) => (
                <li key={entry.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-ink">{entry.title}</span>
                    {entry.keys.slice(0, 3).map((key) => (
                      <code
                        key={`${entry.id}-${key.key}`}
                        className="rounded border border-line px-1.5 py-0.5 font-mono text-[11px] text-accent"
                      >
                        {key.key}
                      </code>
                    ))}
                    {entry.keys.length > 3 ? (
                      <span className="text-[11px] text-faint">+{entry.keys.length - 3}</span>
                    ) : null}
                  </div>
                  {entry.summary ? (
                    <p className="mt-1 text-xs text-muted">{entry.summary}</p>
                  ) : null}
                  <a
                    className="mt-1 inline-block text-[11px] text-accent link-underline"
                    href={entry.url}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    官方原文 ↗
                  </a>
                </li>
              ))}
            </ul>

            {filtered.length > visible.length ? (
              <button
                type="button"
                className="btn mt-4"
                onClick={() => setLimit((current) => current + PAGE_SIZE)}
              >
                显示更多（还有 {filtered.length - visible.length} 个小节）
              </button>
            ) : null}
          </>
        )}
      </div>
    </>
  )
}
