#!/usr/bin/env node
// 内容完整性校验：CI 里跑，防止「改一半」的内容上线。
//
// 校验项：
// 1. 学习路径 7 步齐全，且每步都有学习目标、官方中英双链接、验收清单
// 2. 每个验收项都有 label 与 hint
// 3. 四份参考数据都非空，且每条都带官方来源锚点
// 4. 正文里没有 TBD / TODO / 占位符
// 5. 数据里的上游 commit 与 manifest 一致

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const problems = []
const notes = []

async function readJson(relative) {
  return JSON.parse(await readFile(path.join(root, relative), 'utf8'))
}

async function readText(relative) {
  return readFile(path.join(root, relative), 'utf8')
}

function check(condition, message) {
  if (!condition) problems.push(message)
}

const CONTENT_FILES = [
  'src/content/steps/01-installation.mdx',
  'src/content/steps/02-quickstart.mdx',
  'src/content/steps/03-providers.mdx',
  'src/content/steps/04-cli.mdx',
  'src/content/steps/05-configuration.mdx',
  'src/content/steps/06-tools.mdx',
  'src/content/steps/07-learning-path.mdx',
]

const EXPECTED_STEPS = [
  'installation',
  'quickstart',
  'providers',
  'cli',
  'configuration',
  'tools',
  'learning-path',
]

async function main() {
  const manifest = await readJson('content/upstream/manifest.json')

  // ---- 1. 步骤元数据 ----
  const stepsSource = await readText('src/data/hermes/steps.ts')
  const stepIds = [...stepsSource.matchAll(/^\s{4}id: '([a-z-]+)',$/gm)].map((match) => match[1])

  const missing = EXPECTED_STEPS.filter((id) => !stepIds.includes(id))
  check(missing.length === 0, `学习路径缺少步骤：${missing.join(', ')}`)

  for (const field of ['goal:', 'primaryUrl:', 'zhUrl:', 'enUrl:', 'acceptance:']) {
    check(stepsSource.includes(field), `步骤元数据缺少字段 ${field}`)
  }
  check(!/\bTBD\b|\bTODO\b|\bFIXME\b|待补充|待写/.test(stepsSource), '步骤元数据里还有占位文本')

  const goalCount = (stepsSource.match(/goal: '/g) ?? []).length
  check(goalCount === EXPECTED_STEPS.length, `学习目标数量应为 ${EXPECTED_STEPS.length}，实际 ${goalCount}`)

  const acceptanceItems = (stepsSource.match(/\n\s{8}id: '/g) ?? []).length
  // 只数验收项里的 hint 值（`hint: '`），避免把类型声明 `hint: string` 也算进去
  const hints = (stepsSource.match(/hint: '/g) ?? []).length
  check(acceptanceItems >= EXPECTED_STEPS.length, '验收项数量异常')
  check(hints === acceptanceItems, `验收项与 hint 数量不一致：${acceptanceItems} vs ${hints}`)

  // ---- 2. 正文文件 ----
  for (const file of CONTENT_FILES) {
    const text = await readText(file)
    check(text.length > 800, `${file} 内容过短（${text.length} 字符）`)
    check(!/\bTBD\b|\bTODO\b|\bFIXME\b|待补充|待写/.test(text), `${file} 里还有占位文本`)
  }

  // ---- 3. 参考数据 ----
  const cli = await readJson('src/data/hermes/cli-commands.json')
  const config = await readJson('src/data/hermes/config-keys.json')
  const tools = await readJson('src/data/hermes/tools.json')
  const providers = await readJson('src/data/hermes/providers.json')
  const searchIndex = await readJson('src/data/hermes/search-index.json')

  check(cli.commands.length > 20, `CLI 命令条目过少：${cli.commands.length}`)
  check(config.entries.length > 20, `配置小节过少：${config.entries.length}`)
  check(config.totalKeys > 100, `配置键过少：${config.totalKeys}`)
  check(tools.toolsets.length > 10, `工具集过少：${tools.toolsets.length}`)
  check(providers.providers.length > 10, `provider 过少：${providers.providers.length}`)
  check(searchIndex.entries.length > 50, `搜索索引过少：${searchIndex.entries.length}`)

  const officialHost = 'https://hermes-agent.nousresearch.com'
  for (const command of cli.commands) {
    check(command.source?.url?.startsWith(officialHost), `命令 ${command.command} 缺少官方来源链接`)
  }
  for (const toolset of tools.toolsets) {
    check(toolset.source?.url?.startsWith(officialHost), `工具集 ${toolset.name} 缺少官方来源链接`)
  }
  for (const provider of providers.providers) {
    check(provider.source?.url?.startsWith(officialHost), `provider ${provider.name} 缺少官方来源链接`)
  }
  for (const entry of config.entries) {
    check(entry.url?.startsWith(officialHost), `配置小节 ${entry.title} 缺少官方来源链接`)
  }

  // ---- 4. 上游一致性 ----
  for (const [name, data] of Object.entries({ cli, config, tools, providers })) {
    check(
      data.commitSha === manifest.commitSha,
      `${name} 的数据来自 ${String(data.commitSha).slice(0, 7)}，与当前快照 ${String(
        manifest.commitSha,
      ).slice(0, 7)} 不一致，请重跑 npm run content:refresh`,
    )
  }
  check(manifest.license === 'MIT', `上游许可证应为 MIT，实际 ${manifest.license}`)

  notes.push(`上游 commit：${String(manifest.commitSha).slice(0, 7)}（${manifest.fetchedAt}）`)
  notes.push(
    `数据规模：${cli.commands.length} 条命令 / ${config.entries.length} 个配置小节（${config.totalKeys} 键）/ ${tools.toolsets.length} 个工具集 / ${providers.providers.length} 个 provider / ${searchIndex.entries.length} 条搜索索引`,
  )
  notes.push(`正文：${CONTENT_FILES.length} 个步骤文件，验收项 ${acceptanceItems} 条`)

  if (problems.length > 0) {
    console.error('内容校验失败：')
    for (const problem of problems) console.error(`  ✗ ${problem}`)
    process.exitCode = 1
    return
  }

  console.log('内容校验通过：')
  for (const note of notes) console.log(`  ✓ ${note}`)
}

main().catch((error) => {
  console.error('校验脚本自身出错：', error)
  process.exitCode = 1
})
