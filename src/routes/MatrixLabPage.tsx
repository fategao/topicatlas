import { ArrowLeft, ScanLine } from 'lucide-react'
import { MatrixLab } from '../features/matrix-lab/MatrixLab'

export function MatrixLabPage() {
  return (
    <main className="px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
      <div className="mx-auto max-w-6xl">
        <nav aria-label="面包屑" className="mb-5 flex items-center gap-2 text-xs text-faint">
          <a href="/" className="link-underline">
            Topic Atlas
          </a>
          <span aria-hidden="true">/</span>
          <a href="/agent-observatory" className="link-underline">
            Agent Observatory
          </a>
          <span aria-hidden="true">/</span>
          <span>矩阵实验室</span>
        </nav>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-semibold text-accent-2">PRODUCT AGENT OUTPUT</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink sm:text-4xl">矩阵实验室</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
              改变一个系数，观察整个平面怎样响应。所有计算、拖动和反馈都在本地浏览器完成。
            </p>
          </div>
          <a href="/agent-observatory" className="btn">
            <ScanLine size={16} aria-hidden="true" />
            查看这个页面如何被构建
          </a>
        </div>

        <MatrixLab />

        <section className="mt-12 grid gap-8 border-t border-line pt-9 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-semibold text-faint">TAKEAWAY</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">用行列式读出面积和方向</h2>
          </div>
          <div className="space-y-3 text-sm leading-7 text-muted">
            <p>
              行列式的绝对值是面积缩放倍数：大于 1 放大，小于 1 缩小，等于 0 表示至少有一个方向
              被压掉。负号表示方向翻转，但不会改变面积的绝对值。
            </p>
            <p>
              秩告诉你还剩几个独立方向。满秩矩阵可逆；降秩矩阵不可逆，因为不同输入可能被映射到
              同一个输出。
            </p>
            <a href="/agent-observatory" className="inline-flex items-center gap-2 text-sm text-accent-2">
              <ArrowLeft size={15} aria-hidden="true" />
              回到执行轨迹
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}
