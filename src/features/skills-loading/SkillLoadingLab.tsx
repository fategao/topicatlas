import {
  ArrowDownToLine,
  ArrowUpRight,
  BookOpen,
  Braces,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Code2,
  Database,
  FileText,
  Gauge,
  Layers3,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Terminal,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type {
  LoadLevel,
  SkillsLoadingSnapshot,
  SkillTraceEvent,
} from '../../data/skills-loading/types'
import {
  LEVEL_LABELS,
  OBSERVABILITY_LABELS,
  cumulativeContextTokens,
  formatCount,
  loadedFiles,
  usageTotal,
} from '../../data/skills-loading/trace'
import './skills-loading.css'

type SkillLoadingLabProps = {
  snapshot: SkillsLoadingSnapshot
}

const LEVELS: Array<{
  level: LoadLevel
  title: string
  body: string
  icon: typeof Layers3
}> = [
  {
    level: 'metadata',
    title: 'Level 1 · 目录常驻',
    body: '名称与描述先进入初始技能索引，模型据此决定是否调用。',
    icon: Database,
  },
  {
    level: 'instructions',
    title: 'Level 2 · 正文按需',
    body: '请求命中后，完整 SKILL.md 才进入上下文，流程和边界在这一层生效。',
    icon: FileText,
  },
  {
    level: 'reference',
    title: 'Level 3 · 资源按需',
    body: '引用文档只在任务需要时读取；未访问文件不占上下文。',
    icon: BookOpen,
  },
  {
    level: 'script',
    title: 'Level 3 · 脚本执行',
    body: '脚本代码留在文件系统，模型只接收命令输出，不读取源码正文。',
    icon: Terminal,
  },
]

const EVENT_ICONS = {
  turn: CircleDot,
  metadata: Database,
  selection: ArrowDownToLine,
  read: FileText,
  execute: Terminal,
  message: BookOpen,
  usage: Gauge,
} satisfies Record<SkillTraceEvent['kind'], typeof CircleDot>

function eventFileLabel(event: SkillTraceEvent): string {
  return event.file?.split('/').at(-1) ?? LEVEL_LABELS[event.level]
}

export function SkillLoadingLab({ snapshot }: SkillLoadingLabProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const activeEvent = snapshot.events[activeIndex] ?? snapshot.events[0]
  const activeLoadedFiles = useMemo(
    () => loadedFiles(snapshot.events, activeIndex),
    [activeIndex, snapshot.events],
  )
  const contextTokens = cumulativeContextTokens(snapshot.events, activeIndex)
  const totalUsage = usageTotal(snapshot.usage)
  const activeFile = snapshot.skill.files.find((file) => file.path === activeEvent?.file)
  const fallbackPressure =
    snapshot.index.metadataChars > 8_000
      ? `${formatCount(snapshot.index.metadataChars - 8_000)} chars above fallback`
      : `${formatCount(8_000 - snapshot.index.metadataChars)} chars below fallback`

  useEffect(() => {
    if (!playing) return
    if (activeIndex >= snapshot.events.length - 1) {
      setPlaying(false)
      return
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setPlaying(false)
      return
    }
    const timer = window.setTimeout(() => setActiveIndex((index) => index + 1), 1_250)
    return () => window.clearTimeout(timer)
  }, [activeIndex, playing, snapshot.events.length])

  function selectEvent(index: number) {
    setActiveIndex(Math.min(snapshot.events.length - 1, Math.max(0, index)))
    setPlaying(false)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      selectEvent(activeIndex - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      selectEvent(activeIndex + 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      selectEvent(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      selectEvent(snapshot.events.length - 1)
    }
  }

  return (
    <div className="skills-lab">
      <header className="skills-lab__runbar">
        <div className="skills-lab__run-copy">
          <p className="skills-lab__eyebrow">{snapshot.label} / STATIC REPLAY</p>
          <h1>技能不是一开始就全部读进上下文</h1>
          <p>
            一次真实 Codex turn 被拆成可审计事件：先看到技能索引，显式命中后才读取
            <code> SKILL.md</code>，再按需加载引用文件并执行脚本。页面不连接模型，只回放已提交的快照。
          </p>
          <div className="skills-lab__run-tags" aria-label="运行标签">
            <span>{snapshot.provider}</span>
            <span>{snapshot.model}</span>
            <span>reasoning {snapshot.reasoningEffort}</span>
            <span>{snapshot.environment.sandbox}</span>
          </div>
        </div>

        <dl className="skills-lab__metrics" aria-label="运行指标">
          <div>
            <dt>EVENTS</dt>
            <dd>{snapshot.events.length}</dd>
            <small>真实事件顺序</small>
          </div>
          <div>
            <dt>SKILL FILES</dt>
            <dd>{snapshot.skill.files.length}</dd>
            <small>正文 / 引用 / 脚本 / 示例</small>
          </div>
          <div>
            <dt>INDEX SCAN</dt>
            <dd>{snapshot.index.scannedSkillFiles}</dd>
            <small>SKILL.md frontmatter</small>
          </div>
          <div>
            <dt>PROVIDER TOTAL</dt>
            <dd>{formatCount(totalUsage)}</dd>
            <small>input + cached + output</small>
          </div>
        </dl>
      </header>

      <div className="skills-lab__evidence-strip">
        <ShieldCheck size={15} aria-hidden="true" />
        <span>数据边界</span>
        <strong>真实 command execution + provider usage</strong>
        <small>系统提示索引按官方规则说明，完整原始 prompt 未伪装成已捕获。</small>
        <a href={snapshot.sources[0]?.url} target="_blank" rel="noreferrer">
          OpenAI Skills 文档
          <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      </div>

      <section className="skills-lab__ladder" aria-labelledby="loading-ladder-heading">
        <div className="skills-lab__section-head">
          <div>
            <p>PROGRESSIVE DISCLOSURE</p>
            <h2 id="loading-ladder-heading">四层加载，成本逐层发生</h2>
          </div>
          <span className="skills-lab__verified">
            <Check size={14} aria-hidden="true" />
            {snapshot.skill.name}
          </span>
        </div>
        <div className="skills-lab__levels">
          {LEVELS.map((item, index) => {
            const Icon = item.icon
            return (
              <article key={item.level} className={`skills-lab__level is-${item.level}`}>
                <span className="skills-lab__level-index">0{index + 1}</span>
                <Icon size={18} aria-hidden="true" />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section
        className="skills-lab__workbench"
        aria-labelledby="trace-heading"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        data-testid="skills-load-workbench"
      >
        <div className="skills-lab__section-head">
          <div>
            <p>RECORDED TRACE</p>
            <h2 id="trace-heading">沿一次真实调用逐层展开</h2>
          </div>
          <div className="skills-lab__transport">
            <button
              type="button"
              className="skills-lab__icon-btn"
              onClick={() => selectEvent(0)}
              aria-label="回到第一个事件"
            >
              <RotateCcw size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="skills-lab__icon-btn"
              onClick={() => selectEvent(activeIndex - 1)}
              aria-label="上一个事件"
              disabled={activeIndex === 0}
            >
              <ChevronLeft size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="skills-lab__play"
              onClick={() => {
                if (activeIndex === snapshot.events.length - 1) setActiveIndex(0)
                setPlaying((value) => !value)
              }}
              aria-label={playing ? '暂停轨迹回放' : '播放轨迹回放'}
              aria-pressed={playing}
            >
              {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
              {playing ? '暂停' : '播放'}
            </button>
            <button
              type="button"
              className="skills-lab__icon-btn"
              onClick={() => selectEvent(activeIndex + 1)}
              aria-label="下一个事件"
              disabled={activeIndex === snapshot.events.length - 1}
            >
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="skills-lab__scrubber">
          <span>
            STEP {String(activeIndex + 1).padStart(2, '0')} /{' '}
            {String(snapshot.events.length).padStart(2, '0')}
          </span>
          <div aria-hidden="true">
            {snapshot.events.map((event, index) => (
              <i key={event.id} className={index <= activeIndex ? 'is-past' : undefined} />
            ))}
          </div>
          <span data-testid="skills-load-context-total">
            CONTEXT ≈ {formatCount(contextTokens)} TOKEN
          </span>
        </div>

        <div className="skills-lab__grid">
          <div className="skills-lab__event-panel">
            <div className="skills-lab__panel-heading">
              <div>
                <p>EVENT RAIL</p>
                <h3>加载事件</h3>
              </div>
              <small>点击或使用 ← →</small>
            </div>
            <ol className="skills-lab__event-list" data-testid="skills-load-event-list">
              {snapshot.events.map((event, index) => {
                const Icon = EVENT_ICONS[event.kind]
                return (
                  <li key={event.id}>
                    <button
                      type="button"
                      className={index === activeIndex ? 'is-active' : undefined}
                      aria-pressed={index === activeIndex}
                      onClick={() => selectEvent(index)}
                    >
                      <span className="skills-lab__event-dot">
                        <Icon size={14} aria-hidden="true" />
                      </span>
                      <span className="skills-lab__event-copy">
                        <strong>{event.title}</strong>
                        <small>
                          {LEVEL_LABELS[event.level]} · {eventFileLabel(event)}
                        </small>
                      </span>
                      <span className={`skills-lab__observability is-${event.observability}`}>
                        {OBSERVABILITY_LABELS[event.observability]}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>

          <article className="skills-lab__inspector" data-testid="skills-load-active-event">
            <div className="skills-lab__panel-heading">
              <div>
                <p>EVENT INSPECTOR</p>
                <h3>{activeEvent.title}</h3>
              </div>
              <span className={`skills-lab__observability is-${activeEvent.observability}`}>
                {OBSERVABILITY_LABELS[activeEvent.observability]}
              </span>
            </div>

            <dl className="skills-lab__event-meta">
              <div>
                <dt>LOAD LEVEL</dt>
                <dd>{LEVEL_LABELS[activeEvent.level]}</dd>
              </div>
              <div>
                <dt>EVIDENCE</dt>
                <dd>{activeEvent.observability}</dd>
              </div>
              <div>
                <dt>STATUS</dt>
                <dd>{activeEvent.status}</dd>
              </div>
            </dl>

            <p className="skills-lab__event-summary">{activeEvent.summary}</p>

            {activeEvent.command ? (
              <div className="skills-lab__code-block">
                <span>COMMAND</span>
                <pre>{activeEvent.command}</pre>
              </div>
            ) : null}

            {activeEvent.outputExcerpt ? (
              <div className="skills-lab__code-block">
                <span>{activeEvent.kind === 'message' ? 'VISIBLE OUTPUT' : 'OBSERVED OUTPUT'}</span>
                <pre>{activeEvent.outputExcerpt}</pre>
              </div>
            ) : null}

            {activeFile ? (
              <div className="skills-lab__file-preview">
                <span>
                  <Code2 size={14} aria-hidden="true" />
                  {activeFile.path}
                </span>
                <p>{activeFile.excerpt}</p>
              </div>
            ) : null}

            <div className="skills-lab__added-context">
              <span>THIS EVENT ADDED</span>
              <strong>
                {activeEvent.contextTokensAdded > 0
                  ? `≈ ${formatCount(activeEvent.contextTokensAdded)} token`
                  : '0 token'}
              </strong>
              <small>
                {activeEvent.tokenLabel === 'provider'
                  ? 'provider 字段，逐项展示'
                  : `${formatCount(activeEvent.contextCharsAdded)} chars / 4`}
              </small>
            </div>
          </article>

          <aside className="skills-lab__files">
            <div className="skills-lab__panel-heading">
              <div>
                <p>SKILL PACKAGE</p>
                <h3>文件加载状态</h3>
              </div>
              <span>{activeLoadedFiles.size}/{snapshot.skill.files.length}</span>
            </div>

            <div className="skills-lab__budget" data-testid="skills-load-metadata-budget">
              <div>
                <span>初始索引规模</span>
                <strong>≈ {formatCount(snapshot.index.estimatedTokens)} token</strong>
              </div>
              <div className="skills-lab__budget-bar" aria-hidden="true">
                <i style={{ width: `${Math.min(100, (snapshot.index.metadataChars / 35_318) * 100)}%` }} />
                <b style={{ left: `${Math.min(96, (8_000 / 35_318) * 100)}%` }} />
              </div>
              <small>
                {formatCount(snapshot.index.metadataChars)} chars · {fallbackPressure}
              </small>
              <p>{snapshot.index.rule}</p>
            </div>

            <ul className="skills-lab__file-tree">
              <li className="skills-lab__folder">release-brief-auditor/</li>
              {snapshot.skill.files.map((file) => {
                const fullPath = `${snapshot.skill.path}/${file.path}`
                const loaded = activeLoadedFiles.has(fullPath)
                return (
                  <li
                    key={file.path}
                    className={loaded ? 'is-loaded' : undefined}
                    data-testid={`skills-load-file-${fullPath.replaceAll('/', '-')}`}
                  >
                    <span>
                      {file.kind === 'script' ? (
                        <Terminal size={13} aria-hidden="true" />
                      ) : (
                        <FileText size={13} aria-hidden="true" />
                      )}
                      {file.path}
                    </span>
                    <small>
                      {loaded ? 'loaded' : 'idle'} · {formatCount(file.bytes)} B
                    </small>
                  </li>
                )
              })}
            </ul>

            <div className="skills-lab__boundary-note">
              <Braces size={16} aria-hidden="true" />
              <p>
                脚本 <code>{snapshot.skill.files.find((file) => file.kind === 'script')?.path}</code>
                的代码正文没有作为工具结果返回；这里只观测命令和输出。
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="skills-lab__usage" aria-labelledby="usage-heading">
        <div>
          <p>PROVIDER USAGE</p>
          <h2 id="usage-heading">不做“总 token”猜测</h2>
          <p>
            Codex 原始 usage 字段分开呈现。cached input 与 input 不在这里合并成看似精确的单一数字；
            reasoning output 也不重复计入可见回答。
          </p>
        </div>
        <dl>
          <div>
            <dt>INPUT</dt>
            <dd>{formatCount(snapshot.usage.inputTokens)}</dd>
          </div>
          <div>
            <dt>CACHED INPUT</dt>
            <dd>{formatCount(snapshot.usage.cachedInputTokens)}</dd>
          </div>
          <div>
            <dt>CACHE WRITE</dt>
            <dd>{formatCount(snapshot.usage.cacheWriteInputTokens)}</dd>
          </div>
          <div>
            <dt>OUTPUT</dt>
            <dd>{formatCount(snapshot.usage.outputTokens)}</dd>
          </div>
          <div>
            <dt>REASONING</dt>
            <dd>{formatCount(snapshot.usage.reasoningOutputTokens)}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
