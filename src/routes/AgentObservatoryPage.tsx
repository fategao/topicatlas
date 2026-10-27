import { ArrowUpRight, BookOpen, GitBranch, ShieldCheck } from 'lucide-react'
import { AgentObservatory } from '../features/agent-observatory/AgentObservatory'
import type { ObservatorySnapshot } from '../features/agent-observatory/types'
import snapshotJson from '../data/observatory/snapshot.json'

const snapshot = snapshotJson as unknown as ObservatorySnapshot

export function AgentObservatoryPage() {
  return (
    <main className="px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
      <div className="mx-auto max-w-[1360px]">
        <nav aria-label="面包屑" className="mb-5 flex items-center gap-2 text-xs text-faint">
          <a href="/" className="link-underline">
            Topic Atlas
          </a>
          <span aria-hidden="true">/</span>
          <span>Agent Observatory</span>
        </nav>

        <AgentObservatory snapshot={snapshot} />

        <section className="mt-16 border-t border-line pt-10" aria-labelledby="method-heading">
          <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="text-xs font-semibold text-faint">WHY TWO AGENTS</p>
              <h2 id="method-heading" className="mt-2 text-2xl font-semibold text-ink">
                结果能演示，过程才可审计
              </h2>
              <p className="mt-3 max-w-md text-sm leading-7 text-muted">
                产品 Agent 负责把规格变成可操作页面；监控 Agent 保留工具调用、文件变化、
                验证结果与源码位置。两者分工，避免“我做了”只有一张最终截图。
              </p>
            </div>

            <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
              <article className="bg-page-soft p-5">
                <GitBranch size={19} className="text-accent" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-semibold text-ink">真实事件</h3>
                <p className="mt-2 text-xs leading-6 text-muted">
                  从 Codex JSON 输出提取，不展示 reasoning，也不手工编造成功。
                </p>
              </article>
              <article className="bg-page-soft p-5">
                <ShieldCheck size={19} className="text-accent-2" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-semibold text-ink">构建期脱敏</h3>
                <p className="mt-2 text-xs leading-6 text-muted">
                  密钥、用户目录和长日志在写入快照前处理；浏览器不连接模型。
                </p>
              </article>
              <article className="bg-page-soft p-5">
                <BookOpen size={19} className="text-accent-3" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-semibold text-ink">源码可定位</h3>
                <p className="mt-2 text-xs leading-6 text-muted">
                  文件修改事件绑定到真实符号和行段，页面可以对源码进行平移检查。
                </p>
              </article>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line px-5 py-4">
            <p className="text-xs leading-6 text-muted">
              界面信息架构参考开源项目{' '}
              <a
                href="https://github.com/thevibeworks/cctrace"
                target="_blank"
                rel="noreferrer"
                className="link-underline text-ink"
              >
                cctrace
              </a>
              ：轨迹条、事件检查器、token 口径与源码视图。本站不复用其 TLS 代理或本地服务。
            </p>
            <a className="btn btn-primary" href={snapshot.product.route}>
              实际使用矩阵实验室
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}
