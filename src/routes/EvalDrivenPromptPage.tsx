import { Link } from 'react-router-dom'
import { EvalPromptDiff } from '../components/eval/EvalPromptDiff'
import { EvalWorkbench } from '../components/eval/EvalWorkbench'
import { Reveal } from '../components/ui/Reveal'
import { evalCases, evalPrompts } from '../data/eval/dataset'
import { evalSources } from '../data/eval/sources'

const LOOP = [
  {
    step: '01',
    title: '定义成功标准',
    body: '先把“好”拆成可观测维度，例如标签正确、格式合规、边界用例与成本。',
  },
  {
    step: '02',
    title: '构造测试集',
    body: '覆盖真实分布，并主动加入歧义、多语言、对抗输入等失败最容易出现的位置。',
  },
  {
    step: '03',
    title: '选择评分器',
    body: '能用精确匹配和代码断言解决的，不要先交给 LLM 评委；主观维度才用 rubric 评分。',
  },
  {
    step: '04',
    title: '跑对比矩阵',
    body: '让 Prompt 版本、用例、评分标准三者一一对应，失败样本比平均分更重要。',
  },
  {
    step: '05',
    title: '按失败迭代',
    body: '每次只改一项规格，再完整回归；如果指标不涨，就回退而不是继续堆提示词。',
  },
]

const GRADERS = [
  {
    name: '精确匹配',
    bestFor: '分类、枚举、结构化字段',
    risk: '过度严格；需要先定义大小写、空白和同义标签的归一化规则。',
  },
  {
    name: '代码断言',
    bestFor: 'JSON schema、正则、数值边界、工具调用参数',
    risk: '能证明格式正确，不能证明语义正确。',
  },
  {
    name: '模型评分',
    bestFor: '语气、相关性、摘要覆盖度等主观维度',
    risk: '要把 rubric、分制和输出格式写死，并防止评委偏好漂移。',
  },
  {
    name: '人工复核',
    bestFor: '高风险样本、评分器校准、上线前抽样',
    risk: '成本高，适合建立金标准，不适合每轮全量回归。',
  },
]

const ACCEPTANCE = [
  '页面明确区分指令区与参考资料区，所有事实结论都指向官方一手文档。',
  '对比矩阵使用真实模型输出快照，并显示模型、时间、Prompt 哈希与 token 口径。',
  '访客能调整 rubric 权重和通过线，实时看到总分、维度分与逐用例结果变化。',
  '页面在桌面与移动端均无横向溢出，键盘可操作滑块，支持深浅色与 reduced-motion。',
  '仓库保留 AGENTS.md、两轮 Prompt 日志、可复现快照脚本和部署验证记录。',
]

const sourceById = Object.fromEntries(evalSources.map((source) => [source.id, source]))

function SourceLink({ id }: { id: keyof typeof sourceById }) {
  const source = sourceById[id]
  return (
    <a
      className="link-underline text-accent"
      href={source.url}
      target="_blank"
      rel="noreferrer noopener"
    >
      {source.organization} · {source.title} ↗
    </a>
  )
}

export function EvalDrivenPromptPage() {
  const typicalCount = evalCases.filter((item) => item.category === 'typical').length
  const edgeCount = evalCases.filter((item) => item.category === 'edge').length
  const outputCount = evalCases.length * evalPrompts.length

  return (
    <main>
      <section className="relative overflow-hidden px-4 pt-14 pb-12 sm:px-6">
        <div className="atlas-backdrop" aria-hidden="true">
          <span className="atlas-glow atlas-glow-a" />
          <span className="atlas-glow atlas-glow-b" />
          <span className="atlas-glow atlas-glow-c" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          <Reveal>
            <nav aria-label="面包屑" className="flex items-center gap-2 text-xs text-faint">
              <Link to="/" className="link-underline">
                Topic Atlas
              </Link>
              <span aria-hidden="true">/</span>
              <span className="text-muted">Eval-driven Prompt</span>
            </nav>

            <p className="pill mt-6">LMAPI 子任务 E</p>
            <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
              先定义“什么叫好”，
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(120deg, var(--c-accent), var(--c-accent-2))',
                }}
              >
                {' '}
                再改 Prompt
              </span>
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
              同一个模型、同一批工单，只因为 Prompt 的规格不同，标签正确率就从 75% 提升到 100%，
              格式合规率从 0% 提升到 100%。这不是“换一个更聪明的模型”，而是先把验收标准变成可运行的
              Eval。
            </p>

            <ul className="mt-6 flex flex-wrap gap-2 text-xs">
              <li className="pill">{evalCases.length} 个固定用例</li>
              <li className="pill">2 个 Prompt 版本</li>
              <li className="pill">{outputCount} 条真实模型快照</li>
              <li className="pill">可调 rubric 与通过线</li>
            </ul>

            <div className="mt-7 flex flex-wrap gap-2">
              <a className="btn btn-primary" href="#workbench">
                打开评分实验台
              </a>
              <a className="btn" href="#prompt-diff">
                查看规格差异
              </a>
              <a className="btn" href="#sources">
                官方资料来源
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6" aria-labelledby="mental-model-heading">
        <div className="mx-auto max-w-6xl">
          <div className="card p-5 sm:p-7">
            <p className="text-xs font-semibold text-faint">MENTAL MODEL</p>
            <h2 id="mental-model-heading" className="mt-1 text-xl font-semibold text-ink">
              先给问题装上尺子，再改答案
            </h2>
            <p className="mt-3 max-w-4xl text-sm leading-relaxed text-muted">
              Prompt 是概率模型的运行时行为规格。没有 Eval 时，你只能用“看起来不错”判断一次生成；
              有了 Eval 后，每次改 Prompt 都变成一次带回归集的实验：改动什么、哪些样本变好、哪些样本
              变坏、值不值得部署。
            </p>
            <div className="mt-5 rounded-xl border border-line p-4 text-sm text-muted">
              <strong className="text-ink">版本注意：</strong>
              OpenAI 官方说明 Evals 平台正在退役，现有内容将在 2026-10-31 后只读，并计划于
              2026-11-30 关闭。这里采用“成功标准 → 数据集 → 评分器 → 迭代”的通用方法，而不是把旧
              Evals API 当成唯一答案；新项目可改走官方 Datasets 指南。参考{' '}
              <SourceLink id="openai-evals" />、<SourceLink id="openai-datasets" />。
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6" aria-labelledby="loop-heading">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-xs font-semibold text-faint">THE LOOP</p>
            <h2 id="loop-heading" className="mt-1 text-xl font-semibold text-ink">
              一条可复用的五步闭环
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-muted">
              顺序不能反过来。先有尺子，再采样本，再选测量方法，最后才比较 Prompt。
            </p>
          </Reveal>

          <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {LOOP.map((item, index) => (
              <Reveal as="li" key={item.step} delay={index * 55}>
                <article className="card h-full p-4">
                  <span className="font-mono text-xs text-accent">{item.step}</span>
                  <h3 className="mt-3 text-base font-semibold text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
                </article>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section id="criteria" className="scroll-mt-24 px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold text-faint">STEP 01–02</p>
            <h2 className="mt-1 text-2xl font-semibold text-ink">成功标准与测试集</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Anthropic 官方建议先建立清晰的成功标准，并在改 Prompt 前准备实证测试；OpenAI
              官方最佳实践则强调任务特定、代表性、典型/边界/对抗样本都要覆盖。两条建议指向同一件事：
              测试集是产品需求的可执行表达，不是开发完成后补的作业。
            </p>
            <p className="mt-4 text-xs text-muted">
              <SourceLink id="anthropic-tests" />
              <br />
              <SourceLink id="openai-best-practices" />
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <article className="card p-5">
              <span className="pill">成功标准</span>
              <h3 className="mt-3 text-base font-semibold text-ink">至少四个可观测维度</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li>标签正确率：分类结果是否命中金标准。</li>
                <li>格式合规：输出是否满足下游程序约束。</li>
                <li>边界处理：歧义、多语言与指令注入是否稳。</li>
                <li>输出效率：token、延迟与成本是否可接受。</li>
              </ul>
            </article>
            <article className="card p-5">
              <span className="pill">测试集</span>
              <h3 className="mt-3 text-base font-semibold text-ink">
                {typicalCount} 个常规 + {edgeCount} 个边界
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li>常规样本覆盖三个标签的典型表达。</li>
                <li>边界样本把“看起来像硬件，实际是软件”的边界写清。</li>
                <li>对抗样本把“工单里的指令”当数据，不当系统指令。</li>
                <li>多语言样本验证 Prompt 规格是否跨语言稳定。</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section id="graders" className="scroll-mt-24 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold text-faint">STEP 03</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">评分器与失败模式匹配</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            不是所有“好”都要交给 LLM 打分。能用代码判定的先写成确定性断言，把模型评分预算留给真正主观的部分。
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {GRADERS.map((grader) => (
              <article key={grader.name} className="card h-full p-4">
                <h3 className="text-base font-semibold text-ink">{grader.name}</h3>
                <p className="mt-3 text-xs font-semibold text-faint">适合</p>
                <p className="mt-1 text-sm text-muted">{grader.bestFor}</p>
                <p className="mt-3 text-xs font-semibold text-faint">风险</p>
                <p className="mt-1 text-sm text-muted">{grader.risk}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workbench" className="scroll-mt-24 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold text-faint">STEP 04 · INTERACTIVE</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">亲自改变 rubric，看结论翻转</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            默认权重重视正确率和格式，Prompt v2 明显胜出。若只保留“输出越短越好”，v1
            会反超——这恰好说明 Eval 没有脱离业务目标的“绝对分数”。
          </p>
          <div className="mt-6">
            <EvalWorkbench />
          </div>
        </div>
      </section>

      <section id="prompt-diff" className="scroll-mt-24 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold text-faint">SPEC DIFF</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">不是“多写一点”，而是补规格</h2>
          <p className="mt-2 mb-6 max-w-3xl text-sm text-muted">
            v2 的每项变化都对应一个可测的失败模式：标签漂移、边界混乱、指令注入、格式不可解析。
          </p>
          <EvalPromptDiff />
        </div>
      </section>

      <section id="iterate" className="scroll-mt-24 px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card p-5 sm:p-6">
            <p className="text-xs font-semibold text-faint">STEP 05</p>
            <h2 className="text-xl font-semibold text-ink">从失败样本开始，不从灵感开始</h2>
            <ol className="mt-4 space-y-4">
              <li className="flex gap-3 text-sm text-muted">
                <span className="font-mono text-accent">1</span>
                先看失败样本属于哪一层：Prompt 不清晰、Schema 缺失、运行时行为不稳定，还是评分器写错了。
              </li>
              <li className="flex gap-3 text-sm text-muted">
                <span className="font-mono text-accent">2</span>
                一次只改一项规格，记下版本的 Prompt hash，再跑完整测试集而不是只看三个手挑样本。
              </li>
              <li className="flex gap-3 text-sm text-muted">
                <span className="font-mono text-accent">3</span>
                比较每维度指标与失败用例；如果提升来自过拟合少数样本，不接受这次改动。
              </li>
              <li className="flex gap-3 text-sm text-muted">
                <span className="font-mono text-accent">4</span>
                上线后把新失败样本回流到数据集。Eval 是持续维护的资产，不是一次性试卷。
              </li>
            </ol>
          </div>

          <div className="card p-5 sm:p-6">
            <p className="text-xs font-semibold text-faint">ACCEPTANCE</p>
            <h2 className="text-xl font-semibold text-ink">这个知识页的验收清单</h2>
            <ul className="mt-4 space-y-3">
              {ACCEPTANCE.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-muted">
                  <span className="text-accent-2" aria-hidden="true">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="sources" className="scroll-mt-24 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold text-faint">PRIMARY SOURCES</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">只引用官方一手资料</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            页面中的方法结论来自以下文档；版本退役日期以 OpenAI 官方 deprecations 页面为准。
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {evalSources.map((source) => (
              <li key={source.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="pill">{source.organization}</span>
                  <span className="text-[11px] text-faint">检索于 {source.retrievedAt}</span>
                </div>
                <a
                  className="link-underline mt-3 block text-sm font-semibold text-ink"
                  href={source.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {source.title} ↗
                </a>
                <p className="mt-2 text-xs leading-relaxed text-muted">{source.usedFor}</p>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-muted">
            过程证据：
            <a
              className="link-underline text-accent"
              href="https://github.com/fategao/topicatlas/blob/main/docs/eval-driven-prompt-log.md"
              target="_blank"
              rel="noreferrer noopener"
            >
              两轮 Prompt 迭代日志 ↗
            </a>
            {' · '}
            <a
              className="link-underline text-accent"
              href="https://github.com/fategao/topicatlas/blob/main/AGENTS.md"
              target="_blank"
              rel="noreferrer noopener"
            >
              项目 AGENTS.md ↗
            </a>
          </p>
        </div>
      </section>
    </main>
  )
}
