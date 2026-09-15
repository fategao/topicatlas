// 单一事实来源：站点覆盖的官方文档模块，以及它们在官方仓库中的中英文路径。
// 每次跑 `npm run content:refresh` 都从这里读取，保证抓取脚本与校验脚本口径一致。

export const UPSTREAM_REPO = 'NousResearch/hermes-agent'
export const UPSTREAM_REF = 'main'

const ZH_PREFIX = 'website/i18n/zh-Hans/docusaurus-plugin-content-docs/current/'
const EN_PREFIX = 'website/docs/'

/** 站点对外展示的官方文档地址前缀 */
const ZH_SITE = 'https://hermes-agent.nousresearch.com/docs/zh-Hans/'
const EN_SITE = 'https://hermes-agent.nousresearch.com/docs/'

function module_(id, path, step) {
  return {
    id,
    step,
    zhPath: `${ZH_PREFIX}${path}`,
    enPath: `${EN_PREFIX}${path}`,
    zhUrl: `${ZH_SITE}${path.replace(/\.md$/, '')}`,
    enUrl: `${EN_SITE}${path.replace(/\.md$/, '')}`,
  }
}

/**
 * step 对应学习路径的步骤号（0 表示速查参考，不属于某一步）。
 * 步骤划分来自用户提供的学习阶段表，不自行增删。
 */
export const MODULES = [
  module_('installation', 'getting-started/installation.md', 1),
  module_('quickstart', 'getting-started/quickstart.md', 2),
  module_('providers', 'integrations/providers.md', 3),
  module_('cli', 'user-guide/cli.md', 4),
  module_('configuration', 'user-guide/configuration.md', 5),
  module_('tools', 'user-guide/features/tools.md', 6),
  module_('learning-path', 'getting-started/learning-path.md', 7),
  module_('configuring-models', 'user-guide/configuring-models.md', 3),
  module_('cli-commands', 'reference/cli-commands.md', 0),
  module_('tools-reference', 'reference/tools-reference.md', 0),
  module_('toolsets-reference', 'reference/toolsets-reference.md', 0),
]

export const REFERENCES = MODULES.filter((m) => m.step === 0)

export function moduleById(id) {
  const found = MODULES.find((m) => m.id === id)
  if (!found) throw new Error(`未知模块: ${id}`)
  return found
}
