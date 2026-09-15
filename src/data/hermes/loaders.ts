/**
 * 参考数据按需加载：只有用户真的打开某个参考视图或全局搜索时，
 * 对应的 JSON 才会被下载（Vite 会把它们拆成独立的 chunk）。
 */

import type {
  CliCommandsData,
  ConfigKeysData,
  ProvidersData,
  SearchIndexData,
  ToolsData,
} from './types'

export async function loadCliCommands(): Promise<CliCommandsData> {
  const mod = await import('./cli-commands.json')
  return mod.default as unknown as CliCommandsData
}

export async function loadConfigKeys(): Promise<ConfigKeysData> {
  const mod = await import('./config-keys.json')
  return mod.default as unknown as ConfigKeysData
}

export async function loadTools(): Promise<ToolsData> {
  const mod = await import('./tools.json')
  return mod.default as unknown as ToolsData
}

export async function loadProviders(): Promise<ProvidersData> {
  const mod = await import('./providers.json')
  return mod.default as unknown as ProvidersData
}

export async function loadSearchIndex(): Promise<SearchIndexData> {
  const mod = await import('./search-index.json')
  return mod.default as unknown as SearchIndexData
}

/** 供 UI 显示「数据来自哪个上游提交」的统一格式化。 */
export function shortSha(sha: string): string {
  return sha.slice(0, 7)
}
