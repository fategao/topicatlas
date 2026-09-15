import { Reveal } from '../ui/Reveal'
import { hermesSteps } from '../../data/hermes/steps'
import { useProgress } from './ProgressContext'

/**
 * 首屏的学习路径地图：7 张卡片，一眼看清「学什么 → 验收什么」。
 * 卡片状态直接读进度，完成一步这里就会变色。
 */
export function StepMap() {
  const { isComplete, isChecked } = useProgress()

  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {hermesSteps.map((step, index) => {
        const complete = isComplete(step.id)
        const doneCount = step.acceptance.filter((item) => isChecked(step.id, item.id)).length
        return (
          <Reveal as="li" key={step.id} delay={index * 55}>
            <a
              href={`#step-${step.id}`}
              className="card card-hover flex h-full flex-col p-4"
              data-step={step.id}
              data-complete={complete ? 'true' : 'false'}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-faint">
                  {step.optional ? '选读' : `STEP ${step.order}`}
                </span>
                {complete ? (
                  <span className="pill" style={{ color: 'var(--c-accent-2)' }}>
                    ✓ 已完成
                  </span>
                ) : (
                  <span className="pill tabular-nums">
                    {doneCount}/{step.acceptance.length}
                  </span>
                )}
              </div>

              <h3 className="mt-3 text-base font-semibold text-ink">{step.zhTitle}</h3>
              <p className="mt-1 font-mono text-[11px] text-faint">{step.officialName}</p>
              <p className="mt-3 flex-1 text-sm text-muted">{step.goal}</p>

              <span className="mt-4 text-xs text-accent">查看这一步 →</span>
            </a>
          </Reveal>
        )
      })}
    </ol>
  )
}
