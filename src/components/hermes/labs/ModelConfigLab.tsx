import { useEffect, useMemo, useState } from 'react'
import { CopyButton } from '../../ui/CopyButton'
import { buildConfigSnippet, buildEnvSnippet, validateModelInput } from '../../../lib/generators'
import { loadProviders } from '../../../data/hermes/loaders'
import type { ProviderEntry } from '../../../data/hermes/types'

/** 数据加载期间的兜底选项，避免选择器长时间空着。 */
const FALLBACK: ProviderEntry[] = [
  { id: 'openrouter', name: 'OpenRouter', providerId: 'openrouter', method: '', envVars: ['OPENROUTER_API_KEY'], authMode: 'api-key', source: { url: '', file: '' } },
  { id: 'custom', name: '自定义端点', providerId: 'custom', method: '', envVars: [], authMode: 'custom', source: { url: '', file: '' } },
]

export function ModelConfigLab() {
  const [providers, setProviders] = useState<ProviderEntry[]>(FALLBACK)
  const [loading, setLoading] = useState(true)
  const [providerIndex, setProviderIndex] = useState(0)
  const [model, setModel] = useState('anthropic/claude-opus-4.7')
  const [baseUrl, setBaseUrl] = useState('')

  useEffect(() => {
    let cancelled = false
    loadProviders()
      .then((data) => {
        if (cancelled) return
        setProviders(data.providers)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const provider = providers[providerIndex] ?? FALLBACK[0]!
  const isCustom = provider.authMode === 'custom'
  // 只有官方文档明确给出 provider id 时才写入它；否则用占位符提示用户从
  // hermes model 实际写入的 config.yaml 里复制，避免站点编造一个不存在的 id。
  const providerId = isCustom ? 'custom' : provider.providerId
  const input = useMemo(
    () => ({ provider: providerId || 'PROVIDER_ID', model, baseUrl }),
    [providerId, model, baseUrl],
  )

  const issues = useMemo(() => validateModelInput(input), [input])
  const configYaml = useMemo(() => buildConfigSnippet(input), [input])
  const envSnippet = useMemo(() => buildEnvSnippet(provider.envVars), [provider.envVars])

  const hints = useMemo(() => {
    const list: string[] = []
    if (!providerId) {
      list.push(
        `官方文档没有直接给出 ${provider.name} 的 provider id：先运行 hermes model 选择一次，再把 ~/.hermes/config.yaml 里实际写入的值替换上面的 PROVIDER_ID。`,
      )
    }
    if (provider.envVars.length > 0) {
      list.push(`密钥写进 ~/.hermes/.env：${provider.envVars.join('、')}`)
    }
    return list
  }, [providerId, provider.name, provider.envVars])

  return (
    <div className="card mt-6 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-ink">配置你的模型</h3>
      <p className="mt-1 text-xs text-faint">
        选 provider、填模型名，下面会生成与官方文档字段一致的 <code className="font-mono">config.yaml</code> 片段。
        {loading ? '（正在加载完整 provider 列表…）' : `（共 ${providers.length} 个 provider）`}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs text-muted">Provider</span>
          <select
            className="mt-1 w-full rounded-lg border border-line bg-page-soft px-3 py-2 text-sm text-ink"
            value={providerIndex}
            onChange={(event) => setProviderIndex(Number(event.target.value))}
          >
            {providers.map((item, index) => (
              <option key={`${item.id}-${index}`} value={index}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-muted">模型名</span>
          <input
            className="mt-1 w-full rounded-lg border border-line bg-page-soft px-3 py-2 font-mono text-sm text-ink"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder="anthropic/claude-opus-4.7"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs text-muted">
            Base URL（自建或课程提供的 OpenAI 兼容端点才需要）
          </span>
          <input
            className="mt-1 w-full rounded-lg border border-line bg-page-soft px-3 py-2 font-mono text-sm text-ink"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="http://127.0.0.1:8000/v1"
          />
        </label>
      </div>

      <p className="mt-3 text-xs text-muted">
        当前 provider 的配置方式：{provider.method || '—'}
        {provider.providerId ? (
          <>
            {' · '}provider id：<code className="font-mono">{provider.providerId}</code>
          </>
        ) : null}
      </p>

      {issues.length > 0 ? (
        <ul className="mt-3 space-y-1 rounded-xl border border-line p-3" role="status">
          {issues.map((issue) => (
            <li key={issue} className="text-xs" style={{ color: '#f0a13c' }}>
              ! {issue}
            </li>
          ))}
        </ul>
      ) : null}

      {hints.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-muted">
          {hints.map((hint) => (
            <li key={hint}>· {hint}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">config.yaml</span>
            <CopyButton getText={() => configYaml} />
          </div>
          <pre
            className="mt-2 overflow-x-auto rounded-xl border border-line p-3 text-xs"
            style={{ background: 'var(--c-code-bg)', color: '#e6edf3' }}
          >
            <code>{configYaml}</code>
          </pre>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">.env（密钥只放这里）</span>
            <CopyButton getText={() => envSnippet} />
          </div>
          <pre
            className="mt-2 overflow-x-auto rounded-xl border border-line p-3 text-xs"
            style={{ background: 'var(--c-code-bg)', color: '#e6edf3' }}
          >
            <code>{envSnippet}</code>
          </pre>
        </div>
      </div>

      <p className="mt-3 text-xs text-faint">
        也可以完全交给 CLI：<code className="font-mono">hermes config set model &lt;provider/model&gt;</code>{' '}
        会把密钥写进 .env、其余写进 config.yaml。
      </p>
    </div>
  )
}
