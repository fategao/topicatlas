import { Suspense, type ComponentType } from 'react'
import { AcceptanceChecklist } from './AcceptanceChecklist'
import { stepContent } from '../../content/registry'
import { useProgress } from './ProgressContext'
import type { HermesStep } from '../../data/hermes/steps'
import { InstallLab } from './labs/InstallLab'
import { FirstChatLab } from './labs/FirstChatLab'
import { ModelConfigLab } from './labs/ModelConfigLab'
import { CliLab } from './labs/CliLab'
import { ConfigLab } from './labs/ConfigLab'
import { ToolCallLab } from './labs/ToolCallLab'
import { LearningPathLab } from './labs/LearningPathLab'

const LABS: Record<string, ComponentType> = {
  installation: InstallLab,
  quickstart: FirstChatLab,
  providers: ModelConfigLab,
  cli: CliLab,
  configuration: ConfigLab,
  tools: ToolCallLab,
  'learning-path': LearningPathLab,
}

export function StepSection({ step }: { step: HermesStep }) {
  const { isComplete } = useProgress()
  const Content = stepContent[step.id]
  const Lab = LABS[step.id]
  const complete = isComplete(step.id)

  return (
    <section
      id={`step-${step.id}`}
      className="scroll-mt-24 border-t border-line pt-10"
      aria-labelledby={`step-${step.id}-heading`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold tabular-nums"
          style={{
            background: complete ? 'var(--c-accent-2)' : 'var(--c-surface-strong)',
            color: complete ? '#05060b' : 'var(--c-ink)',
          }}
          aria-hidden="true"
        >
          {complete ? '✓' : step.order}
        </span>
        <h2 id={`step-${step.id}-heading`} className="text-xl font-semibold text-ink">
          {step.zhTitle}
        </h2>
        <span className="pill font-mono">{step.officialName}</span>
        {step.optional ? <span className="pill">选读</span> : null}
      </div>

      <div className="card mt-4 p-4 sm:p-5">
        <p className="text-xs font-semibold text-faint">这一步要学到什么</p>
        <p className="mt-1 text-sm text-ink">{step.goal}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            className="btn"
            href={step.zhUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`${step.zhTitle} 官方中文文档`}
          >
            官方中文文档 ↗
          </a>
          <a
            className="btn"
            href={step.enUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`${step.zhTitle} 官方英文文档`}
          >
            官方英文文档 ↗
          </a>
        </div>
      </div>

      <div className="prose-atlas mt-6 max-w-none">
        <Suspense fallback={<p className="text-xs text-faint">正在加载这一步的正文…</p>}>
          {Content ? <Content /> : null}
        </Suspense>
      </div>

      {Lab ? <Lab /> : null}

      <AcceptanceChecklist stepId={step.id} items={step.acceptance} />
    </section>
  )
}
