#!/usr/bin/env node
// 把官方文档快照（content/upstream/）抽成站点可直接消费的结构化数据
// （src/data/hermes/*.json）。所有条目都带 source 字段指回官方文档锚点，
// 保证站点上看到的每一条命令/配置项/工具都能被核对。
//
// 用法：node scripts/extract-data.mjs

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MODULES, moduleById } from './modules.mjs'
import { firstParagraph, flattenSections, parseBlocks, stripInline, toSectionTree } from './markdown.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const upstreamDir = path.join(root, 'content', 'upstream')
const outDir = path.join(root, 'src', 'data', 'hermes')

const manifest = JSON.parse(await readFile(path.join(upstreamDir, 'manifest.json'), 'utf8'))

const sourceHeader = (id) => {
  const module_ = moduleById(id)
  return {
    module: id,
    repo: manifest.repo,
    commitSha: manifest.commitSha,
    fetchedAt: manifest.fetchedAt,
    license: manifest.license,
    zhUrl: module_.zhUrl,
    enUrl: module_.enUrl,
  }
}

function snapshotPath(id, locale) {
  const entry = manifest.files.find((f) => f.id === id)
  if (!entry?.[locale]) throw new Error(`manifest 中缺少 ${id} 的 ${locale} 快照`)
  return path.join(root, entry[locale].snapshot)
}

async function loadSections(id, locale = 'zh') {
  const text = await readFile(snapshotPath(id, locale), 'utf8')
  return { text, sections: flattenSections(toSectionTree(parseBlocks(text))) }
}

const anchorOf = (module_, anchor) => `${module_.zhUrl}#${anchor}`

/** 从一组块里挑出第一段有实质内容的文字。 */
function firstMeaningfulParagraph(blocks, maxLength = 260) {
  for (const block of blocks) {
    if (block.kind === 'paragraph' && block.text.length > 12) {
      return block.text.length > maxLength ? `${block.text.slice(0, maxLength - 1)}…` : block.text
    }
  }
  return ''
}

function codeBlocks(blocks) {
  return blocks.filter((b) => b.kind === 'code')
}

// ---------------------------------------------------------------------------
// 1. CLI 命令参考
// ---------------------------------------------------------------------------

async function extractCli() {
  const id = 'cli-commands'
  const module_ = moduleById(id)
  const { sections } = await loadSections(id)

  // 层级约定：`#` → depth 0，`##` → depth 1，`###` → depth 2
  const topLevelSection = sections.find((s) => s.depth === 1 && /顶级命令/.test(s.text))
  const topLevelTable = topLevelSection?.content.find((b) => b.kind === 'table')
  const topLevel = (topLevelTable?.rows ?? []).map((row) => ({
    command: row[0] ?? '',
    purpose: row[1] ?? '',
  }))

  const commandSections = sections.filter((s) => s.depth === 1 && s.text.trim().startsWith('`hermes'))
  const bareSections = sections.filter((s) => s.depth === 1 && !s.text.trim().startsWith('`hermes'))

  const commands = commandSections.map((section) => {
    const name = stripInline(section.text)
    const codes = codeBlocks(section.content)
    const usageBlock = codes.find((c) => /^(bash|sh|shell|text)$/i.test(c.lang)) ?? codes[0]
    const usage = usageBlock ? usageBlock.value.split('\n')[0].trim() : ''
    const summary = firstMeaningfulParagraph(section.content)

    const tables = []
    const examples = []
    const notes = []

    const collect = (node, childTitle) => {
      for (const block of node.content) {
        if (block.kind === 'table') tables.push({ title: childTitle, head: block.head, rows: block.rows })
        if (block.kind === 'code') {
          if (block === usageBlock) continue
          examples.push({ title: childTitle, lang: block.lang, code: block.value })
        }
        if (block.kind === 'admonition') notes.push(block.text)
        if (block.kind === 'paragraph' && childTitle && block.text.length > 20) notes.push(block.text)
      }
      for (const child of node.children) collect(child, child.text)
    }
    collect(section, '')

    return {
      id: `${name.replace(/[^\w]+/g, '-')}`,
      command: name,
      usage,
      summary,
      tables,
      examples,
      notes: notes.slice(0, 4),
      source: { url: anchorOf(module_, section.anchor), file: module_.zhPath, anchor: section.anchor, title: section.text },
    }
  })

  const globalSection = bareSections.find((s) => /全局/.test(s.text))
  const globalTables = []
  if (globalSection) {
    for (const block of globalSection.content) {
      if (block.kind === 'table') globalTables.push({ title: globalSection.text, head: block.head, rows: block.rows })
    }
    for (const child of globalSection.children) {
      for (const block of child.content) {
        if (block.kind === 'table') globalTables.push({ title: child.text, head: block.head, rows: block.rows })
      }
    }
  }

  const data = {
    ...sourceHeader(id),
    generatedAt: new Date().toISOString(),
    totalCommands: commands.length,
    topLevel,
    globalOptions: globalTables,
    commands,
  }
  await writeJson('cli-commands.json', data)
  console.log(`  ✓ cli-commands.json：${commands.length} 个命令，${topLevel.length} 条顶级命令`)
}

// ---------------------------------------------------------------------------
// 2. 配置参考
// ---------------------------------------------------------------------------

const YAML_KEY = /^\s*([A-Za-z_][\w.\-]*)\s*:\s*(.*)$/

function extractKeysFromYaml(code) {
  const keys = []
  for (const rawLine of code.split('\n')) {
    const line = rawLine.replace(/\s+$/, '')
    if (!line.trim() || line.trim().startsWith('#')) continue
    const match = YAML_KEY.exec(line)
    if (!match) continue
    const [, key, rest] = match
    const commentIndex = rest.indexOf('#')
    const value = (commentIndex >= 0 ? rest.slice(0, commentIndex) : rest).trim()
    const comment = commentIndex >= 0 ? rest.slice(commentIndex + 1).trim() : ''
    if (!value && !comment) continue
    keys.push({ key, value: value || '', comment })
  }
  return keys
}

async function extractConfig() {
  const id = 'configuration'
  const module_ = moduleById(id)
  const { text, sections } = await loadSections(id)

  const entries = sections.map((section) => {
    const yamlBlocks = codeBlocks(section.content).filter((c) => /^(ya?ml)$/i.test(c.lang))
    const keys = yamlBlocks.flatMap((block) => extractKeysFromYaml(block.value))
    return {
      id: section.anchor,
      title: stripInline(section.text),
      depth: section.depth,
      anchor: section.anchor,
      summary: firstMeaningfulParagraph(section.content, 200),
      keys,
      snippets: yamlBlocks.slice(0, 4).map((block) => block.value),
      url: anchorOf(module_, section.anchor),
    }
  })

  const totalKeys = entries.reduce((sum, entry) => sum + entry.keys.length, 0)
  const data = {
    ...sourceHeader(id),
    generatedAt: new Date().toISOString(),
    totalSections: entries.length,
    totalKeys,
    docLineCount: text.split('\n').length,
    entries,
  }
  await writeJson('config-keys.json', data)
  console.log(`  ✓ config-keys.json：${entries.length} 个小节，${totalKeys} 个配置键`)
}

// ---------------------------------------------------------------------------
// 3. 工具集与工具参考
// ---------------------------------------------------------------------------

async function extractTools() {
  const referenceId = 'tools-reference'
  const referenceModule = moduleById(referenceId)
  const { sections } = await loadSections(referenceId)

  const toolsetSections = sections.filter((s) => s.depth <= 1 && /工具集/.test(s.text))
  const toolsets = toolsetSections
    .map((section) => {
      const table = section.content.find((b) => b.kind === 'table' && b.head.length >= 2)
      const tools = (table?.rows ?? []).map((row) => ({
        name: stripInline(row[0] ?? ''),
        description: row[1] ?? '',
        requires: row[2] ?? '',
      }))
      return {
        id: section.anchor,
        name: stripInline(section.text),
        summary: firstMeaningfulParagraph(section.content, 200),
        tools,
        source: {
          url: anchorOf(referenceModule, section.anchor),
          file: referenceModule.zhPath,
          anchor: section.anchor,
        },
      }
    })
    .filter((toolset) => toolset.tools.length > 0)

  const totalTools = toolsets.reduce((sum, t) => sum + t.tools.length, 0)

  const overviewId = 'tools'
  const overviewModule = moduleById(overviewId)
  const { sections: overviewSections } = await loadSections(overviewId)
  const overview = overviewSections
    .filter((s) => s.depth === 1)
    .map((section) => ({
      id: section.anchor,
      title: stripInline(section.text),
      anchor: section.anchor,
      summary: firstMeaningfulParagraph(section.content, 220),
      url: anchorOf(overviewModule, section.anchor),
    }))

  const toolsetsRefId = 'toolsets-reference'
  const toolsetsRefModule = moduleById(toolsetsRefId)
  const { sections: toolsetsRefSections } = await loadSections(toolsetsRefId)
  const toolsetsReference = toolsetsRefSections
    .filter((s) => s.depth <= 2)
    .map((section) => ({
      id: section.anchor,
      title: stripInline(section.text),
      depth: section.depth,
      anchor: section.anchor,
      summary: firstMeaningfulParagraph(section.content, 220),
      url: anchorOf(toolsetsRefModule, section.anchor),
    }))

  const data = {
    ...sourceHeader(referenceId),
    generatedAt: new Date().toISOString(),
    totalToolsets: toolsets.length,
    totalTools,
    overview,
    toolsets,
    toolsetsReference,
  }
  await writeJson('tools.json', data)
  console.log(`  ✓ tools.json：${toolsets.length} 个工具集，${totalTools} 个工具`)
}

// ---------------------------------------------------------------------------
// 4. Provider 与模型配置
// ---------------------------------------------------------------------------

const ENV_VAR = /`([A-Z][A-Z0-9_]{2,})`/g
const PROVIDER_ID = /provider:\s*`([a-z0-9][a-z0-9-]*)`/i

async function extractProviders() {
  const id = 'providers'
  const module_ = moduleById(id)
  const { sections } = await loadSections(id)

  const tableSection = sections.find((s) => s.depth === 1 && /推理提供商/.test(s.text))
  const table = tableSection?.content.find((b) => b.kind === 'table' && b.head.length >= 2)

  const providers = (table?.rows ?? []).map((row) => {
    const name = stripInline(row[0] ?? '')
    const method = stripInline(row[1] ?? '')
    const envVars = [...method.matchAll(ENV_VAR)].map((m) => m[1])
    const providerId = PROVIDER_ID.exec(method)?.[1] ?? ''
    const isCustom = /自定义端点|Custom endpoint/i.test(name)
    const isOauth = /OAuth/i.test(method) || /hermes model/.test(method)
    const isLocal = /LM Studio|Ollama|本地/i.test(name)
    const authMode = isCustom ? 'custom' : isLocal ? 'local' : envVars.length > 0 && !isOauth ? 'api-key' : isOauth ? 'oauth' : 'manual'
    return {
      id: providerId || name.toLowerCase().replace(/[^\w]+/g, '-'),
      name,
      providerId,
      method,
      envVars: [...new Set(envVars)],
      authMode,
      source: {
        url: anchorOf(module_, tableSection?.anchor ?? ''),
        file: module_.zhPath,
        anchor: tableSection?.anchor ?? '',
      },
    }
  })

  const sectionsIndex = sections
    .filter((s) => s.depth <= 2)
    .map((section) => ({
      id: section.anchor,
      title: stripInline(section.text),
      depth: section.depth,
      anchor: section.anchor,
      summary: firstMeaningfulParagraph(section.content, 200),
      url: anchorOf(module_, section.anchor),
    }))

  const modelsId = 'configuring-models'
  const modelsModule = moduleById(modelsId)
  const { sections: modelSections } = await loadSections(modelsId)

  // 配置生成器的权威依据：官方文档里真实写入 config.yaml 的字段形状。
  const yamlOfModels = modelSections
    .flatMap((s) => codeBlocks(s.content))
    .filter((c) => /^(ya?ml)$/i.test(c.lang))
    .map((c) => c.value)

  const mainModelBlock = yamlOfModels.find((v) => /^model:/m.test(v) && /provider:/.test(v)) ?? ''

  const data = {
    ...sourceHeader(id),
    generatedAt: new Date().toISOString(),
    totalProviders: providers.length,
    providers,
    sections: sectionsIndex,
    modelConfig: {
      source: {
        url: `${modelsModule.zhUrl}#写入-configyaml-的内容`,
        file: modelsModule.zhPath,
      },
      mainModelBlock,
      yamlSamples: yamlOfModels.slice(0, 6),
    },
  }
  await writeJson('providers.json', data)
  console.log(`  ✓ providers.json：${providers.length} 个 provider`)
}

// ---------------------------------------------------------------------------

async function writeJson(name, data) {
  await mkdir(outDir, { recursive: true })
  await writeFile(path.join(outDir, name), `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

/**
 * 供 ⌘K 全局搜索使用的瘦索引。
 * 只有 id/类型/标题/摘要/链接，避免为了搜索把几百 KB 的参考数据全部加载进来。
 */
async function writeSearchIndex() {
  await writeJson('upstream-meta.json', {
    repo: manifest.repo,
    repoUrl: manifest.repoUrl,
    commitSha: manifest.commitSha,
    commitUrl: manifest.commitUrl,
    fetchedAt: manifest.fetchedAt,
    license: manifest.license,
    fileCount: manifest.fileCount,
  })

  const [cli, config, tools, providers] = await Promise.all([
    readJson('cli-commands.json'),
    readJson('config-keys.json'),
    readJson('tools.json'),
    readJson('providers.json'),
  ])

  const slim = (text, max = 140) => {
    const value = (text ?? '').replace(/\s+/g, ' ').trim()
    return value.length > max ? `${value.slice(0, max - 1)}…` : value
  }

  const entries = [
    ...cli.commands.map((command) => ({
      id: `cmd-${command.id}`,
      kind: 'command',
      title: command.command,
      summary: slim(command.summary || command.usage),
      url: command.source.url,
    })),
    ...config.entries
      .filter((entry) => entry.keys.length > 0 || entry.summary)
      .map((entry) => ({
        id: `cfg-${entry.id}`,
        kind: 'config',
        title: entry.title,
        summary: slim(entry.summary || entry.keys.slice(0, 3).map((k) => k.key).join('、')),
        url: entry.url,
      })),
    ...tools.toolsets.map((toolset) => ({
      id: `tool-${toolset.id}`,
      kind: 'tool',
      title: toolset.name,
      summary: slim(`${toolset.tools.length} 个工具 · ${toolset.tools.slice(0, 4).map((t) => t.name).join('、')}`),
      url: toolset.source.url,
    })),
    ...providers.providers.map((provider) => ({
      id: `provider-${provider.id}`,
      kind: 'provider',
      title: provider.name,
      summary: slim(provider.method),
      url: provider.source.url,
    })),
  ]

  await writeJson('search-index.json', {
    generatedAt: new Date().toISOString(),
    commitSha: manifest.commitSha,
    total: entries.length,
    entries,
  })
  console.log(`  ✓ search-index.json：${entries.length} 条可搜索条目`)
}

async function readJson(name) {
  return JSON.parse(await readFile(path.join(outDir, name), 'utf8'))
}

async function main() {
  console.log(`从 content/upstream/ 抽取结构化数据（上游 commit ${manifest.commitSha.slice(0, 7)}）`)
  await extractCli()
  await extractConfig()
  await extractTools()
  await extractProviders()
  await writeSearchIndex()
  console.log('\n抽取完成 → src/data/hermes/')
}

main().catch((error) => {
  console.error('\n抽取失败：', error)
  process.exitCode = 1
})

export { MODULES }
