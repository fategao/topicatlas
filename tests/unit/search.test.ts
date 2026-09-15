// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { buildSearchIndex, searchItems } from '../../src/lib/search'

const index = buildSearchIndex({
  steps: [
    {
      id: 'installation',
      title: 'Installation',
      zhTitle: '安装 Hermes Agent',
      summary: '安装 Agent 并确认启动正常',
      url: '/hermes#step-installation',
    },
  ],
  commands: [
    { id: 'hermes-logs', title: 'hermes logs', summary: '查看、跟踪和过滤日志文件', url: 'https://example.com#logs' },
  ],
  configEntries: [
    { id: 'terminal', title: '终端后端配置', summary: 'terminal.backend 指定命令执行环境', url: 'https://example.com#terminal' },
  ],
  tools: [
    { id: 'file', title: 'file 工具集', summary: '读取与修改文件', url: 'https://example.com#file' },
  ],
  providers: [
    { id: 'openrouter', title: 'OpenRouter', summary: '设置 OPENROUTER_API_KEY', url: 'https://example.com#providers' },
  ],
})

describe('全局搜索索引', () => {
  it('索引里包含各类型条目，并带上类型标签', () => {
    expect(index.map((item) => item.kind)).toEqual(
      expect.arrayContaining(['step', 'command', 'config', 'tool', 'provider']),
    )
  })

  it('空查询返回空结果', () => {
    expect(searchItems(index, '   ')).toEqual([])
  })

  it('支持中文子串匹配', () => {
    const hits = searchItems(index, '日志')
    expect(hits.some((hit) => hit.id === 'hermes-logs')).toBe(true)
  })

  it('大小写不敏感，且能匹配英文命令名', () => {
    expect(searchItems(index, 'HERMES LOGS').some((hit) => hit.id === 'hermes-logs')).toBe(true)
  })

  it('标题命中的排在只命中描述的前面', () => {
    const hits = searchItems(index, '安装')
    expect(hits[0]?.id).toBe('installation')
  })

  it('遵守结果数量上限', () => {
    expect(searchItems(index, 'a', 2).length).toBeLessThanOrEqual(2)
  })

  it('没有命中时返回空数组', () => {
    expect(searchItems(index, '不存在的关键词zzz')).toEqual([])
  })
})
