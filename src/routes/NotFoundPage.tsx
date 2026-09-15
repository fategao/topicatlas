import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-start px-4 py-24 sm:px-6">
      <p className="pill">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-ink">这个页面不存在</h1>
      <p className="mt-2 text-sm text-muted">
        链接可能已经变化。回到首页可以查看现有主题，或者直接进入 Hermes Agent 的学习路径。
      </p>
      <div className="mt-6 flex gap-2">
        <Link className="btn btn-primary" to="/">
          回到首页
        </Link>
        <Link className="btn" to="/hermes">
          Hermes Agent 学习路径
        </Link>
      </div>
    </main>
  )
}
