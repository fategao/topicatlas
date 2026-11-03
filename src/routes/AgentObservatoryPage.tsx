import { ArrowUpRight, BookOpen, Braces, GitBranch, ShieldCheck } from 'lucide-react'
import { AgentObservatory } from '../features/agent-observatory/AgentObservatory'
import type { ObservatorySnapshot } from '../features/agent-observatory/types'
import snapshotJson from '../data/observatory/snapshot.json'

const snapshot = snapshotJson as unknown as ObservatorySnapshot

const SCHEMA_ROWS = [
  {
    field: 'TracePair',
    source: 'src/types.ts',
    meaning: '一次请求/响应对：id、request、response、duration、loggedAt、client。',
    used: '一条 wire pair 对应页面里的一个可审计记录；本页只保留归一化字段。',
  },
  {
    field: 'RequestData',
    source: 'src/types.ts',
    meaning: 'timestamp、method、url、headers、body、bodyBytes。',
    used: '请求时间与模型；headers 不写入快照，避免把凭据或本机信息带上线。',
  },
  {
    field: 'ResponseData',
    source: 'src/types.ts',
    meaning: 'status、headers、body/bodyRaw、firstByteMs、firstTokenMs、truncated。',
    used: '响应时间与正文；本页不展示原始 body，只展示结果片段与 usage。',
  },
  {
    field: 'loop / turn / step',
    source: 'src/session.ts',
    meaning: '人类请求开启 loop；每个 assistant 消息是一次 agentic step；tool_use 与 tool_result 按 id 融合。',
    used: 'Session Outline 的循环、step、工具行；子代理通过 agent id 单独成支。',
  },
  {
    field: 'context composition',
    source: 'docs/web-ui.md',
    meaning: 'system、tool schemas、user、injected context、assistant、tool results 六类。',
    used: '检查器里的构成条；精确值来自 cctrace demo-data，其余用 chars/4 估算并标 ≈。',
  },
  {
    field: 'trace store',
    source: 'docs/traces.md',
    meaning: 'trace-<ts>.jsonl 实时追加，退出后归档为 .jsonl.zst；session 文件可跨 run 合并。',
    used: '本页不复用其 TLS 代理或本地存储；构建前读取官方样例并生成静态快照。',
  },
]

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
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="text-xs font-semibold text-faint">FROM WIRE TO REPLAY</p>
              <h2 id="method-heading" className="mt-2 text-2xl font-semibold text-ink">
                真正监控，不等于实时请求模型
              </h2>
              <p className="mt-3 max-w-md text-sm leading-7 text-muted">
                这条页面监控的是「一次已经发生的 agent 运行」：循环、模型 step、工具调用、
                注入上下文、压缩和 token 都能回放。它不是直播，也不会在浏览器里连接 provider。
                这样既保留了可审计结构，又不需要把 API Key 交给前端。
              </p>
            </div>

            <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
              <article className="bg-page-soft p-5">
                <GitBranch size={19} className="text-accent" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-semibold text-ink">真实事件</h3>
                <p className="mt-2 text-xs leading-6 text-muted">
                  工具调用与结果、子代理分支、错误和 token 来自真实采集；无法确认的字段留空，
                  不用示意图补造。
                </p>
              </article>
              <article className="bg-page-soft p-5">
                <ShieldCheck size={19} className="text-accent-2" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-semibold text-ink">构建期脱敏</h3>
                <p className="mt-2 text-xs leading-6 text-muted">
                  绝对路径、session id、凭据样式文本与长日志在写入快照前处理；浏览器只读静态
                  JSON，不发起任何模型请求。
                </p>
              </article>
              <article className="bg-page-soft p-5">
                <Braces size={19} className="text-accent-3" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-semibold text-ink">Schema 可追溯</h3>
                <p className="mt-2 text-xs leading-6 text-muted">
                  页面按 cctrace 的 pair → session → loop/step 模型组织，逐字段说明来源，
                  不用截图代替数据结构。
                </p>
              </article>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-xl border border-line">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <p className="text-xs font-semibold text-faint">TRACE MODEL</p>
                <h3 className="mt-1 text-base font-semibold text-ink">
                  cctrace 字段如何进入页面
                </h3>
              </div>
              <a
                href={snapshot.reference.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-accent-2"
              >
                <BookOpen size={14} aria-hidden="true" />
                阅读 cctrace 源码
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-faint">
                    <th className="px-4 py-2.5 font-semibold">字段 / 模型</th>
                    <th className="px-4 py-2.5 font-semibold">一手源码</th>
                    <th className="px-4 py-2.5 font-semibold">cctrace 含义</th>
                    <th className="px-4 py-2.5 font-semibold">本页怎么用</th>
                  </tr>
                </thead>
                <tbody>
                  {SCHEMA_ROWS.map((row) => (
                    <tr key={row.field} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 align-top font-mono text-[11px] text-ink">
                        {row.field}
                      </td>
                      <td className="px-4 py-3 align-top font-mono text-[10px] text-accent-2">
                        {row.source}
                      </td>
                      <td className="px-4 py-3 align-top leading-6 text-muted">{row.meaning}</td>
                      <td className="px-4 py-3 align-top leading-6 text-muted">{row.used}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-line bg-page-soft p-5">
            <p className="text-xs font-semibold text-faint">SOURCE CHECK · 2026-11-03</p>
            <p className="mt-2 text-xs leading-6 text-muted">
              黑板给出的 <code className="rounded bg-surface-strong px-1 py-0.5 font-mono text-[10px]">https://thevibeworks.github.io/CRTrace</code>{' '}
              实际返回 <strong className="text-ink">HTTP 404</strong>，GitHub API 也找不到
              <code className="mx-1 rounded bg-surface-strong px-1 py-0.5 font-mono text-[10px]">thevibeworks/CRTrace</code>
              仓库。同一命名空间下可访问的是
              <a
                href={snapshot.reference.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="link-underline mx-1 text-ink"
              >
                thevibeworks/cctrace
              </a>
              （Pages 与仓库均 HTTP 200），本页按该项目源码与公开样例实现。核验结果同时写入
              快照的 <code className="rounded bg-surface-strong px-1 py-0.5 font-mono text-[10px]">reference.probes</code>，
              页面不把失效地址当作来源。
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line px-5 py-4">
            <p className="text-xs leading-6 text-muted">
              两条 run 分开标注来源：本项目矩阵构建（Codex JSONL，时间为归一化回放）与 cctrace
              官方公开样例（Claude Code wire 时间戳）。参考实现为 MIT 许可；本站不复用其 TLS
              代理、根证书或本地服务。
            </p>
            <a className="btn btn-primary" href="/agent-observatory/matrix-lab">
              实际使用矩阵实验室
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}
