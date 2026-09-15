const LEVELS = [
  {
    name: '初级',
    time: '约 1 小时',
    goal: '快速上手，进行基本对话，使用内置工具',
    reading: [
      ['安装', 'getting-started/installation'],
      ['快速入门', 'getting-started/quickstart'],
      ['CLI 用法', 'user-guide/cli'],
      ['配置', 'user-guide/configuration'],
    ],
  },
  {
    name: '中级',
    time: '约 2–3 小时',
    goal: '搭建消息机器人，使用记忆、cron 任务、技能等高级功能',
    reading: [
      ['会话', 'user-guide/sessions'],
      ['消息', 'user-guide/messaging'],
      ['工具', 'user-guide/features/tools'],
      ['技能', 'user-guide/features/skills'],
      ['记忆', 'user-guide/features/memory'],
      ['Cron', 'user-guide/features/cron'],
    ],
  },
  {
    name: '高级',
    time: '约 4–6 小时',
    goal: '构建自定义工具、创建技能、训练模型、参与项目贡献',
    reading: [
      ['架构', 'developer-guide/architecture'],
      ['添加工具', 'developer-guide/adding-tools'],
      ['创建技能', 'developer-guide/creating-skills'],
      ['强化学习训练', 'user-guide/features/rl-training'],
      ['贡献指南', 'developer-guide/contributing'],
    ],
  },
] as const

const SCENARIOS = [
  {
    title: '我想要一个 CLI 编程助手',
    reading: [
      ['安装', 'getting-started/installation'],
      ['快速入门', 'getting-started/quickstart'],
      ['CLI 用法', 'user-guide/cli'],
      ['代码执行', 'user-guide/features/code-execution'],
      ['上下文文件', 'user-guide/features/context-files'],
      ['技巧与窍门', 'guides/tips'],
    ],
  },
  {
    title: '我想要一个 Telegram / Discord 机器人',
    reading: [
      ['安装', 'getting-started/installation'],
      ['配置', 'user-guide/configuration'],
      ['消息概览', 'user-guide/messaging'],
      ['Telegram 配置', 'user-guide/messaging/telegram'],
      ['Discord 配置', 'user-guide/messaging/discord'],
      ['语音模式', 'user-guide/features/voice-mode'],
      ['安全', 'user-guide/security'],
    ],
  },
  {
    title: '我想自动化任务',
    reading: [
      ['快速入门', 'getting-started/quickstart'],
      ['Cron 调度', 'user-guide/features/cron'],
      ['批处理', 'user-guide/features/batch-processing'],
      ['委派', 'user-guide/features/delegation'],
      ['Hooks', 'user-guide/features/hooks'],
    ],
  },
  {
    title: '我想构建自定义工具 / 技能',
    reading: [
      ['插件', 'user-guide/features/plugins'],
      ['构建 Hermes 插件', 'developer-guide/plugins'],
      ['工具概览', 'user-guide/features/tools'],
      ['技能概览', 'user-guide/features/skills'],
      ['MCP', 'user-guide/features/mcp'],
      ['架构', 'developer-guide/architecture'],
    ],
  },
  {
    title: '我想训练模型',
    reading: [
      ['快速入门', 'getting-started/quickstart'],
      ['配置', 'user-guide/configuration'],
      ['强化学习训练', 'user-guide/features/rl-training'],
      ['Provider 路由', 'user-guide/features/provider-routing'],
      ['架构', 'developer-guide/architecture'],
    ],
  },
  {
    title: '我想把它当作 Python 库使用',
    reading: [
      ['安装', 'getting-started/installation'],
      ['快速入门', 'getting-started/quickstart'],
      ['Python 库指南', 'guides/python-library'],
      ['架构', 'developer-guide/architecture'],
      ['工具', 'user-guide/features/tools'],
      ['会话', 'user-guide/sessions'],
    ],
  },
] as const

const DOCS_ZH = 'https://hermes-agent.nousresearch.com/docs/zh-Hans/'

export function LearningPathLab() {
  return (
    <div className="card mt-6 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-ink">三条经验水平路径</h3>
      <p className="mt-1 text-xs text-faint">来自官方 Learning Path 页面；挑一条按顺序读下去就行，不必读完所有内容。</p>

      <ol className="mt-4 grid gap-3 lg:grid-cols-3">
        {LEVELS.map((level) => (
          <li key={level.name} className="rounded-xl border border-line p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">{level.name}</span>
              <span className="pill">{level.time}</span>
            </div>
            <p className="mt-2 text-xs text-muted">{level.goal}</p>
            <ol className="mt-3 space-y-1">
              {level.reading.map(([label, path], index) => (
                <li key={path} className="text-xs">
                  <span className="mr-1 font-mono text-faint">{index + 1}.</span>
                  <a
                    className="text-accent link-underline"
                    href={`${DOCS_ZH}${path}`}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {label} ↗
                  </a>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>

      <h3 className="mt-6 text-sm font-semibold text-ink">按使用场景选</h3>
      <div className="mt-3 space-y-2">
        {SCENARIOS.map((scenario) => (
          <details key={scenario.title} className="rounded-xl border border-line p-3">
            <summary className="cursor-pointer text-sm text-ink">{scenario.title}</summary>
            <ol className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {scenario.reading.map(([label, path], index) => (
                <li key={path} className="text-xs">
                  <span className="mr-1 font-mono text-faint">{index + 1}.</span>
                  <a
                    className="text-accent link-underline"
                    href={`${DOCS_ZH}${path}`}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {label} ↗
                  </a>
                </li>
              ))}
            </ol>
          </details>
        ))}
      </div>
    </div>
  )
}
