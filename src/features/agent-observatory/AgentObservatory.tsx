import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Code2,
  Database,
  ExternalLink,
  FileCode2,
  GitBranch,
  Gauge,
  Layers,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Terminal,
  Timer,
  Wrench,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type {
  AgentRun,
  Composition,
  ContextEvent,
  ContextSourceKind,
  ObservatorySnapshot,
  SourceRef,
  ToolCall,
  TraceLoop,
  TraceStep,
} from './types'
import {
  COMPOSITION_SEGMENTS,
  buildFlatSteps,
  compositionMax,
  formatClock,
  formatCount,
  formatDateTime,
  formatDuration,
  formatPercent,
  loopDuration,
  stepFailed,
  stepToolCount,
  tokenTotal,
} from './trace'
import './agent-observatory.css'

type AgentObservatoryProps = {
  snapshot: ObservatorySnapshot | null
}

const CONTEXT_KIND_LABELS: Record<ContextSourceKind, string> = {
  memory: '长期记忆',
  system: '系统提示',
  environment: '环境',
  tools: '工具声明',
  injection: '注入上下文',
  compaction: '压缩',
  subagent: '子代理',
  note: '口径说明',
}

const CONTEXT_EVENT_LABELS: Record<ContextEvent['kind'], string> = {
  injection: '注入',
  compaction: '压缩',
  failure: '失败',
  subagent: '派生',
}

const CONTEXT_EVENT_ICONS = {
  injection: Layers,
  compaction: ScanLine,
  failure: CircleAlert,
  subagent: GitBranch,
} satisfies Record<ContextEvent['kind'], typeof Bot>

const CONTEXT_SOURCE_ICONS = {
  memory: Database,
  system: Bot,
  environment: Terminal,
  tools: Wrench,
  injection: Layers,
  compaction: ScanLine,
  subagent: GitBranch,
  note: Database,
} satisfies Record<ContextSourceKind, typeof Bot>

function compactNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return String(value)
}

function headlineFor(run: AgentRun): string {
  return run.id === 'cctrace-reference'
    ? '一次真实修复，被完整摊开'
    : '一次真实构建，被完整摊开'
}

function loopToolCount(loop: TraceLoop): number {
  return loop.steps.reduce((sum, step) => sum + stepToolCount(step), 0)
}

function stepTitle(step: TraceStep): string {
  if (step.title) return step.title
  const firstLine = step.reply.split(/[。\n]/).find((line) => line.trim())
  if (firstLine) {
    return firstLine
      .replace(/^#+\s*/, '')
      .replace(/\*\*/g, '')
      .replace(/`/g, '')
      .slice(0, 96)
  }
  const preview = step.toolCalls[0]?.preview
  if (preview) return preview
  return `Step ${step.ordinal ?? '—'}`
}

function defaultLoop(run: AgentRun): TraceLoop | undefined {
  return (
    run.loops.find((loop) => loop.id === 'q3-fix' && loop.steps.length > 0) ??
    [...run.loops].sort((left, right) => right.steps.length - left.steps.length)[0]
  )
}

function findStep(run: AgentRun, stepId: string): { loop: TraceLoop; step: TraceStep } | null {
  for (const loop of run.loops) {
    const step = loop.steps.find((item) => item.id === stepId)
    if (step) return { loop, step }
  }
  return null
}

function tokenSourceLabel(source: string): string {
  return source === 'provider' ? 'provider' : '估算'
}

export function AgentObservatory({ snapshot }: AgentObservatoryProps) {
  const runs = snapshot?.runs ?? []
  const initialRun =
    runs.find((run) => run.id === 'cctrace-reference') ?? runs[0] ?? null
  const initialLoop = initialRun ? defaultLoop(initialRun) : undefined

  const [activeRunId, setActiveRunId] = useState(initialRun?.id ?? '')
  const [activeLoopId, setActiveLoopId] = useState(initialLoop?.id ?? '')
  const [activeStepId, setActiveStepId] = useState(initialLoop?.steps[0]?.id ?? '')
  const [activeToolId, setActiveToolId] = useState<string | null>(null)
  const [activeContextId, setActiveContextId] = useState<string | null>(null)
  const [activeContextSourceId, setActiveContextSourceId] = useState(
    initialRun?.context[0]?.id ?? '',
  )
  const [activeSourcePath, setActiveSourcePath] = useState(initialRun?.sources[0]?.path ?? '')
  const [selectedRef, setSelectedRef] = useState<SourceRef | null>(null)
  const [activeToolFilter, setActiveToolFilter] = useState('all')
  const [focusLoop, setFocusLoop] = useState(false)
  const [playing, setPlaying] = useState(false)

  const activeRun =
    runs.find((run) => run.id === activeRunId) ?? initialRun ?? null
  const flatSteps = useMemo(
    () => (activeRun ? buildFlatSteps(activeRun) : []),
    [activeRun],
  )
  const foundStep =
    activeRun && activeStepId ? findStep(activeRun, activeStepId) : null
  const activeStep =
    foundStep ??
    (flatSteps[0] ? { loop: flatSteps[0].loop, step: flatSteps[0].step } : null)
  const activeLoop =
    activeRun?.loops.find((loop) => loop.id === activeLoopId) ??
    activeStep?.loop ??
    activeRun?.loops[0] ??
    null
  const activeTool =
    activeStep?.step.toolCalls.find((tool) => tool.id === activeToolId) ?? null
  const activeContextEvent =
    activeRun?.loops
      .flatMap((loop) => loop.contextEvents)
      .find((event) => event.id === activeContextId) ?? null
  const activeContextSource =
    activeRun?.context.find((source) => source.id === activeContextSourceId) ??
    activeRun?.context[0] ??
    null
  const activeStepIndex = Math.max(
    0,
    flatSteps.findIndex((item) => item.step.id === activeStep?.step.id),
  )
  const activeSource =
    activeRun?.sources.find((source) => source.path === activeSourcePath) ??
    activeRun?.sources[0] ??
    null
  const stepRefs = activeStep?.step.sourceRefs ?? []
  const focusedRef =
    stepRefs.find(
      (ref) =>
        selectedRef?.file === ref.file && selectedRef.symbol === ref.symbol,
    ) ?? stepRefs[0] ?? null

  useEffect(() => {
    if (!playing || flatSteps.length < 2) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setPlaying(false)
      return
    }
    const timer = window.setTimeout(() => {
      const current = flatSteps.findIndex((item) => item.step.id === activeStep?.step.id)
      const next = flatSteps[current + 1]
      if (!next) {
        setPlaying(false)
        return
      }
      setActiveLoopId(next.loop.id)
      setActiveStepId(next.step.id)
      setActiveToolId(null)
      setActiveContextId(null)
    }, 1_250)
    return () => window.clearTimeout(timer)
  }, [playing, activeStep?.step.id, flatSteps])

  function switchRun(run: AgentRun) {
    const loop = defaultLoop(run)
    setActiveRunId(run.id)
    setActiveLoopId(loop?.id ?? '')
    setActiveStepId(loop?.steps[0]?.id ?? '')
    setActiveToolId(null)
    setActiveContextId(null)
    setActiveContextSourceId(run.context[0]?.id ?? '')
    setActiveSourcePath(run.sources[0]?.path ?? '')
    setSelectedRef(null)
    setActiveToolFilter('all')
    setFocusLoop(false)
    setPlaying(false)
  }

  function selectLoop(loop: TraceLoop) {
    setActiveLoopId(loop.id)
    setActiveStepId(loop.steps[0]?.id ?? '')
    setActiveToolId(null)
    setActiveContextId(null)
    setPlaying(false)
  }

  function selectStep(loop: TraceLoop, step: TraceStep) {
    setActiveLoopId(loop.id)
    setActiveStepId(step.id)
    setActiveToolId(null)
    setActiveContextId(null)
    setPlaying(false)
  }

  function selectTool(loop: TraceLoop, step: TraceStep, tool: ToolCall) {
    setActiveLoopId(loop.id)
    setActiveStepId(step.id)
    setActiveToolId(tool.id)
    setActiveContextId(null)
    setPlaying(false)
  }

  function selectContext(loop: TraceLoop, event: ContextEvent) {
    setActiveLoopId(loop.id)
    setActiveStepId(event.stepId ?? loop.steps[0]?.id ?? '')
    setActiveToolId(null)
    setActiveContextId(event.id)
    setPlaying(false)
  }

  function changeToolFilter(name: string) {
    setActiveToolFilter(name)
    setActiveToolId(null)
    setPlaying(false)
    if (!activeRun) return
    const loop = activeRun.loops.find((item) =>
      item.steps.some((step) =>
        name === 'all' || step.toolCalls.some((tool) => tool.name === name),
      ),
    )
    const step =
      loop?.steps.find((item) =>
        name === 'all' || item.toolCalls.some((tool) => tool.name === name),
      ) ?? loop?.steps[0]
    if (loop && step) {
      setActiveLoopId(loop.id)
      setActiveStepId(step.id)
    }
  }

  function jumpTo(index: number) {
    const next = flatSteps[index]
    if (!next) return
    setActiveLoopId(next.loop.id)
    setActiveStepId(next.step.id)
    setActiveToolId(null)
    setActiveContextId(null)
    setPlaying(false)
  }

  if (!snapshot || !activeRun || !activeStep) {
    return (
      <section className="observatory-empty">
        <div role="alert">
          <AlertTriangle size={22} aria-hidden="true" />
          <div>
            <h2>运行快照不可用</h2>
            <p>
              监控数据缺失时页面不会伪造事件。请先运行构建前快照脚本，再重新构建站点。
            </p>
          </div>
        </div>
        <a className="btn btn-primary" href="/agent-observatory/matrix-lab">
          打开矩阵实验室
        </a>
      </section>
    )
  }

  const loopsForTimeline = focusLoop
    ? activeRun.loops.filter(
        (loop) => loop.id === activeLoop?.id || loop.parentLoopId === activeLoop?.id,
      )
    : activeRun.loops
  const allStart = Math.min(
    ...loopsForTimeline.map((loop) => Date.parse(loop.startedAt)).filter(Number.isFinite),
  )
  const allEnd = Math.max(
    ...loopsForTimeline.map((loop) => Date.parse(loop.endedAt)).filter(Number.isFinite),
  )
  const domainStart = focusLoop && activeLoop ? Date.parse(activeLoop.startedAt) : allStart
  const domainEnd = focusLoop && activeLoop ? Date.parse(activeLoop.endedAt) : allEnd
  const domainSpan = Math.max(1, domainEnd - domainStart)
  const token = activeRun.metrics.token
  const toolFilterOptions: Array<{ name: string; label: string; count: number }> = [
    { name: 'all', label: '全部工具', count: activeRun.metrics.toolCallCount },
    ...activeRun.metrics.toolNames.map((tool) => ({
      name: tool.name,
      label: tool.name,
      count: tool.count,
    })),
  ]
  const visibleLoops = activeRun.loops
    .map((loop) => ({
      loop,
      steps: loop.steps.filter(
        (step) =>
          activeToolFilter === 'all' ||
          step.toolCalls.some((tool) => tool.name === activeToolFilter),
      ),
    }))
    .filter(({ steps }) => steps.length > 0)
  const inspectorTitle = activeTool
    ? activeTool.preview || activeTool.name
    : activeContextEvent
      ? activeContextEvent.label
      : stepTitle(activeStep.step)
  const inspectorEyebrow = activeTool
    ? 'TOOL INSPECTOR'
    : activeContextEvent
      ? 'CONTEXT INSPECTOR'
      : 'STEP INSPECTOR'

  return (
    <div className="observatory">
      <header className="observatory__runbar">
        <div className="observatory__runcopy">
          <p className="observatory__eyebrow">
            {activeRun.sourceKind === 'cctrace-public-sample'
              ? 'CCTRACE SAMPLE / RECORDED REPLAY'
              : 'CODEX RUN / NORMALIZED REPLAY'}
          </p>
          <div className="observatory__runtitle">
            <h1>{headlineFor(activeRun)}</h1>
            <span
              className={`observatory__status is-${activeRun.status}`}
              data-testid="run-status"
            >
              {activeRun.status === 'completed' ? (
                <Check size={14} aria-hidden="true" />
              ) : (
                <CircleAlert size={14} aria-hidden="true" />
              )}
              {activeRun.status === 'completed' ? '已完成' : '失败'}
            </span>
          </div>
          <p className="observatory__lede">{activeRun.subtitle}</p>

          <div
            className="observatory__run-tabs"
            role="tablist"
            aria-label="选择运行快照"
            data-testid="run-tabs"
          >
            {runs.map((run) => (
              <button
                key={run.id}
                type="button"
                role="tab"
                aria-selected={run.id === activeRun.id}
                onClick={() => switchRun(run)}
              >
                <strong>{run.shortLabel}</strong>
                <small>
                  {run.provider} · {run.model}
                </small>
              </button>
            ))}
          </div>

          <p className="observatory__disclaimer">
            {snapshot.disclaimer}
          </p>
        </div>

        <dl className="observatory__metrics" aria-label="运行指标">
          <div>
            <dt>PROVIDER / MODEL</dt>
            <dd title={activeRun.modelIds.join(', ')}>
              {activeRun.model}
              <small>
                {activeRun.modelIds.length > 1
                  ? `${activeRun.modelIds.length} 个模型 · ${activeRun.provider}`
                  : activeRun.provider}
              </small>
            </dd>
          </div>
          <div>
            <dt>墙钟耗时</dt>
            <dd>
              {formatDuration(activeRun.metrics.durationMs)}
              <small>
                {activeRun.timeScale === 'recorded' ? 'wire 时间戳' : '归一化回放'}
              </small>
            </dd>
          </div>
          <div>
            <dt>LOOP / STEP</dt>
            <dd>
              {activeRun.metrics.loopCount} / {activeRun.metrics.stepCount}
              <small>
                子代理 {activeRun.metrics.subagentCount} · 请求 {activeRun.metrics.requestCount}
              </small>
            </dd>
          </div>
          <div>
            <dt>工具调用</dt>
            <dd>
              {activeRun.metrics.toolCallCount}
              <small>
                {activeRun.metrics.sampledToolCallCount === activeRun.metrics.toolCallCount
                  ? '快照内可点击'
                  : `快照保留 ${activeRun.metrics.sampledToolCallCount} 条`}
              </small>
            </dd>
          </div>
          <div>
            <dt>TOKEN</dt>
            <dd title={formatCount(token.total)}>
              {compactNumber(token.total)}
              <small>{tokenSourceLabel(token.source)}</small>
            </dd>
          </div>
          <div>
            <dt>缓存读 / 写</dt>
            <dd>
              {compactNumber(token.cacheRead)} / {compactNumber(token.cacheWrite)}
              <small>{token.source === 'provider' ? 'provider usage' : '无 provider usage'}</small>
            </dd>
          </div>
        </dl>
      </header>

      <div className="observatory__source-strip">
        <span>
          <Database size={14} aria-hidden="true" />
          数据来源
        </span>
        <strong>
          {activeRun.sourceKind === 'cctrace-public-sample'
            ? 'cctrace 官方公开样例 · 真实 Claude Code 会话'
            : '本项目 Codex JSONL · 构建期脱敏快照'}
        </strong>
        <small>
          {activeRun.timeScale === 'recorded' ? '真实墙钟' : '时间轴已归一化'} ·{' '}
          {activeRun.tokenSource === 'provider' ? 'token 来自 provider usage' : 'token 为估算'}
        </small>
        {activeRun.product ? (
          <a href={activeRun.product.route}>
            打开 {activeRun.product.name}
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        ) : (
          <a href={snapshot.reference.repoUrl} target="_blank" rel="noreferrer">
            cctrace 源码
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        )}
      </div>

      {activeRun.monitor ? (
        <aside className="observatory__monitor-note" aria-label="监控 Agent 结论">
          <div>
            <Bot size={17} aria-hidden="true" />
            <span>监控 Agent 结论</span>
            <small>{activeRun.monitor.model}</small>
          </div>
          <p>{activeRun.monitor.summary}</p>
          <ul>
            {activeRun.monitor.observations.map((observation) => (
              <li key={observation}>{observation}</li>
            ))}
          </ul>
        </aside>
      ) : null}

      <section
        className="observatory__trajectory"
        aria-labelledby="trajectory-heading"
        data-testid="trajectory"
      >
        <div className="observatory__section-head">
          <div>
            <p>SESSION TRAJECTORY</p>
            <h2 id="trajectory-heading">循环、模型 step 与工具间隔</h2>
          </div>
          <div className="observatory__transport">
            <button
              type="button"
              className="observatory__icon-btn"
              onClick={() => jumpTo(0)}
              aria-label="回到第一条 step"
            >
              <RotateCcw size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="observatory__icon-btn"
              onClick={() => jumpTo(Math.max(0, activeStepIndex - 1))}
              aria-label="上一条 step"
            >
              <SkipBack size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="observatory__play"
              onClick={() => setPlaying((value) => !value)}
              aria-label={playing ? '暂停回放' : '播放回放'}
              aria-pressed={playing}
            >
              {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
              {playing ? '暂停' : '播放'}
            </button>
            <button
              type="button"
              className="observatory__icon-btn"
              onClick={() => jumpTo(Math.min(flatSteps.length - 1, activeStepIndex + 1))}
              aria-label="下一条 step"
            >
              <SkipForward size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="observatory__ruler" aria-hidden="true">
          <span>{formatClock(new Date(domainStart).toISOString())}</span>
          <div>
            <i />
            <i />
            <i />
            <i />
          </div>
          <span>{formatClock(new Date(domainEnd).toISOString())}</span>
        </div>

        <div className="observatory__timeline" role="list" aria-label="轨迹时间轴">
          {loopsForTimeline.map((loop) => (
            <article
              key={loop.id}
              className={`observatory__lane ${loop.kind === 'subagent' ? 'is-subagent' : ''}`}
              role="listitem"
            >
              <button
                type="button"
                className={`observatory__lane-label ${
                  activeLoop?.id === loop.id ? 'is-active' : ''
                }`}
                onClick={() => selectLoop(loop)}
                aria-pressed={activeLoop?.id === loop.id}
              >
                <span className={`observatory__lane-dot ${loop.kind === 'subagent' ? 'is-agent' : ''}`} />
                <strong>{loop.label}</strong>
                <small>
                  {loop.steps.length} step · {loopToolCount(loop)} tools ·{' '}
                  {formatDuration(loopDuration(loop))}
                </small>
              </button>

              <div className="observatory__track">
                <div className="observatory__markers">
                  {loop.contextEvents.map((event) => {
                    const Icon = CONTEXT_EVENT_ICONS[event.kind]
                    const left = Math.min(
                      99,
                      Math.max(
                        0,
                        ((Date.parse(event.startedAt) - domainStart) / domainSpan) * 100,
                      ),
                    )
                    return (
                      <button
                        key={event.id}
                        type="button"
                        className={`observatory__marker is-${event.kind} ${
                          activeContextId === event.id ? 'is-active' : ''
                        }`}
                        style={{ left: `${left}%` }}
                        onClick={() => selectContext(loop, event)}
                        aria-label={`${CONTEXT_EVENT_LABELS[event.kind]}：${event.label}`}
                        title={event.label}
                      >
                        <Icon size={11} aria-hidden="true" />
                      </button>
                    )
                  })}
                </div>
                {loop.steps.map((step) => {
                  const start = Date.parse(step.startedAt)
                  const end = Date.parse(step.endedAt)
                  const left = Math.min(
                    99.4,
                    Math.max(0, ((start - domainStart) / domainSpan) * 100),
                  )
                  const width = Math.max(
                    0.55,
                    Math.min(
                      100 - left,
                      ((Math.max(end - start, step.durationMs) || 0) / domainSpan) * 100,
                    ),
                  )
                  const failed = stepFailed(step)
                  const selected = activeStep.step.id === step.id
                  return (
                    <button
                      key={step.id}
                      type="button"
                      className={`observatory__span ${failed ? 'is-failed' : ''} ${
                        selected ? 'is-active' : ''
                      } ${step.role === 'subagent' ? 'is-subagent' : ''}`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      onClick={() => selectStep(loop, step)}
                      aria-label={`${stepTitle(step)} · ${formatClock(step.startedAt)}`}
                      title={`${stepTitle(step)} · ${formatDuration(step.durationMs)}`}
                    >
                      {step.toolCalls.length > 0 ? (
                        <span>{step.toolCalls[0].name}</span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </article>
          ))}
        </div>

        <div className="observatory__legend" aria-label="图例">
          <span><i className="is-model" />模型 step</span>
          <span><i className="is-agent" />子代理</span>
          <span><i className="is-failed" />失败</span>
          <span><i className="is-inject" />注入 / 压缩 / 派生标记</span>
        </div>

        <div className="observatory__scrubber">
          <button
            type="button"
            className="observatory__focus-toggle"
            aria-pressed={focusLoop}
            onClick={() => {
              setFocusLoop((value) => !value)
              setPlaying(false)
            }}
          >
            <Timer size={14} aria-hidden="true" />
            {focusLoop ? '查看全部循环' : '聚焦当前循环'}
          </button>
          <span className="observatory__scrubber-label">
            STEP {activeStepIndex + 1} / {flatSteps.length}
          </span>
          <input
            type="range"
            min="0"
            max={Math.max(0, flatSteps.length - 1)}
            value={activeStepIndex}
            aria-label="轨迹回放进度"
            onChange={(event) => jumpTo(Number(event.target.value))}
          />
          <span className="observatory__scrubber-time">
            {formatClock(activeStep.step.startedAt)}
          </span>
        </div>
      </section>

      <div className="observatory__workspace">
        <section
          className="observatory__outline"
          aria-labelledby="outline-heading"
          data-testid="session-outline"
        >
          <div className="observatory__section-head">
            <div>
              <p>SESSION OUTLINE</p>
              <h2 id="outline-heading">人类请求 → 循环 → step → tool</h2>
            </div>
            <span className="observatory__count">{flatSteps.length} steps</span>
          </div>

          <div className="observatory__tool-filter" role="group" aria-label="按工具筛选">
            {toolFilterOptions.map((option) => (
              <button
                key={option.name}
                type="button"
                aria-pressed={activeToolFilter === option.name}
                onClick={() => changeToolFilter(option.name)}
              >
                {option.label} <span>{option.count}</span>
              </button>
            ))}
          </div>

          <div className="observatory__loops">
            {visibleLoops.map(({ loop, steps }) => (
              <article
                key={loop.id}
                className={`observatory__loop ${
                  loop.kind === 'subagent' ? 'is-subagent' : ''
                }`}
              >
                <button
                  type="button"
                  className={`observatory__loop-head ${
                    activeLoop?.id === loop.id ? 'is-active' : ''
                  }`}
                  onClick={() => selectLoop(loop)}
                  aria-pressed={activeLoop?.id === loop.id}
                >
                  <span className="observatory__loop-ordinal">
                    {loop.kind === 'subagent' ? (
                      <GitBranch size={13} aria-hidden="true" />
                    ) : (
                      String(activeRun.loops.indexOf(loop) + 1).padStart(2, '0')
                    )}
                  </span>
                  <span>
                    <strong>{loop.label}</strong>
                    <small>{loop.prompt}</small>
                  </span>
                  <ChevronRight size={15} aria-hidden="true" />
                </button>

                <ol className="observatory__steps">
                  {steps.map((step) => {
                    const toolCalls =
                      activeToolFilter === 'all'
                        ? step.toolCalls
                        : step.toolCalls.filter((tool) => tool.name === activeToolFilter)
                    const contextEvents = loop.contextEvents.filter(
                      (event) => event.stepId === step.id,
                    )
                    return (
                      <li key={step.id}>
                        <div
                          className={`observatory__step ${
                            activeStep.step.id === step.id ? 'is-active' : ''
                          }`}
                        >
                          <button
                            type="button"
                            className="observatory__step-select"
                            onClick={() => selectStep(loop, step)}
                            aria-pressed={activeStep.step.id === step.id}
                            data-testid={`step-${step.id}`}
                          >
                            <span className={`observatory__step-dot ${stepFailed(step) ? 'is-failed' : ''}`} />
                            <span className="observatory__step-copy">
                              <strong>{stepTitle(step)}</strong>
                              <small>
                                step {step.ordinal ?? '—'} · {formatClock(step.startedAt)} ·{' '}
                                {formatDuration(step.durationMs)} · {step.toolCalls.length} tools
                              </small>
                            </span>
                            <span className={`observatory__badge is-${step.status}`}>
                              {step.status === 'failed'
                                ? '失败'
                                : step.status === 'pending'
                                  ? '等待'
                                  : '通过'}
                            </span>
                          </button>

                          {toolCalls.length > 0 ? (
                            <ul className="observatory__tool-list">
                              {toolCalls.map((tool) => (
                                <li key={tool.id}>
                                  <button
                                    type="button"
                                    className={`observatory__tool ${
                                      activeTool?.id === tool.id ? 'is-active' : ''
                                    } ${tool.status === 'failed' ? 'is-failed' : ''}`}
                                    onClick={() => selectTool(loop, step, tool)}
                                    aria-pressed={activeTool?.id === tool.id}
                                    data-testid={`tool-${tool.id}`}
                                  >
                                    {tool.name === 'Agent' ? (
                                      <Bot size={12} aria-hidden="true" />
                                    ) : tool.name === 'Read' || tool.name === 'Edit' ? (
                                      <FileCode2 size={12} aria-hidden="true" />
                                    ) : (
                                      <Terminal size={12} aria-hidden="true" />
                                    )}
                                    <strong>{tool.name}</strong>
                                    <span>{tool.preview}</span>
                                    <em>{tool.status === 'failed' ? '失败' : tool.status === 'pending' ? '待回执' : '完成'}</em>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : null}

                          {contextEvents.length > 0 ? (
                            <div className="observatory__step-contexts">
                              {contextEvents.map((event) => {
                                const Icon = CONTEXT_EVENT_ICONS[event.kind]
                                return (
                                  <button
                                    key={event.id}
                                    type="button"
                                    className={`observatory__context-chip is-${event.kind} ${
                                      activeContextId === event.id ? 'is-active' : ''
                                    }`}
                                    onClick={() => selectContext(loop, event)}
                                  >
                                    <Icon size={12} aria-hidden="true" />
                                    {event.label}
                                  </button>
                                )
                              })}
                            </div>
                          ) : null}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </article>
            ))}
          </div>
          <p className="observatory__outline-note">
            工具时间继承所在 step；wire 没有为单个调用记录独立耗时。筛选只改变可点击的
            tool 行，不会改写原始数据。
          </p>
        </section>

        <section
          className="observatory__inspector"
          aria-labelledby="inspector-heading"
          aria-live="polite"
          data-testid="active-event"
        >
          <div className="observatory__section-head">
            <div>
              <p>{inspectorEyebrow}</p>
              <h2 id="inspector-heading">{inspectorTitle}</h2>
            </div>
            {activeTool ? (
              <span className={`observatory__badge is-${activeTool.status}`}>
                {activeTool.status === 'failed' ? '失败' : activeTool.status === 'pending' ? '待回执' : '完成'}
              </span>
            ) : activeContextEvent ? (
              <span className={`observatory__badge is-context`}>
                {CONTEXT_EVENT_LABELS[activeContextEvent.kind]}
              </span>
            ) : (
              <span className={`observatory__badge is-${activeStep.step.status}`}>
                {activeStep.step.status === 'failed' ? '失败' : '通过'}
              </span>
            )}
          </div>

          <dl className="observatory__meta">
            <div>
              <dt>循环</dt>
              <dd>{activeStep.loop.label}</dd>
            </div>
            <div>
              <dt>STEP</dt>
              <dd>
                {activeStep.step.ordinal ?? '—'} / {activeStep.loop.steps.length}
              </dd>
            </div>
            <div>
              <dt>模型</dt>
              <dd>{activeStep.step.model}</dd>
            </div>
            <div>
              <dt>时间</dt>
              <dd>
                {formatClock(activeStep.step.startedAt)} → {formatClock(activeStep.step.endedAt)}
              </dd>
            </div>
            <div>
              <dt>STEP 耗时</dt>
              <dd>{formatDuration(activeStep.step.durationMs)}</dd>
            </div>
            <div>
              <dt>token</dt>
              <dd>
                {activeStep.step.tokens
                  ? formatCount(tokenTotal(activeStep.step.tokens))
                  : '未保留 usage'}
              </dd>
            </div>
          </dl>

          {activeTool ? (
            <div className="observatory__tool-detail">
              <div className="observatory__tool-head">
                <span>
                  {activeTool.name === 'Agent' ? (
                    <Bot size={15} aria-hidden="true" />
                  ) : activeTool.name === 'Read' || activeTool.name === 'Edit' ? (
                    <FileCode2 size={15} aria-hidden="true" />
                  ) : (
                    <Terminal size={15} aria-hidden="true" />
                  )}
                  {activeTool.name}
                </span>
                <small>{activeTool.timingSource === 'step' ? '时间继承 step' : ''}</small>
              </div>
              <p>{activeTool.preview}</p>
              <div className="observatory__pre-block">
                <span>INPUT</span>
                <pre>{activeTool.input || '原始输入未保留'}</pre>
              </div>
              <div className="observatory__pre-block">
                <span>RESULT</span>
                <pre>{activeTool.result || '没有匹配到 tool_result；不会补造结果。'}</pre>
              </div>
            </div>
          ) : null}

          {activeContextEvent ? (
            <div className="observatory__context-detail">
              <p>{activeContextEvent.detail}</p>
              <dl className="observatory__context-meta">
                <div>
                  <dt>来源</dt>
                  <dd>{activeContextEvent.source}</dd>
                </div>
                <div>
                  <dt>时间</dt>
                  <dd>{formatDateTime(activeContextEvent.startedAt)}</dd>
                </div>
                {activeContextEvent.fromTurns != null ? (
                  <div>
                    <dt>历史消息</dt>
                    <dd>
                      {activeContextEvent.fromTurns} → {activeContextEvent.toTurns}
                    </dd>
                  </div>
                ) : null}
              </dl>
              {activeContextEvent.targetLoopId ? (
                <button
                  type="button"
                  className="observatory__inline-link"
                  onClick={() => {
                    const target = activeRun.loops.find(
                      (loop) => loop.id === activeContextEvent.targetLoopId,
                    )
                    if (target) selectLoop(target)
                  }}
                >
                  <GitBranch size={13} aria-hidden="true" />
                  跳到子代理分支
                </button>
              ) : null}
            </div>
          ) : null}

          {!activeTool && !activeContextEvent ? (
            <>
              <p className="observatory__reply">
                {activeStep.step.reply || '该 step 没有可公开的文本回复；工具输入与结果仍可逐条检查。'}
              </p>
              {activeStep.step.toolCalls.length > 0 ? (
                <div className="observatory__step-tools" aria-label="本 step 的工具调用">
                  {activeStep.step.toolCalls.map((tool) => (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => selectTool(activeStep.loop, activeStep.step, tool)}
                    >
                      <Wrench size={12} aria-hidden="true" />
                      {tool.name}
                      <span>{tool.status === 'failed' ? '失败' : tool.status === 'pending' ? '待回执' : '完成'}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              {(activeStep.step.targets?.length ?? 0) > 0 ? (
                <div className="observatory__targets">
                  <span>影响范围</span>
                  {activeStep.step.targets?.map((target) => (
                    <code key={target}>{target}</code>
                  ))}
                </div>
              ) : null}
              {stepRefs.length > 0 ? (
                <div className="observatory__source-refs">
                  <span>源码定位</span>
                  <div>
                    {stepRefs.map((ref) => (
                      <button
                        key={`${ref.file}-${ref.symbol}`}
                        type="button"
                        aria-pressed={
                          focusedRef?.file === ref.file &&
                          focusedRef.symbol === ref.symbol
                        }
                        onClick={() => {
                          setSelectedRef(ref)
                          setActiveSourcePath(ref.file)
                        }}
                      >
                        <Code2 size={13} aria-hidden="true" />
                        {ref.symbol}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {activeStep.step.tokens ? (
            <dl className="observatory__token-grid" aria-label="step token 明细">
              <div>
                <dt>INPUT</dt>
                <dd>{formatCount(activeStep.step.tokens.input)}</dd>
              </div>
              <div>
                <dt>OUTPUT</dt>
                <dd>{formatCount(activeStep.step.tokens.output)}</dd>
              </div>
              <div>
                <dt>CACHE READ</dt>
                <dd>{formatCount(activeStep.step.tokens.cacheRead)}</dd>
              </div>
              <div>
                <dt>CACHE WRITE</dt>
                <dd>{formatCount(activeStep.step.tokens.cacheWrite)}</dd>
              </div>
              <div>
                <dt>CACHE HIT</dt>
                <dd>{formatPercent(activeStep.step.tokens.cachePct)}</dd>
              </div>
            </dl>
          ) : null}

          {activeStep.step.composition ? (
            <CompositionView composition={activeStep.step.composition} />
          ) : (
            <p className="observatory__composition-empty">
              这条 run 没有保留上下文分类快照；顶部 token 总量仍按
              {activeRun.tokenSource === 'provider' ? ' provider usage ' : ' chars/4 估算 '}
              展示。
            </p>
          )}
        </section>
      </div>

      <section
        className="observatory__context-panel"
        aria-labelledby="context-heading"
        data-testid="context-panel"
      >
        <div className="observatory__section-head">
          <div>
            <p>MEMORY &amp; CONTEXT</p>
            <h2 id="context-heading">记忆、注入与上下文边界</h2>
          </div>
          <div className="observatory__context-stats">
            <span>
              {activeRun.context.filter((source) => source.kind === 'memory').length} 类记忆
            </span>
            <span>
              {activeRun.context.filter((source) => source.kind === 'injection').length} 类注入
            </span>
            <span>
              {activeRun.context.filter((source) => source.kind === 'compaction').length} 次压缩
            </span>
          </div>
        </div>

        <div className="observatory__context-body">
          <div className="observatory__context-list" aria-label="上下文来源">
            {activeRun.context.map((source) => {
              const Icon = CONTEXT_SOURCE_ICONS[source.kind]
              return (
                <button
                  key={source.id}
                  type="button"
                  className={activeContextSource?.id === source.id ? 'is-active' : ''}
                  onClick={() => setActiveContextSourceId(source.id)}
                  aria-pressed={activeContextSource?.id === source.id}
                >
                  <span className={`observatory__context-icon is-${source.kind}`}>
                    <Icon size={14} aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{source.label}</strong>
                    <small>
                      {CONTEXT_KIND_LABELS[source.kind]} · {formatCount(source.chars)} chars ·{' '}
                      {source.tokens == null ? '未估 token' : `≈${formatCount(source.tokens)} token`}
                    </small>
                  </span>
                </button>
              )
            })}
          </div>

          {activeContextSource ? (
            <div className="observatory__context-detail-card">
              <div className="observatory__panel-heading">
                <div>
                  <p>{CONTEXT_KIND_LABELS[activeContextSource.kind]}</p>
                  <h3>{activeContextSource.label}</h3>
                </div>
                <span className="observatory__count">
                  {formatCount(activeContextSource.chars)} chars
                </span>
              </div>
              {activeContextSource.path ? (
                <code className="observatory__context-path">{activeContextSource.path}</code>
              ) : null}
              <blockquote className="observatory__context-excerpt">
                {activeContextSource.excerpt}
              </blockquote>
              <dl className="observatory__context-meta">
                <div>
                  <dt>来源</dt>
                  <dd>{activeContextSource.source}</dd>
                </div>
                <div>
                  <dt>token 口径</dt>
                  <dd>
                    {activeContextSource.tokens == null
                      ? 'provider 未提供分类'
                      : `chars/4 估算 ≈ ${formatCount(activeContextSource.tokens)}`}
                  </dd>
                </div>
              </dl>
              <p className="observatory__context-note">{activeContextSource.note}</p>
            </div>
          ) : null}
        </div>
        <p className="observatory__outline-note">
          「记忆」指真实进入请求的 CLAUDE.md / 项目规则；页面只保留可审计片段。压缩会把旧历史
          折叠成摘要，之后请求不再携带原文。
        </p>
      </section>

      <div className="observatory__inspect">
        <section className="observatory__provenance" aria-labelledby="provenance-heading">
          <div className="observatory__section-head">
            <div>
              <p>DATA PROVENANCE</p>
              <h2 id="provenance-heading">这条 run 从哪里来</h2>
            </div>
            <span className="observatory__verified">
              <ShieldCheck size={14} aria-hidden="true" />
              构建期快照
            </span>
          </div>

          <dl className="observatory__provenance-meta">
            <div>
              <dt>采集方式</dt>
              <dd>
                {activeRun.sourceKind === 'cctrace-public-sample'
                  ? 'cctrace TLS 代理抓取 Claude Code 请求/响应'
                  : 'Codex CLI --json 事件流'}
              </dd>
            </div>
            <div>
              <dt>采集时间</dt>
              <dd>{formatDateTime(activeRun.capturedAt)}</dd>
            </div>
            <div>
              <dt>时间口径</dt>
              <dd>
                {activeRun.timeScale === 'recorded'
                  ? 'wire 请求/响应时间戳'
                  : '公开快照等间隔归一化'}
              </dd>
            </div>
            <div>
              <dt>token 口径</dt>
              <dd>
                {activeRun.tokenSource === 'provider'
                  ? 'provider usage（input / output / cache）'
                  : 'chars/4 估算，仅作规模参考'}
              </dd>
            </div>
          </dl>

          <ul className="observatory__notes">
            {activeRun.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>

          {activeRun.sourceKind === 'cctrace-public-sample' ? (
            <div className="observatory__reference" data-testid="reference-probes">
              <div className="observatory__reference-head">
                <strong>参考项目与可达性核验</strong>
                <span>{snapshot.reference.license}</span>
              </div>
              {snapshot.reference.probes.map((probe) => (
                <div key={probe.url} className="observatory__probe">
                  <span className={`observatory__probe-status is-${probe.status}`}>
                    {probe.status}
                  </span>
                  <div>
                    <a href={probe.url} target="_blank" rel="noreferrer">
                      {probe.label}
                      <ExternalLink size={12} aria-hidden="true" />
                    </a>
                    <p>{probe.note}</p>
                  </div>
                </div>
              ))}
              <div className="observatory__reference-links">
                {snapshot.reference.links.map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                    {link.label}
                    <ArrowUpRight size={12} aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {activeRun.sources.length > 0 ? (
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
              {activeRun.sources.map((source) => (
                <button
                  key={source.path}
                  type="button"
                  aria-pressed={activeSource?.path === source.path}
                  onClick={() => {
                    setActiveSourcePath(source.path)
                    setSelectedRef(null)
                  }}
                >
                  {source.path.split('/').at(-1)}
                </button>
              ))}
            </div>

            <div className="observatory__source-meta">
              <code>{activeSource?.path ?? '暂无源码'}</code>
              <span>
                <Gauge size={13} aria-hidden="true" />
                {activeSource?.lines.length ?? 0} lines
              </span>
            </div>

            <div className="observatory__code" role="region" aria-label="源代码">
              <pre>
                <code>
                  {(activeSource?.lines ?? []).map((line, index) => {
                    const lineNumber = index + 1
                    const highlighted = Boolean(
                      focusedRef &&
                        focusedRef.file === activeSource?.path &&
                        lineNumber >= focusedRef.startLine &&
                        lineNumber <= focusedRef.endLine,
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
        ) : (
          <section className="observatory__reference-trace" aria-labelledby="trace-schema-heading">
            <div className="observatory__panel-heading">
              <div>
                <p>WIRE EVIDENCE</p>
                <h2 id="trace-schema-heading">当前 step 的可审计字段</h2>
              </div>
              <span className="observatory__badge is-context">cctrace</span>
            </div>
            <dl className="observatory__wire-grid">
              <div>
                <dt>PAIR ID</dt>
                <dd>{activeStep.step.pairId ?? '—'}</dd>
              </div>
              <div>
                <dt>MODEL</dt>
                <dd>{activeStep.step.model}</dd>
              </div>
              <div>
                <dt>REQUEST</dt>
                <dd>{formatClock(activeStep.step.startedAt)}</dd>
              </div>
              <div>
                <dt>RESPONSE</dt>
                <dd>{formatClock(activeStep.step.endedAt)}</dd>
              </div>
              <div>
                <dt>TOOLS</dt>
                <dd>{activeStep.step.toolCalls.length} calls</dd>
              </div>
              <div>
                <dt>COMPOSITION</dt>
                <dd>
                  {activeStep.step.composition?.source === 'cctrace-demo-data'
                    ? 'demo-data 精确'
                    : 'chars/4 估算'}
                </dd>
              </div>
            </dl>
            <p className="observatory__outline-note">
              cctrace 的 trace 单位是 <code>TracePair</code>：请求、响应、耗时、客户端；
              会话视图再从请求体中的 messages 重建 loop / turn / step。页面不展示
              headers 与原始 body，只保留归一化字段和脱敏片段。
            </p>
          </section>
        )}
      </div>

      <footer className="observatory__footnote">
        <Clock3 size={15} aria-hidden="true" />
        <span>
          快照生成于 {formatDateTime(snapshot.generatedAt)}。当前 run：{activeRun.label}。
          <a href={snapshot.reference.repoUrl} target="_blank" rel="noreferrer">
            参考实现 cctrace
          </a>
          ；黑白板给出的 CRTrace 地址在核验时返回 404，页面不把它当作有效来源。
        </span>
      </footer>
    </div>
  )
}

function CompositionView({ composition }: { composition: Composition }) {
  const max = compositionMax(composition)
  const exact = composition.source === 'cctrace-demo-data'
  return (
    <div className="observatory__composition">
      <div className="observatory__composition-head">
        <strong>上下文构成</strong>
        <span>{exact ? 'cctrace demo-data 精确值' : '≈ chars/4 估算'}</span>
      </div>
      {COMPOSITION_SEGMENTS.map((segment) => {
        const value = composition[segment.key]
        return (
          <div key={segment.key} className="observatory__composition-row">
            <span className={`observatory__composition-label ${segment.color}`}>
              {segment.label}
            </span>
            <div className="observatory__composition-bar">
              <i
                className={segment.color}
                style={{ width: `${Math.max(0.6, (value / max) * 100)}%` }}
              />
            </div>
            <b>{formatCount(value)}</b>
          </div>
        )
      })}
      <div className="observatory__composition-total">
        <span>总量</span>
        <strong>
          {exact ? '' : '≈ '}
          {formatCount(composition.total)} token
        </strong>
      </div>
    </div>
  )
}
