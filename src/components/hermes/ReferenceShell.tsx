import { useState } from 'react'
import { CliReference, ConfigReference, ProviderReference, ToolsReference } from './references'

const TABS = [
  { id: 'cli', label: 'CLI 命令', hint: '官方 cli-commands 的全量命令、选项与示例' },
  { id: 'config', label: '配置项', hint: '官方 configuration 文档的结构化索引' },
  { id: 'tools', label: '工具集', hint: '内置工具按工具集分组' },
  { id: 'providers', label: 'Provider', hint: 'provider 列表与鉴权方式' },
] as const

type TabId = (typeof TABS)[number]['id']

/**
 * 速查参考：四个视图各自按需加载自己的 JSON，
 * 首屏不会把它们全部塞进 bundle。
 */
export function ReferenceShell() {
  const [active, setActive] = useState<TabId>('cli')
  const current = TABS.find((tab) => tab.id === active) ?? TABS[0]

  return (
    <section id="reference" className="card p-5 sm:p-6" aria-labelledby="reference-heading">
      <h2 id="reference-heading" className="text-lg font-semibold text-ink">
        速查参考
      </h2>
      <p className="mt-1 text-sm text-muted">
        学习路径里提到的命令、配置项、工具与 provider，都在这里按官方文档结构化存在。
      </p>

      <div role="tablist" aria-label="速查参考分类" className="mt-5 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`ref-tab-${tab.id}`}
            aria-selected={tab.id === active}
            aria-controls="reference-panel"
            className="btn"
            style={tab.id === active ? { borderColor: 'var(--c-accent)' } : undefined}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-faint">{current.hint}</p>

      <div
        id="reference-panel"
        role="tabpanel"
        aria-labelledby={`ref-tab-${active}`}
        className="mt-4 border-t border-line pt-4"
      >
        {active === 'cli' ? <CliReference /> : null}
        {active === 'config' ? <ConfigReference /> : null}
        {active === 'tools' ? <ToolsReference /> : null}
        {active === 'providers' ? <ProviderReference /> : null}
      </div>
    </section>
  )
}
