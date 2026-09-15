import upstream from '../../data/hermes/upstream-meta.json'

export function SiteFooter() {
  const fetched = new Date(upstream.fetchedAt)
  const fetchedLabel = Number.isNaN(fetched.getTime())
    ? upstream.fetchedAt
    : `${fetched.getUTCFullYear()}-${String(fetched.getUTCMonth() + 1).padStart(2, '0')}-${String(
        fetched.getUTCDate(),
      ).padStart(2, '0')}`

  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-ink">Topic Atlas</p>
            <p className="mt-2 text-xs text-muted">
              把官方文档整理成有学习目标、有验收标准、有交互演示的学习路径。本站是非官方学习站点，
              内容版权归原作者所有。
            </p>
          </div>

          <div className="text-xs text-muted">
            <p className="font-semibold text-ink">内容来源与许可</p>
            <ul className="mt-2 space-y-1.5">
              <li>
                内容改写自{' '}
                <a
                  className="link-underline text-accent"
                  href="https://hermes-agent.nousresearch.com/docs/"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Hermes Agent 官方文档 ↗
                </a>
                （Nous Research），按 {upstream.license} 协议使用。
              </li>
              <li>
                上游仓库：
                <a
                  className="link-underline text-accent"
                  href={upstream.repoUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {upstream.repo}
                </a>
              </li>
              <li>
                内容快照：<code className="font-mono">{upstream.commitSha.slice(0, 7)}</code> ·{' '}
                {fetchedLabel} · 共 {upstream.fileCount} 个文档文件
              </li>
            </ul>
          </div>
        </div>

        <div className="rule-gradient my-6" />

        <p className="text-[11px] text-faint">
          站点为纯静态页面，无后端、无账号、无 Cookie 追踪；学习进度只保存在你自己的浏览器里。
        </p>
      </div>
    </footer>
  )
}
