export type EvalSource = {
  id: string
  organization: 'OpenAI' | 'Anthropic'
  title: string
  url: string
  usedFor: string
  retrievedAt: string
}

export const evalSources: EvalSource[] = [
  {
    id: 'openai-evals',
    organization: 'OpenAI',
    title: 'Working with evals',
    url: 'https://developers.openai.com/api/docs/guides/evals',
    usedFor: '评估的三个基本步骤、数据源与测试标准；同时确认 Evals 平台退役时间。',
    retrievedAt: '2026-09-22',
  },
  {
    id: 'openai-best-practices',
    organization: 'OpenAI',
    title: 'Evaluation best practices',
    url: 'https://developers.openai.com/api/docs/guides/evaluation-best-practices',
    usedFor: '定义目标、收集数据、选择指标、组合不同评估器与构造边界用例。',
    retrievedAt: '2026-09-22',
  },
  {
    id: 'openai-datasets',
    organization: 'OpenAI',
    title: 'Evaluation getting started · Datasets',
    url: 'https://developers.openai.com/api/docs/guides/evaluation-getting-started',
    usedFor: 'Evals 平台退役后的当前推荐入口，以及迭代式数据集工作流。',
    retrievedAt: '2026-09-22',
  },
  {
    id: 'anthropic-tests',
    organization: 'Anthropic',
    title: 'Define success criteria and build evaluations',
    url: 'https://docs.anthropic.com/en/docs/build-with-claude/develop-tests',
    usedFor: '成功标准的维度、任务真实性、精确匹配、LLM 评分与优先增加样本量。',
    retrievedAt: '2026-09-22',
  },
  {
    id: 'anthropic-prompting',
    organization: 'Anthropic',
    title: 'Prompt engineering overview',
    url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview',
    usedFor: '先定义成功标准和实证测试，再开始改 Prompt。',
    retrievedAt: '2026-09-22',
  },
]
