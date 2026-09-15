import { ProgressRing } from '../ui/ProgressRing'
import { hermesSteps } from '../../data/hermes/steps'
import { useProgress } from './ProgressContext'

export function ProgressPanel() {
  const { stats, reset, isComplete } = useProgress()

  return (
    <section id="progress" className="card p-5 sm:p-6" aria-labelledby="progress-heading">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <ProgressRing percent={stats.percent} done={stats.done} total={stats.total} />
          <div>
            <h2 id="progress-heading" className="text-base font-semibold text-ink">
              我的学习进度
            </h2>
            <p className="mt-1 text-sm text-muted">
              已完成 <span className="text-ink tabular-nums">{stats.completedSteps}</span> /{' '}
              {stats.totalSteps} 步 · 验收项{' '}
              <span className="text-ink tabular-nums">
                {stats.done}/{stats.total}
              </span>
            </p>
            <p className="mt-1 text-xs text-faint">进度存在本机浏览器，换设备不会同步。</p>
          </div>
        </div>

        <button type="button" className="btn self-start" onClick={reset} disabled={stats.done === 0}>
          重置进度
        </button>
      </div>

      <ol className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {hermesSteps.map((step) => {
          const complete = isComplete(step.id)
          return (
            <li key={step.id}>
              <a
                href={`#step-${step.id}`}
                className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-xs transition-colors hover:border-line-strong"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] tabular-nums"
                  style={{
                    background: complete ? 'var(--c-accent-2)' : 'var(--c-surface-strong)',
                    color: complete ? '#05060b' : 'var(--c-muted)',
                  }}
                >
                  {complete ? '✓' : step.order}
                </span>
                <span className={complete ? 'text-muted' : 'text-ink'}>{step.zhTitle}</span>
                {step.optional ? <span className="ml-auto text-faint">选读</span> : null}
              </a>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
