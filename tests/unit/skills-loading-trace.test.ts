import { describe, expect, it } from 'vitest'
import type { SkillTraceEvent } from '../../src/data/skills-loading/types'
import {
  cumulativeContextTokens,
  loadedFiles,
  usageTotal,
} from '../../src/data/skills-loading/trace'

const events: SkillTraceEvent[] = [
  {
    id: 'one',
    ordinal: 1,
    kind: 'metadata',
    level: 'metadata',
    observability: 'computed',
    title: 'metadata',
    summary: '',
    status: 'passed',
    contextCharsAdded: 400,
    contextTokensAdded: 100,
    tokenLabel: 'estimated',
  },
  {
    id: 'two',
    ordinal: 2,
    kind: 'read',
    level: 'instructions',
    observability: 'observed',
    title: 'body',
    summary: '',
    file: '.agents/skills/demo/SKILL.md',
    status: 'passed',
    contextCharsAdded: 80,
    contextTokensAdded: 20,
    tokenLabel: 'estimated',
  },
]

describe('skills loading trace helpers', () => {
  it('只累计当前事件及之前的上下文 token', () => {
    expect(cumulativeContextTokens(events, 0)).toBe(100)
    expect(cumulativeContextTokens(events, 1)).toBe(120)
  })

  it('文件只有在被读取后才标记为 loaded', () => {
    expect(loadedFiles(events, 0).size).toBe(0)
    expect([...loadedFiles(events, 1)]).toEqual(['.agents/skills/demo/SKILL.md'])
  })

  it('provider total 只把 input、cached input、output 相加', () => {
    expect(
      usageTotal({ inputTokens: 10, cachedInputTokens: 20, outputTokens: 5 }),
    ).toBe(35)
  })
})
