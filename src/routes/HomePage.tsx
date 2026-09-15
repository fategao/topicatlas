import { Link } from 'react-router-dom'
import { topics } from '../data/topics'
import { Reveal } from '../components/ui/Reveal'

export function HomePage() {
  return (
    <main>
      <section className="relative overflow-hidden px-4 pt-16 pb-20 sm:px-6 sm:pt-24">
        <div className="atlas-backdrop" aria-hidden="true">
          <span className="atlas-glow atlas-glow-a" />
          <span className="atlas-glow atlas-glow-b" />
          <span className="atlas-glow atlas-glow-c" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <Reveal>
            <p className="pill mx-auto">多主题 · 交互式 · 可验收</p>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
              把官方文档，读成一条
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(120deg, var(--c-accent), var(--c-accent-2))',
                }}
              >
                {' '}
                能走完的路
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm text-muted sm:text-base">
              Topic Atlas 把散落在长文档里的知识整理成有顺序的学习路径：每一步都写清「要学到什么」、
              给出官方原文，并附一份可以逐条勾选的验收清单。读完不是终点，能验收才算走完。
            </p>
          </Reveal>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6" aria-labelledby="topics-heading">
        <div className="mx-auto max-w-6xl">
          <h2 id="topics-heading" className="text-lg font-semibold text-ink">
            主题
          </h2>
          <p className="mt-1 text-sm text-muted">
            目前有 {topics.length} 个主题。每个主题都是独立的数据文件，新增主题不会影响已有内容。
          </p>

          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {topics.map((topic, index) => (
              <Reveal as="li" key={topic.id} delay={index * 70}>
                <Link
                  to={`/${topic.slug}`}
                  className="card card-hover flex h-full flex-col p-6"
                  data-topic={topic.id}
                >
                  <div className="flex items-center justify-between">
                    <span className="pill">{topic.stepCount} 个步骤</span>
                    <span className="pill" style={{ color: 'var(--c-accent-2)' }}>
                      {topic.status === 'ready' ? '已上线' : '筹备中'}
                    </span>
                  </div>

                  <h3 className="mt-4 text-xl font-semibold text-ink">{topic.title}</h3>
                  <p className="mt-1 text-sm text-accent-2">{topic.tagline}</p>
                  <p className="mt-3 flex-1 text-sm text-muted">{topic.description}</p>

                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {topic.tags.map((tag) => (
                      <li key={tag} className="pill">
                        {tag}
                      </li>
                    ))}
                  </ul>

                  <span className="mt-5 text-sm text-accent">进入学习路径 →</span>
                </Link>
              </Reveal>
            ))}

            <Reveal as="li" delay={140}>
              <div className="card flex h-full flex-col items-start justify-center border-dashed p-6">
                <h3 className="text-base font-semibold text-ink">下一个主题？</h3>
                <p className="mt-2 text-sm text-muted">
                  站点结构是数据驱动的：新增一个主题＝加一份步骤数据 + 一份内容文件，导航、进度与搜索会自动接入。
                </p>
              </div>
            </Reveal>
          </ul>
        </div>
      </section>
    </main>
  )
}
