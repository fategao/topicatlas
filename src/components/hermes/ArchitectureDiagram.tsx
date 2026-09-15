import { useState } from 'react'

type NodeId = 'cli' | 'loop' | 'tools' | 'backends' | 'memory'

const NODES: { id: NodeId; label: string; detail: string; x: number; y: number }[] = [
  {
    id: 'cli',
    label: 'CLI / Desktop / Gateway',
    detail:
      '你从终端（hermes、hermes --tui）、桌面应用或消息平台发出的输入。三者共享同一套会话、斜杠命令与配置。',
    x: 12,
    y: 30,
  },
  {
    id: 'loop',
    label: 'Agent Loop',
    detail:
      '负责多轮推理：组装系统提示词 → 请求模型 → 解析工具调用 → 把结果写回上下文，循环直到任务完成。',
    x: 42,
    y: 30,
  },
  {
    id: 'memory',
    label: '记忆与上下文',
    detail:
      'MEMORY.md / USER.md 提供跨会话记忆，SOUL.md 定义 agent 身份；上下文接近上限时按配置自动压缩。',
    x: 42,
    y: 74,
  },
  {
    id: 'tools',
    label: 'Tools / Toolsets',
    detail:
      'read_file、patch、terminal、web_search、browser_*、todo、delegate_task 等工具，按工具集启用或禁用。',
    x: 74,
    y: 30,
  },
  {
    id: 'backends',
    label: '执行后端',
    detail:
      'terminal 工具可以跑在 local、docker、ssh、modal、daytona 等后端上，用隔离环境执行真实命令。',
    x: 74,
    y: 74,
  },
]

const EDGES: [NodeId, NodeId][] = [
  ['cli', 'loop'],
  ['loop', 'tools'],
  ['tools', 'backends'],
  ['loop', 'memory'],
]

/**
 * 架构数据流图：自绘 SVG + hover/焦点高亮，不引用任何官方图片资源。
 */
export function ArchitectureDiagram() {
  const [active, setActive] = useState<NodeId>('loop')
  const activeNode = NODES.find((node) => node.id === active) ?? NODES[0]

  return (
    <figure className="card mt-6 overflow-hidden p-4 sm:p-5">
      <figcaption className="text-sm font-semibold text-ink">一次请求在 Hermes 里怎么走</figcaption>
      <p className="mt-1 text-xs text-faint">悬浮或聚焦任意节点查看说明（键盘 Tab 也能切换）。</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <svg viewBox="0 0 100 100" className="h-56 w-full" role="img" aria-label="Hermes Agent 数据流示意图">
          <defs>
            <linearGradient id="edge-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--c-accent)" />
              <stop offset="100%" stopColor="var(--c-accent-2)" />
            </linearGradient>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--c-accent)" />
            </marker>
          </defs>

          {EDGES.map(([from, to]) => {
            const a = NODES.find((n) => n.id === from)!
            const b = NODES.find((n) => n.id === to)!
            const highlighted = active === from || active === to
            return (
              <line
                key={`${from}-${to}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={highlighted ? 'url(#edge-gradient)' : 'var(--c-line-strong)'}
                strokeWidth={highlighted ? 0.9 : 0.4}
                strokeDasharray={highlighted ? '0' : '2 2'}
                markerEnd="url(#arrow)"
              />
            )
          })}

          {NODES.map((node) => {
            const isActive = node.id === active
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setActive(node.id)}
                onFocus={() => setActive(node.id)}
                tabIndex={0}
                role="button"
                aria-label={node.label}
                className="cursor-pointer outline-none"
              >
                <circle
                  r={isActive ? 7.4 : 6.4}
                  fill={isActive ? 'var(--c-accent)' : 'var(--c-page-soft)'}
                  stroke={isActive ? 'var(--c-accent-2)' : 'var(--c-line-strong)'}
                  strokeWidth={0.7}
                  style={{ transition: 'r 220ms ease, fill 220ms ease' }}
                />
                <text
                  y={13}
                  textAnchor="middle"
                  className="fill-current text-[3.4px]"
                  style={{ fill: 'var(--c-muted)' }}
                >
                  {node.label.split(' / ')[0]}
                </text>
              </g>
            )
          })}
        </svg>

        <div className="card p-4">
          <h3 className="text-sm font-semibold text-ink">{activeNode.label}</h3>
          <p className="mt-2 text-sm text-muted">{activeNode.detail}</p>
        </div>
      </div>
    </figure>
  )
}
