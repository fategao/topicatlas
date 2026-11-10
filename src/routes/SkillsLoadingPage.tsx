import {
  ArrowUpRight,
  Braces,
  ExternalLink,
  FileSearch,
  GitCommitHorizontal,
  ShieldCheck,
  Terminal,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { SkillLoadingLab } from '../features/skills-loading/SkillLoadingLab'
import type { SkillsLoadingSnapshot } from '../data/skills-loading/types'
import snapshotJson from '../data/skills-loading/snapshot.json'

const snapshot = snapshotJson as unknown as SkillsLoadingSnapshot

const RELATED_READING = [
  {
    label: 'Claude · Skills',
    url: 'https://claude.com/skills',
    note: '技能生态与可复用工作流背景；本页不做平台机制对照。',
  },
  {
    label: 'Hermes · Skills Marketplace',
    url: 'https://hermes-agent.nousresearch.com/marketplace?kind=skills',
    note: '技能发布与发现入口；不作为 Codex 加载行为的证据。',
  },
]

export function SkillsLoadingPage() {
  return (
    <main className="px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
      <div className="mx-auto max-w-[1360px]">
        <nav aria-label="面包屑" className="mb-5 flex items-center gap-2 text-xs text-faint">
          <Link to="/" className="link-underline">
            Topic Atlas
          </Link>
          <span aria-hidden="true">/</span>
          <span>Skills Loading</span>
        </nav>

        <SkillLoadingLab snapshot={snapshot} />

        <section className="mt-16 border-t border-line pt-10" aria-labelledby="audit-boundary">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="text-xs font-semibold text-faint">AUDIT BOUNDARY</p>
              <h2 id="audit-boundary" className="mt-2 text-2xl font-semibold text-ink">
                哪些是观测，哪些是计算
              </h2>
              <p className="mt-3 max-w-md text-sm leading-7 text-muted">
                页面不把“知道存在”伪装成“已经读到”。命令执行与 usage 来自真实
                Codex JSON；初始索引规模和 token 增量按本地字符数计算；完整 system prompt
                未在事件流中暴露，因此只按官方规则说明。
              </p>
            </div>

            <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
              <article className="bg-page-soft p-5">
                <ShieldCheck size={19} className="text-accent-2" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-semibold text-ink">observed</h3>
                <p className="mt-2 text-xs leading-6 text-muted">
                  command execution、文件读取、脚本输出、agent message 与 provider usage。
                </p>
              </article>
              <article className="bg-page-soft p-5">
                <FileSearch size={19} className="text-accent" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-semibold text-ink">computed</h3>
                <p className="mt-2 text-xs leading-6 text-muted">
                  已安装技能数量、frontmatter 字符数与 chars/4 token 估算。
                </p>
              </article>
              <article className="bg-page-soft p-5">
                <Braces size={19} className="text-accent-3" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-semibold text-ink">documented</h3>
                <p className="mt-2 text-xs leading-6 text-muted">
                  2% 初始技能预算与“匹配后加载正文”的机制来自 OpenAI 官方文档。
                </p>
              </article>
            </div>
          </div>

          <div className="mt-7 grid gap-4 rounded-xl border border-line bg-page-soft p-5 md:grid-cols-[1fr_1fr]">
            <div className="flex gap-3">
              <Terminal size={18} className="mt-0.5 flex-none text-accent-2" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-semibold text-ink">复现真实录制</h3>
                <p className="mt-2 text-xs leading-6 text-muted">
                  录制脚本会发起一次只读 Codex 调用，原始 JSONL 留在本机
                  <code className="mx-1 rounded bg-surface-strong px-1 py-0.5 font-mono text-[10px]">artifacts/</code>
                  ，CI 不执行模型调用。
                </p>
                <pre className="mt-3 overflow-x-auto rounded-lg bg-code p-3 text-[11px] text-muted">
                  npm run skills:trace
                </pre>
              </div>
            </div>
            <div className="flex gap-3">
              <GitCommitHorizontal
                size={18}
                className="mt-0.5 flex-none text-accent-3"
                aria-hidden="true"
              />
              <div>
                <h3 className="text-sm font-semibold text-ink">快照输入指纹</h3>
                <p className="mt-2 break-all font-mono text-[10px] leading-6 text-muted">
                  prompt · {snapshot.prompt.sha256.slice(0, 24)}…
                  <br />
                  skill · {snapshot.skill.files.find((file) => file.kind === 'instructions')?.sha256.slice(0, 24)}…
                </p>
                <p className="mt-2 text-xs leading-6 text-muted">
                  生成于 {new Date(snapshot.generatedAt).toLocaleString('zh-CN', { hour12: false })}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12" aria-labelledby="skills-sources">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-faint">SOURCES & FURTHER READING</p>
              <h2 id="skills-sources" className="mt-1 text-xl font-semibold text-ink">
                机制结论与延伸资料分开
              </h2>
            </div>
            <a
              href="https://github.com/fategao/topicatlas/blob/main/docs/skills-loading-log.md"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-accent-2"
            >
              查看录制日志
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <ul className="grid gap-3">
              {snapshot.sources.map((source) => (
                <li key={source.url} className="rounded-xl border border-line bg-page-soft p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="pill">机制证据</span>
                    <span className="text-[10px] text-faint">{source.retrievedAt}</span>
                  </div>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="link-underline mt-3 flex items-center gap-1.5 text-sm font-semibold text-ink"
                  >
                    {source.label}
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </a>
                  <p className="mt-2 text-xs leading-6 text-muted">{source.usedFor}</p>
                </li>
              ))}
            </ul>

            <ul className="grid content-start gap-3">
              {RELATED_READING.map((item) => (
                <li key={item.url} className="rounded-xl border border-line bg-page-soft p-4">
                  <span className="pill">延伸阅读</span>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="link-underline mt-3 flex items-center gap-1.5 text-sm font-semibold text-ink"
                  >
                    {item.label}
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </a>
                  <p className="mt-2 text-xs leading-6 text-muted">{item.note}</p>
                </li>
              ))}
              <li className="rounded-xl border border-dashed border-line p-4">
                <p className="text-xs leading-6 text-muted">
                  延伸资料只帮助理解技能生态；页面的加载顺序、事件含义与 token
                  口径均以本次 Codex 快照和 OpenAI 官方文档为准。
                </p>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  )
}
