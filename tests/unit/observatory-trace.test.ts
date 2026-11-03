import { describe, expect, it } from 'vitest'
import {
  COMPOSITION_SEGMENTS,
  buildFlatSteps,
  compositionMax,
  formatClock,
  formatDuration,
  redactTraceText,
  tokenTotal,
} from '../../src/features/agent-observatory/trace'
import type { AgentRun, Composition } from '../../src/features/agent-observatory/types'
import snapshotJson from '../../src/data/observatory/snapshot.json'

const snapshot = snapshotJson as unknown as { runs: AgentRun[] }

describe('Agent 轨迹工具函数', () => {
  it('格式化真实墙钟与耗时', () => {
    expect(formatDuration(330_766)).toBe('5m 31s')
    expect(formatDuration(9728)).toBe('9.7 s')
    expect(formatDuration(0)).toBe('0 ms')
    expect(formatClock('2026-09-15T04:20:45.890Z')).toBe('04:20:45')
    expect(formatClock('not-a-date')).toBe('--:--:--')
  })

  it('tokenTotal 只汇总真实存在的 usage 字段', () => {
    expect(
      tokenTotal({
        input: 2,
        output: 184,
        cacheRead: 11_661,
        cacheWrite: 31_148,
        thinking: 58,
        cachePct: 27,
        source: 'provider',
        total: 42_995,
      }),
    ).toBe(42_995)
    expect(
      tokenTotal({
        input: null,
        output: null,
        cacheRead: null,
        cacheWrite: null,
        thinking: null,
        source: 'estimated',
        total: 57_413,
      }),
    ).toBe(57_413)
    expect(tokenTotal(null)).toBeNull()
  })

  it('flat steps 按真实开始时间排序，而不是按 loop 顺序', () => {
    const reference = snapshot.runs.find((run) => run.id === 'cctrace-reference')
    expect(reference).toBeTruthy()
    const flat = buildFlatSteps(reference!)
    expect(flat.length).toBe(reference!.metrics.stepCount)
    expect(flat[0].step.startedAt).toBe('2026-09-15T04:20:45.890Z')
    for (let index = 1; index < flat.length; index += 1) {
      expect(Date.parse(flat[index].step.startedAt)).toBeGreaterThanOrEqual(
        Date.parse(flat[index - 1].step.startedAt),
      )
    }
    expect(flat.some((item) => item.loop.kind === 'subagent')).toBe(true)
  })

  it('脱敏密钥、令牌和本机用户目录', () => {
    const result = redactTraceText(
      'sk-secretvalue123456 token=abc123 C:\\Users\\alice\\project api_key=hello',
    )

    expect(result).not.toContain('secretvalue')
    expect(result).not.toContain('abc123')
    expect(result).not.toContain('alice')
    expect(result).toContain('[REDACTED]')
  })

  it('上下文构成有六个分类且按最大值归一化', () => {
    const composition: Composition = {
      system: 3596,
      tools: 7723,
      user: 3640,
      inject: 12493,
      assistant: 0,
      toolResult: 0,
      total: 27452,
      source: 'cctrace-demo-data',
    }

    expect(COMPOSITION_SEGMENTS).toHaveLength(6)
    expect(compositionMax(composition)).toBe(12493)
  })
})
