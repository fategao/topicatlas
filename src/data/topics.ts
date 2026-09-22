/**
 * 主题注册表。站点是「多主题」结构，Hermes Agent 只是第一个：
 * 新增主题时在这里加一条，并在 src/content 下补对应的步骤内容即可，
 * 首页、路由与导航都会自动跟随。
 */

export type TopicStatus = 'ready' | 'planned'

export type Topic = {
  id: string
  slug: string
  title: string
  zhTitle: string
  tagline: string
  description: string
  status: TopicStatus
  stepCount: number
  tags: string[]
  sourceName: string
  sourceUrl: string
  license: string
}

export const topics: Topic[] = [
  {
    id: 'hermes',
    slug: 'hermes',
    title: 'Hermes Agent',
    zhTitle: 'Hermes Agent 六步上手',
    tagline: '从一行安装命令到完成一次真实的工具调用',
    description:
      '按官方文档整理出的六步学习路径：装好、聊起来、接上自己的模型、用熟 CLI、看懂配置文件、让工具替你干活。每一步都有明确的学习目标、官方原文链接，以及可以逐条勾选的验收清单。',
    status: 'ready',
    stepCount: 7,
    tags: ['AI Agent', '自托管', 'CLI', 'Provider 配置', 'Tool Calling'],
    sourceName: 'Nous Research · Hermes Agent 官方文档',
    sourceUrl: 'https://hermes-agent.nousresearch.com/docs/',
    license: 'MIT',
  },
  {
    id: 'eval-driven-prompt',
    slug: 'eval-driven-prompt',
    title: 'Eval-driven Prompt',
    zhTitle: 'Eval-driven Prompt 五步闭环',
    tagline: '先定义成功标准，再用测试集和评分器迭代 Prompt',
    description:
      '用官方 IT 工单分类示例，把“什么叫好”拆成标签正确率、格式合规、边界处理与输出效率；再通过真实模型快照、可调 rubric 和逐用例矩阵，看清 Prompt 规格改变究竟带来了什么。',
    status: 'ready',
    stepCount: 5,
    tags: ['Prompt Engineering', 'Eval', 'Rubric', 'Instruction Hierarchy'],
    sourceName: 'OpenAI · Anthropic 官方评估指南',
    sourceUrl: 'https://developers.openai.com/api/docs/guides/evaluation-best-practices',
    license: '官方文档引用，页面内容为本站改写',
  },
]

export function findTopic(slug: string): Topic | undefined {
  return topics.find((topic) => topic.slug === slug)
}
