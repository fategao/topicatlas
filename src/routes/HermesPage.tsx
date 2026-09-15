import { topics } from '../data/topics'
import { hermesSteps } from '../data/hermes/steps'
import { StepMap } from '../components/hermes/StepMap'
import { ProgressPanel } from '../components/hermes/ProgressPanel'
import { StepSection } from '../components/hermes/StepSection'
import { ReferenceShell } from '../components/hermes/ReferenceShell'
import { Reveal } from '../components/ui/Reveal'

export function HermesPage() {
  const topic = topics[0]!

  return (
    <main>
      <section className="relative overflow-hidden px-4 pt-14 pb-10 sm:px-6">
        <div className="atlas-backdrop" aria-hidden="true">
          <span className="atlas-glow atlas-glow-a" />
          <span className="atlas-glow atlas-glow-b" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          <Reveal>
            <nav aria-label="面包屑" className="flex items-center gap-2 text-xs text-faint">
              <a href="/" className="link-underline">
                Topic Atlas
              </a>
              <span aria-hidden="true">/</span>
              <span className="text-muted">Hermes Agent</span>
            </nav>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {topic.zhTitle}
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-muted sm:text-base">{topic.description}</p>

            <ul className="mt-5 flex flex-wrap gap-2 text-xs">
              <li className="pill">{hermesSteps.length} 步（含 1 步选读）</li>
              <li className="pill">每步都有官方文档双链接</li>
              <li className="pill">验收清单可勾选</li>
              <li className="pill">内容快照取自官方仓库</li>
            </ul>

            <div className="mt-6 flex flex-wrap gap-2">
              <a className="btn btn-primary" href="#progress">
                看我的进度
              </a>
              <a className="btn" href="#reference">
                跳到速查参考
              </a>
              <a
                className="btn"
                href={topic.sourceUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                官方文档总入口 ↗
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-4 pb-6 sm:px-6" aria-labelledby="map-heading">
        <div className="mx-auto max-w-6xl">
          <h2 id="map-heading" className="text-lg font-semibold text-ink">
            学习路径总览
          </h2>
          <p className="mt-1 mb-5 text-sm text-muted">
            点任意一张卡片跳到对应步骤；每一步的结构都是「学什么 → 官方文档 → 要点与图示 → 动手练习 → 验收清单」。
          </p>
          <StepMap />
        </div>
      </section>

      <section className="px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <ProgressPanel />
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-14 px-4 py-10 sm:px-6">
        {hermesSteps.map((step) => (
          <StepSection key={step.id} step={step} />
        ))}
      </div>

      <section className="px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <ReferenceShell />
        </div>
      </section>
    </main>
  )
}
