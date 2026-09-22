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

  // ---- 4. Eval-driven Prompt 内容 ----
  const evalCases = await readJson('src/data/eval/cases.json')
  const evalPrompts = await readJson('src/data/eval/prompts.json')
  const evalSnapshot = await readJson('src/data/eval/snapshot.json')

  check(evalCases.length === 8, `Eval 用例应为 8 个，实际 ${evalCases.length}`)
  check(
    evalPrompts.map((prompt) => prompt.id).join(',') === 'v1,v2',
    'Eval Prompt 必须按 v1、v2 顺序各有一版',
  )
  check(
    new Set(evalCases.map((item) => item.id)).size === evalCases.length,
    'Eval 用例 id 不能重复',
  )
  check(
    evalCases.every(
      (item) =>
        item.ticket?.trim() &&
        ['Hardware', 'Software', 'Other'].includes(item.expectedLabel) &&
        ['typical', 'edge'].includes(item.category),
    ),
    'Eval 用例存在空 ticket、非法标签或非法类别',
  )
  check(
    evalPrompts.every((prompt) => prompt.userTemplate?.includes('{{ticket}}')),
    'Eval Prompt 缺少 {{ticket}} 数据插槽',
  )
  check(
    evalSnapshot.outputs.length === evalCases.length * evalPrompts.length,
    `Eval 快照应有 ${evalCases.length * evalPrompts.length} 条，实际 ${evalSnapshot.outputs.length}`,
  )
  check(
    evalSnapshot.outputs.every(
      (output) =>
        typeof output.raw === 'string' &&
        output.raw.trim().length > 0 &&
        Number.isFinite(output.outputTokens) &&
        output.outputTokens > 0,
    ),
    'Eval 快照存在空输出或非法 token 计数',
  )

  const outputKeys = new Set()
  for (const output of evalSnapshot.outputs) {
    const key = `${output.caseId}:${output.promptId}`
    check(!outputKeys.has(key), `Eval 快照重复：${key}`)
    outputKeys.add(key)
    check(
      evalCases.some((item) => item.id === output.caseId),
      `Eval 快照引用了未知用例：${output.caseId}`,
    )
    check(
      evalPrompts.some((item) => item.id === output.promptId),
      `Eval 快照引用了未知 Prompt：${output.promptId}`,
    )
  }
  check(Boolean(evalSnapshot.generatedAt), 'Eval 快照缺少 generatedAt')
  check(Boolean(evalSnapshot.model), 'Eval 快照缺少 model')
  check(Boolean(evalSnapshot.provider), 'Eval 快照缺少 provider')
  check(
    ['provider', 'estimated'].includes(evalSnapshot.tokenSource),
    'Eval 快照 tokenSource 只能是 provider 或 estimated',
  )
  check(
    Object.keys(evalSnapshot.promptHashes ?? {}).sort().join(',') === 'v1,v2',
    'Eval 快照缺少 v1/v2 Prompt hash',
  )
  check(
    !/sk-[A-Za-z0-9_-]{12,}/.test(JSON.stringify(evalSnapshot)),
    'Eval 快照疑似包含 API Key',
  )

  const evalSourcesSource = await readText('src/data/eval/sources.ts')
  check(
    evalSourcesSource.includes('https://developers.openai.com') &&
      evalSourcesSource.includes('https://docs.anthropic.com'),
    'Eval 来源必须包含 OpenAI 与 Anthropic 官方域名',
  )
  check(
    !/https?:\/\/(?!developers\.openai\.com|docs\.anthropic\.com)[^'"]+/.test(
      evalSourcesSource,
    ),
    'Eval 来源里出现了非官方域名',
  )

  // ---- 5. 上游一致性 ----
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
  notes.push(
    `Eval 主题：${evalCases.length} 个用例 / ${evalPrompts.length} 个 Prompt / ${evalSnapshot.outputs.length} 条快照（${evalSnapshot.model}）`,
  )

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
