import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RUBRIC_WEIGHTS,
  buildEvaluation,
  parseClassification,
} from '../../src/data/eval/score'
import { evalCases } from '../../src/data/eval/dataset'
import snapshotJson from '../../src/data/eval/snapshot.json'
import type { EvalCase, EvalSnapshot, EvalSnapshotOutput } from '../../src/data/eval/types'

const cases: EvalCase[] = [
  {
    id: 'hardware-boot',
    title: '无法开机',
    ticket: 'Laptop will not boot after the battery was replaced.',
    expectedLabel: 'Hardware',
    category: 'typical',
    note: '明确指向硬件。',
  },
  {
    id: 'software-driver',
    title: '驱动升级后断网',
    ticket: 'Wi-Fi keeps dropping after the latest network driver update.',
    expectedLabel: 'Software',
    category: 'edge',
    note: '硬件可以联网，但故障由驱动版本引入。',
  },
]

const outputs: EvalSnapshotOutput[] = [
  {
    caseId: 'hardware-boot',
    promptId: 'v1',
    raw: 'Hardware',
    latencyMs: 40,
    inputTokens: 20,
    outputTokens: 2,
  },
  {
    caseId: 'hardware-boot',
    promptId: 'v2',
    raw: '{"label":"Hardware"}',
    latencyMs: 55,
    inputTokens: 70,
    outputTokens: 8,
  },
  {
    caseId: 'software-driver',
    promptId: 'v1',
    raw: 'Software.',
    latencyMs: 42,
    inputTokens: 20,
    outputTokens: 3,
  },
  {
    caseId: 'software-driver',
    promptId: 'v2',
    raw: '{"label":"Hardware"}',
    latencyMs: 58,
    inputTokens: 70,
    outputTokens: 8,
  },
]

describe('eval 输出解析', () => {
  it('从代码围栏 JSON 中提取合法标签', () => {
    expect(parseClassification('```json\n{"label":"Software"}\n```')).toEqual({
      label: 'Software',
      formatCompliant: true,
      parseIssue: null,
    })
  })

  it('标签正确但格式不合格时只给标签正确分', () => {
    expect(parseClassification('The category is Hardware.')).toEqual({
      label: 'Hardware',
      formatCompliant: false,
      parseIssue: '未返回严格 JSON',
    })
  })

  it('额外字段或非法标签都判为格式不合规', () => {
    expect(parseClassification('{"label":"Other","confidence":1}').formatCompliant).toBe(false)
    expect(parseClassification('{"label":"Printer"}')).toEqual({
      label: null,
      formatCompliant: false,
      parseIssue: '标签不在允许集合内',
    })
  })
})

describe('Prompt 对比评分', () => {
  it('按默认权重聚合四个维度并选出胜者', () => {
    const comparison = buildEvaluation(cases, outputs, DEFAULT_RUBRIC_WEIGHTS, 60)

    expect(comparison.runs.v1.averageScore).toBeGreaterThan(comparison.runs.v2.averageScore)
    expect(comparison.winner).toBe('v1')
    expect(comparison.runs.v1.criteria).toMatchObject({
      labelAccuracy: 1,
      formatCompliance: 0,
      edgeCaseHandling: 1,
    })
    expect(comparison.runs.v2.criteria).toMatchObject({
      labelAccuracy: 0.5,
      formatCompliance: 1,
      edgeCaseHandling: 0,
    })
  })

  it('当格式合规权重占主导时，胜者会切换为 v2', () => {
    const formatFirst = {
      labelAccuracy: 1,
      formatCompliance: 9,
      edgeCaseHandling: 0,
      efficiency: 0,
    }
    const comparison = buildEvaluation(cases, outputs, formatFirst, 60)

    expect(comparison.winner).toBe('v2')
    expect(comparison.runs.v2.averageScore).toBeGreaterThan(comparison.runs.v1.averageScore)
  })

  it('空输出不会抛错，并会被计为失败样本', () => {
    const malformed = outputs.map((output) =>
      output.promptId === 'v1' ? { ...output, raw: '' } : output,
    )
    const comparison = buildEvaluation(cases, malformed, DEFAULT_RUBRIC_WEIGHTS, 60)

    expect(comparison.runs.v1.criteria.labelAccuracy).toBe(0)
    expect(comparison.runs.v1.passRate).toBe(0)
    expect(comparison.runs.v1.cases[0]?.parseIssue).toBe('空输出')
  })

  it('边界用例维度只统计 edge 用例', () => {
    const comparison = buildEvaluation(cases, outputs, DEFAULT_RUBRIC_WEIGHTS, 60)

    expect(comparison.runs.v1.criteria.edgeCaseHandling).toBe(1)
    expect(comparison.runs.v2.criteria.edgeCaseHandling).toBe(0)
  })

  it('维度比率保留小数精度，不把 75% 放大成 80%', () => {
    const snapshot = snapshotJson as unknown as EvalSnapshot
    const comparison = buildEvaluation(
      evalCases,
      snapshot.outputs,
      DEFAULT_RUBRIC_WEIGHTS,
      60,
    )

    expect(comparison.runs.v1.criteria.labelAccuracy).toBeCloseTo(0.75, 5)
    expect(comparison.runs.v1.criteria.edgeCaseHandling).toBeCloseTo(0.75, 5)
    expect(comparison.runs.v1.averageScore).toBeCloseTo(54.6, 1)
  })
})
