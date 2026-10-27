import {
  AlertTriangle,
  Bot,
  Check,
  CircleAlert,
  Clock3,
  Code2,
  FileCode2,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Terminal,
  TestTube2,
  Wrench,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type {
  ObservatorySnapshot,
  SourceRef,
  TraceEventKind,
  TraceFilter,
} from './types'
import './agent-observatory.css'

type AgentObservatoryProps = {
  snapshot: ObservatorySnapshot | null
}

const FILTERS: readonly { id: TraceFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'command', label: '命令' },
  { id: 'file', label: '文件' },
  { id: 'tool', label: '工具' },
  { id: 'test', label: '验证' },
  { id: 'error', label: '错误' },
]

const KIND_ICONS = {
  message: Bot,
  command: Terminal,
  file: FileCode2,
  tool: Wrench,
  test: TestTube2,
  error: CircleAlert,
} satisfies Record<TraceEventKind, typeof Bot>

function formatDuration(value: number): string {
  if (value < 1_000) return `${value} ms`
  if (value < 60_000) return `${(value / 1_000).toFixed(1)} s`
  return `${Math.floor(value / 60_000)}m ${Math.round((value % 60_000) / 1_000)}s`
}

function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--:--'
  return date.toISOString().slice(11, 19)
}

function eventMatches(event: ObservatorySnapshot['events'][number], filter: TraceFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'error') return event.status === 'failed' || event.kind === 'error'
  return event.kind === filter
}

export function AgentObservatory({ snapshot }: AgentObservatoryProps) {
  const [activeFilter, setActiveFilter] = useState<TraceFilter>('all')
  const [activeId, setActiveId] = useState(snapshot?.events[0]?.id ?? '')
  const [selectedRef, setSelectedRef] = useState<SourceRef | null>(
    snapshot?.events[0]?.sourceRefs[0] ?? null,
  )
  const [playing, setPlaying] = useState(false)

  const visibleEvents = useMemo(
    () => snapshot?.events.filter((event) => eventMatches(event, activeFilter)) ?? [],
    [snapshot, activeFilter],
  )
  const activeIndex = Math.max(
    0,
    visibleEvents.findIndex((event) => event.id === activeId),
  )
  const activeEvent = visibleEvents[activeIndex] ?? null

  useEffect(() => {
    if (!playing || visibleEvents.length < 2) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setPlaying(false)
      return
    }

    const timer = window.setInterval(() => {
      setActiveId((current) => {
        const index = visibleEvents.findIndex((event) => event.id === current)
        const next = visibleEvents[Math.min(index + 1, visibleEvents.length - 1)]
        if (!next || index >= visibleEvents.length - 1) setPlaying(false)
        return next?.id ?? current
      })
    }, 1_400)

    return () => window.clearInterval(timer)
  }, [playing, visibleEvents])

  useEffect(() => {
    if (activeEvent) {
      setSelectedRef(activeEvent.sourceRefs[0] ?? null)
    }
  }, [activeEvent])

  function chooseFilter(filter: TraceFilter) {
    setActiveFilter(filter)
    const next = snapshot?.events.find((event) => eventMatches(event, filter))
    setActiveId(next?.id ?? '')
    setPlaying(false)
  }

  function step(delta: number) {
    const next = visibleEvents[Math.min(Math.max(activeIndex + delta, 0), visibleEvents.length - 1)]
    if (next) setActiveId(next.id)
    setPlaying(false)
  }

  function resetPlayback() {
    setActiveId(visibleEvents[0]?.id ?? '')
    setPlaying(false)
  }

  if (!snapshot) {
    return (
      <section className="observatory-empty">
        <div role="alert">
          <AlertTriangle size={22} aria-hidden="true" />
          <div>
            <h2>运行快照不可用</h2>
            <p>监控数据缺失时页面不会伪造事件。请先运行双 Agent 实验并重新构建站点。</p>
          </div>
        </div>
        <a className="btn btn-primary" href="/agent-observatory/matrix-lab">
          打开矩阵实验室
        </a>
      </section>
    )
  }

  const selectedSource =
    snapshot.sources.find((source) => source.path === selectedRef?.file) ?? snapshot.sources[0]
  const selectedIndex = Math.max(0, activeIndex)

  return (
    <div className="observatory">
      <header className="observatory__runbar">
        <div>
          <p className="observatory__eyebrow">AGENT RUN / RECORDED REPLAY</p>
          <div className="observatory__runtitle">
            <h1>一次真实构建，被完整摊开</h1>
            <span className={`observatory__status is-${snapshot.status}`} data-testid="run-status">
              {snapshot.status === 'completed' ? <Check size={14} /> : <CircleAlert size={14} />}
              {snapshot.status === 'completed' ? '已完成' : '失败'}
            </span>
          </div>
          <p>
            产品 Agent 实现矩阵学习页，监控 Agent 归一化真实事件。这里播放的是构建期记录，
            不会在浏览器请求模型。
          </p>
        </div>

        <dl className="observatory__metrics" aria-label="运行指标">
          <div>
            <dt>MODEL / PROVIDER</dt>
            <dd title={snapshot.agent.provider}>
              {snapshot.agent.model}
              <small>{snapshot.agent.provider}</small>
            </dd>
          </div>
          <div>
            <dt>耗时</dt>
            <dd>{formatDuration(snapshot.agent.durationMs)}</dd>
          </div>
          <div>
            <dt>工具调用</dt>
            <dd>{snapshot.agent.toolCallCount}</dd>
          </div>
          <div>
            <dt>TOKEN</dt>
            <dd>
              {snapshot.agent.tokenCount.toLocaleString('zh-CN')}
              <small>{snapshot.agent.tokenSource === 'provider' ? 'provider' : '估算'}</small>
            </dd>
          </div>
        </dl>
      </header>

      <div className="observatory__path" aria-label="双 Agent 数据流">
        <div>
          <Bot size={18} aria-hidden="true" />
          <span>产品 Agent</span>
          <small>实现与验证</small>
        </div>
        <i aria-hidden="true">→</i>
        <div>
          <Terminal size={18} aria-hidden="true" />
          <span>JSON 事件流</span>
          <small>过程证据</small>
        </div>
        <i aria-hidden="true">→</i>
        <div>
          <ScanLine size={18} aria-hidden="true" />
          <span>监控 Agent</span>
          <small>归一与脱敏</small>
        </div>
        <i aria-hidden="true">→</i>
        <div>
          <Code2 size={18} aria-hidden="true" />
          <span>源码映射</span>
          <small>静态回放</small>
        </div>
      </div>

      {snapshot.monitor ? (
        <aside className="observatory__monitor-note" aria-label="监控 Agent 结论">
          <div>
            <Bot size={17} aria-hidden="true" />
            <span>监控 Agent 结论</span>
            <small>{snapshot.monitor.model}</small>
          </div>
          <p>{snapshot.monitor.summary}</p>
          <ul>
            {snapshot.monitor.observations.map((observation) => (
              <li key={observation}>{observation}</li>
            ))}
          </ul>
        </aside>
      ) : null}

      <section className="observatory__timeline" aria-labelledby="timeline-heading">
        <div className="observatory__timeline-head">
          <div>
            <p>SESSION REPLAY</p>
            <h2 id="timeline-heading">从规格到可运行页面</h2>
          </div>
          <div className="observatory__playback">
            <button type="button" className="observatory__icon-btn" onClick={resetPlayback} aria-label="回到开头">
              <RotateCcw size={16} />
            </button>
            <button type="button" className="observatory__icon-btn" onClick={() => step(-1)} aria-label="上一条事件">
              <SkipBack size={16} />
            </button>
            <button
              type="button"
              className="observatory__play"
              onClick={() => setPlaying((value) => !value)}
              aria-label={playing ? '暂停回放' : '播放回放'}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
              {playing ? '暂停' : '播放'}
            </button>
            <button type="button" className="observatory__icon-btn" onClick={() => step(1)} aria-label="下一条事件">
              <SkipForward size={16} />
            </button>
          </div>
        </div>

        <div className="observatory__scrubber">
          <span>{formatTime(visibleEvents[0]?.startedAt ?? snapshot.generatedAt)}</span>
          <input
            type="range"
            min="0"
            max={Math.max(0, visibleEvents.length - 1)}
            value={selectedIndex}
            aria-label="回放进度"
            onChange={(event) => {
              const next = visibleEvents[Number(event.target.value)]
              if (next) setActiveId(next.id)
              setPlaying(false)
            }}
          />
          <span>{formatTime(visibleEvents.at(-1)?.startedAt ?? snapshot.generatedAt)}</span>
        </div>

        <div className="observatory__filters" aria-label="事件筛选">
          {FILTERS.map((filter) => {
            const count = snapshot.events.filter((event) => eventMatches(event, filter.id)).length
            return (
              <button
                key={filter.id}
                type="button"
                aria-pressed={activeFilter === filter.id}
                onClick={() => chooseFilter(filter.id)}
              >
                {filter.label} <span>{count}</span>
              </button>
            )
          })}
        </div>

        <ol className="observatory__events" data-testid="event-list">
          {visibleEvents.map((event, index) => {
            const Icon = KIND_ICONS[event.kind]
            return (
              <li key={event.id}>
                <button
                  type="button"
                  className={event.id === activeEvent?.id ? 'is-active' : undefined}
                  onClick={() => {
                    setActiveId(event.id)
                    setPlaying(false)
                  }}
                >
                  <span className="observatory__event-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className={`observatory__event-icon is-${event.status}`}>
                    <Icon size={15} aria-hidden="true" />
                  </span>
                  <span className="observatory__event-copy">
                    <strong>{event.title}</strong>
                    <small>
                      {event.phase} · {formatTime(event.startedAt)}
                    </small>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </section>

      <div className="observatory__inspect">
        <section className="observatory__event-panel" data-testid="active-event" aria-live="polite">
          <div className="observatory__panel-heading">
            <div>
              <p>EVENT INSPECTOR</p>
              <h2>{activeEvent?.title ?? '没有匹配事件'}</h2>
            </div>
            {activeEvent ? (
              <span className={`observatory__status is-${activeEvent.status}`}>
                {activeEvent.status === 'failed' ? '失败' : activeEvent.status === 'pending' ? '进行中' : '通过'}
              </span>
            ) : null}
          </div>

          <p className="observatory__summary">{activeEvent?.summary ?? '调整筛选条件后再查看。'}</p>

          {activeEvent ? (
            <>
              <dl className="observatory__event-meta">
                <div>
                  <dt>阶段</dt>
                  <dd>{activeEvent.phase}</dd>
                </div>
                <div>
                  <dt>时间</dt>
                  <dd>{formatTime(activeEvent.startedAt)}</dd>
                </div>
                <div>
                  <dt>类型</dt>
                  <dd>{activeEvent.kind}</dd>
                </div>
                <div>
                  <dt>耗时</dt>
                  <dd>{activeEvent.durationMs ? formatDuration(activeEvent.durationMs) : '未记录'}</dd>
                </div>
              </dl>

              <div className="observatory__targets">
                <span>影响范围</span>
                {activeEvent.targets.length > 0 ? (
                  activeEvent.targets.map((target) => <code key={target}>{target}</code>)
                ) : (
                  <small>该事件没有文件目标</small>
                )}
              </div>

              <div className="observatory__source-refs">
                <span>源码定位</span>
                {activeEvent.sourceRefs.length > 0 ? (
                  <div>
                    {activeEvent.sourceRefs.map((ref) => (
                      <button
                        key={`${ref.file}-${ref.symbol}`}
                        type="button"
                        onClick={() => setSelectedRef(ref)}
                        aria-pressed={
                          selectedRef?.file === ref.file && selectedRef.symbol === ref.symbol
                        }
                      >
                        <Code2 size={14} aria-hidden="true" />
                        {ref.symbol}
                      </button>
                    ))}
                  </div>
                ) : (
                  <small>没有绑定的源码符号</small>
                )}
              </div>
            </>
          ) : null}
        </section>

        <section className="observatory__source-panel" aria-labelledby="source-heading">
          <div className="observatory__panel-heading">
            <div>
              <p>SOURCE EXPLORER</p>
              <h2 id="source-heading">原始产品源码</h2>
            </div>
            <span className="observatory__verified">
              <ShieldCheck size={14} aria-hidden="true" />
              构建期哈希
            </span>
          </div>

          <div className="observatory__source-tabs" aria-label="源码文件">
            {snapshot.sources.map((source) => (
              <button
                key={source.path}
                type="button"
                aria-pressed={selectedSource?.path === source.path}
                onClick={() => {
                  const firstSymbol = activeEvent?.sourceRefs.find((ref) => ref.file === source.path)
                  setSelectedRef(
                    firstSymbol ?? {
                      file: source.path,
                      symbol: 'file',
                      startLine: 1,
                      endLine: Math.min(12, source.lines.length),
                    },
                  )
                }}
              >
                {source.path.split('/').at(-1)}
              </button>
            ))}
          </div>

          <div className="observatory__source-meta">
            <code>{selectedSource?.path ?? '暂无源码'}</code>
            <span>
              <Gauge size={13} aria-hidden="true" />
              {selectedSource?.lines.length ?? 0} lines
            </span>
          </div>

          <div className="observatory__code" role="region" aria-label="源代码">
            <pre>
              <code>
                {(selectedSource?.lines ?? []).map((line, index) => {
                  const lineNumber = index + 1
                  const highlighted = Boolean(
                    selectedRef &&
                      selectedRef.file === selectedSource?.path &&
                      lineNumber >= selectedRef.startLine &&
                      lineNumber <= selectedRef.endLine,
                  )
                  return (
                    <span
                      key={lineNumber}
                      className={highlighted ? 'is-highlighted' : undefined}
                      data-testid={`source-line-${lineNumber}`}
                      data-highlighted={highlighted ? 'true' : 'false'}
                    >
                      <i aria-hidden="true">{lineNumber}</i>
                      {line || ' '}
                      {'\n'}
                    </span>
                  )
                })}
              </code>
            </pre>
          </div>
        </section>
      </div>

      <footer className="observatory__footnote">
        <Clock3 size={15} aria-hidden="true" />
        <span>
          快照生成于 {new Date(snapshot.generatedAt).toLocaleString('zh-CN')}。运行 ID：
          <code>{snapshot.runId}</code>。产品入口：
          <a href={snapshot.product.route}>打开矩阵实验室</a>
        </span>
      </footer>
    </div>
  )
}
