/** src/data/hermes/*.json 的读取类型。字段由 scripts/extract-data.mjs 生成。 */

export type SourceRef = {
  url: string
  file: string
  anchor?: string
  title?: string
}

export type TableBlock = {
  title: string
  head: string[]
  rows: string[][]
}

export type CliCommandEntry = {
  id: string
  command: string
  usage: string
  summary: string
  tables: TableBlock[]
  examples: { title: string; lang: string; code: string }[]
  notes: string[]
  source: SourceRef
}

export type CliCommandsData = {
  module: string
  commitSha: string
  fetchedAt: string
  license: string
  zhUrl: string
  enUrl: string
  totalCommands: number
  topLevel: { command: string; purpose: string }[]
  globalOptions: TableBlock[]
  commands: CliCommandEntry[]
}

export type ConfigEntry = {
  id: string
  title: string
  depth: number
  anchor: string
  summary: string
  keys: { key: string; value: string; comment: string }[]
  snippets: string[]
  url: string
}

export type ConfigKeysData = {
  commitSha: string
  fetchedAt: string
  license: string
  zhUrl: string
  enUrl: string
  totalSections: number
  totalKeys: number
  docLineCount: number
  entries: ConfigEntry[]
}

export type ToolsetEntry = {
  id: string
  name: string
  summary: string
  tools: { name: string; description: string; requires: string }[]
  source: SourceRef
}

export type ToolsData = {
  commitSha: string
  fetchedAt: string
  license: string
  zhUrl: string
  enUrl: string
  totalToolsets: number
  totalTools: number
  overview: { id: string; title: string; anchor: string; summary: string; url: string }[]
  toolsets: ToolsetEntry[]
  toolsetsReference: { id: string; title: string; depth: number; anchor: string; summary: string; url: string }[]
}

export type ProviderEntry = {
  id: string
  name: string
  providerId: string
  method: string
  envVars: string[]
  authMode: 'oauth' | 'api-key' | 'custom' | 'local' | 'manual'
  source: SourceRef
}

export type ProvidersData = {
  commitSha: string
  fetchedAt: string
  license: string
  zhUrl: string
  enUrl: string
  totalProviders: number
  providers: ProviderEntry[]
  sections: { id: string; title: string; depth: number; anchor: string; summary: string; url: string }[]
  modelConfig: {
    source: { url: string; file: string }
    mainModelBlock: string
    yamlSamples: string[]
  }
}

export type SearchIndexEntry = {
  id: string
  kind: 'command' | 'config' | 'tool' | 'provider'
  title: string
  summary: string
  url: string
}

export type SearchIndexData = {
  generatedAt: string
  commitSha: string
  total: number
  entries: SearchIndexEntry[]
}
