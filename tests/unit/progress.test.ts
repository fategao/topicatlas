// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  PROGRESS_STORAGE_KEY,
  computeStats,
  emptyProgress,
  isStepComplete,
  parseProgress,
  serializeProgress,
  toggleItem,
} from '../../src/lib/progress'

const steps = [
  { id: 'installation', itemIds: ['a1', 'a2'] },
  { id: 'quickstart', itemIds: ['b1'] },
]

describe('进度状态', () => {
  it('初始状态没有任何勾选', () => {
    const state = emptyProgress()
    expect(isStepComplete(state, 'installation', ['a1', 'a2'])).toBe(false)
    expect(computeStats(state, steps)).toEqual({
      done: 0,
      total: 3,
      completedSteps: 0,
      totalSteps: 2,
      percent: 0,
    })
  })

  it('切换某一项会翻转它的勾选状态', () => {
    const once = toggleItem(emptyProgress(), 'installation', 'a1')
    expect(once.steps.installation?.items.a1).toBe(true)

    const twice = toggleItem(once, 'installation', 'a1')
    expect(twice.steps.installation?.items.a1).toBe(false)
  })

  it('勾选某一项不会影响其它步骤', () => {
    const state = toggleItem(emptyProgress(), 'installation', 'a1')
    expect(state.steps.quickstart?.items.b1).toBeUndefined()
  })

  it('只有当某一步的全部验收项都勾选后，该步才算完成', () => {
    const partial = toggleItem(emptyProgress(), 'installation', 'a1')
    expect(isStepComplete(partial, 'installation', ['a1', 'a2'])).toBe(false)

    const full = toggleItem(partial, 'installation', 'a2')
    expect(isStepComplete(full, 'installation', ['a1', 'a2'])).toBe(true)
  })

  it('统计完成项、完成步数与百分比', () => {
    const state = toggleItem(toggleItem(emptyProgress(), 'installation', 'a1'), 'quickstart', 'b1')
    expect(computeStats(state, steps)).toEqual({
      done: 2,
      total: 3,
      completedSteps: 1,
      totalSteps: 2,
      percent: 67,
    })
  })

  it('序列化后能原样解析回来', () => {
    const state = toggleItem(emptyProgress(), 'installation', 'a1')
    expect(parseProgress(serializeProgress(state))).toEqual(state)
  })

  it('空值、损坏的 JSON、结构不对的数据都退回空进度，而不是抛错', () => {
    expect(parseProgress(null)).toEqual(emptyProgress())
    expect(parseProgress('{ not json')).toEqual(emptyProgress())
    expect(parseProgress('"just a string"')).toEqual(emptyProgress())
    expect(parseProgress('{"version":1,"steps":"nope"}')).toEqual(emptyProgress())
  })

  it('解析时丢弃结构不合法的步骤条目', () => {
    const raw = JSON.stringify({
      version: 1,
      steps: {
        installation: { items: { a1: true }, updatedAt: '2026-01-01T00:00:00.000Z' },
        broken: { items: 'nope' },
      },
    })
    expect(parseProgress(raw)).toEqual({
      version: 1,
      steps: { installation: { items: { a1: true }, updatedAt: '2026-01-01T00:00:00.000Z' } },
    })
  })

  it('进度存储键包含主题与版本，避免不同主题互相覆盖', () => {
    expect(PROGRESS_STORAGE_KEY).toBe('topicatlas:progress:hermes:v1')
  })
})
