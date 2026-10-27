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
import { createHash } from 'node:crypto'
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

  // ---- 5. 双 Agent 可观测实验 ----
  const observatory = await readJson('src/data/observatory/snapshot.json')
  check(observatory.schemaVersion === 1, 'Agent 快照 schemaVersion 必须为 1')
  check(Boolean(observatory.runId), 'Agent 快照缺少 runId')
  check(
    observatory.product?.route === '/agent-observatory/matrix-lab',
    'Agent 快照产品路由不正确',
  )
  check(
    ['completed', 'failed'].includes(observatory.status),
    'Agent 快照状态只能是 completed 或 failed',
  )
  check(
    ['provider', 'estimated'].includes(observatory.agent?.tokenSource),
    'Agent tokenSource 只能是 provider 或 estimated',
  )
  check(
    observatory.agent?.provider && observatory.agent?.model,
    'Agent 快照缺少 provider 或 model',
  )
  check(observatory.monitor?.summary, 'Agent 快照缺少监控 Agent 结论')
  check(
    Array.isArray(observatory.monitor?.observations) &&
      observatory.monitor.observations.length >= 3,
    '监控 Agent 至少应给出 3 条观察',
  )

  const observatoryEvents = Array.isArray(observatory.events) ? observatory.events : []
  const observatorySources = Array.isArray(observatory.sources) ? observatory.sources : []
  check(observatoryEvents.length >= 10, 'Agent 快照公开事件过少')
  check(
    new Set(observatoryEvents.map((event) => event.id)).size === observatoryEvents.length,
    'Agent 快照事件 id 不能重复',
  )
  check(
    observatoryEvents.every(
      (event, index) =>
        event.id &&
        event.title &&
        event.summary &&
        event.startedAt &&
        ['message', 'command', 'file', 'tool', 'test', 'error'].includes(event.kind) &&
        ['passed', 'failed', 'pending'].includes(event.status) &&
        (index === 0 ||
          Date.parse(event.startedAt) >= Date.parse(observatoryEvents[index - 1].startedAt)),
    ),
    'Agent 事件存在空字段、非法类型或乱序时间',
  )
  check(
    !JSON.stringify(observatory).includes('"reasoning"'),
    'Agent 快照不得包含 reasoning 事件',
  )
  check(
    !/sk-[A-Za-z0-9_-]{12,}/.test(JSON.stringify(observatory)),
    'Agent 快照疑似包含 API Key',
  )

  const sourcePaths = new Set()
  for (const source of observatorySources) {
    check(source.path && typeof source.sha256 === 'string', `Agent 源码缺少路径或哈希：${source.path}`)
    check(Array.isArray(source.lines) && source.lines.length > 0, `Agent 源码为空：${source.path}`)
    check(!sourcePaths.has(source.path), `Agent 源码重复：${source.path}`)
    sourcePaths.add(source.path)
    const actual = await readText(source.path)
    const hash = createHash('sha256').update(actual).digest('hex')
    check(hash === source.sha256, `Agent 源码哈希不一致：${source.path}`)
  }

  for (const event of observatoryEvents) {
    for (const ref of event.sourceRefs ?? []) {
      const source = observatorySources.find((item) => item.path === ref.file)
      check(Boolean(source), `Agent 事件 ${event.id} 引用了未知源码：${ref.file}`)
      if (!source) continue
      check(
        ref.startLine >= 1 && ref.endLine >= ref.startLine && ref.endLine <= source.lines.length,
        `Agent 事件 ${event.id} 的源码行段越界：${ref.file}`,
      )
      check(Boolean(ref.symbol), `Agent 事件 ${event.id} 缺少源码符号`)
    }
  }

  // ---- 6. 上游一致性 ----
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
  notes.push(
    `Agent 实验：${observatoryEvents.length} 条公开事件 / ${observatorySources.length} 个源码文件 / ${observatory.agent.tokenCount} 估算 token`,
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
