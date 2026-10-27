import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AgentObservatory } from '../../src/features/agent-observatory/AgentObservatory'
import type { ObservatorySnapshot } from '../../src/features/agent-observatory/types'

const fixture: ObservatorySnapshot = {
  schemaVersion: 1,
  runId: 'run-test',
  generatedAt: '2026-10-27T10:00:00.000Z',
  status: 'completed',
  product: {
    name: '矩阵实验室',
    route: '/agent-observatory/matrix-lab',
  },
  agent: {
    provider: 'OpenAI Codex CLI',
    model: 'test-model',
    tokenSource: 'provider',
    durationMs: 65_000,
    requestCount: 3,
    toolCallCount: 4,
    tokenCount: 1_234,
  },
  events: [
    {
      id: 'spec',
      phase: '规格',
      kind: 'message',
      status: 'passed',
      title: '冻结数学与交互契约',
      summary: '确定矩阵字段、挑战和可访问性要求。',
      startedAt: '2026-10-27T10:00:00.000Z',
      targets: ['src/features/matrix-lab'],
      sourceRefs: [],
    },
    {
      id: 'command',
      phase: '验证',
      kind: 'test',
      status: 'passed',
      title: '运行矩阵数学测试',
      summary: '全部测试通过。',
      startedAt: '2026-10-27T10:00:10.000Z',
      durationMs: 4_200,
      targets: ['tests/unit/matrix-math.test.ts'],
      sourceRefs: [
        {
          file: 'src/features/matrix-lab/matrixMath.ts',
          symbol: 'determinant',
          startLine: 1,
          endLine: 3,
        },
      ],
    },
    {
      id: 'error',
      phase: '验证',
      kind: 'test',
      status: 'failed',
      title: '首次类型检查失败',
      summary: '发现一个未处理的边界状态。',
      startedAt: '2026-10-27T10:00:20.000Z',
      targets: ['MatrixLab.tsx'],
      sourceRefs: [],
    },
  ],
  sources: [
    {
      path: 'src/features/matrix-lab/matrixMath.ts',
      language: 'ts',
      sha256: 'test-hash',
      lines: ['export function determinant', '  return 1', '}'],
    },
  ],
}

describe('双 Agent 可观测实验室', () => {
  it('展示真实运行元数据并默认选中首条事件', () => {
    render(<AgentObservatory snapshot={fixture} />)

    expect(screen.getByTestId('run-status')).toHaveTextContent('已完成')
    expect(screen.getByText('test-model')).toBeVisible()
    expect(screen.getByTestId('active-event')).toHaveTextContent('冻结数学与交互契约')
  })

  it('可以筛选失败事件并跳到对应检查器', () => {
    render(<AgentObservatory snapshot={fixture} />)

    fireEvent.click(screen.getByRole('button', { name: /错误 1/ }))
    fireEvent.click(screen.getByRole('button', { name: /首次类型检查失败/ }))

    expect(screen.getByTestId('active-event')).toHaveTextContent('首次类型检查失败')
    expect(screen.getByTestId('event-list').children).toHaveLength(1)
  })

  it('选择源码引用后高亮真实行段', () => {
    render(<AgentObservatory snapshot={fixture} />)

    fireEvent.click(screen.getByRole('button', { name: /运行矩阵数学测试/ }))
    fireEvent.click(screen.getByRole('button', { name: /determinant/ }))

    expect(screen.getByTestId('source-line-1')).toHaveAttribute('data-highlighted', 'true')
  })

  it('缺少快照时显示可恢复的空状态', () => {
    render(<AgentObservatory snapshot={null} />)

    expect(screen.getByRole('alert')).toHaveTextContent('运行快照不可用')
    expect(screen.getByRole('link', { name: /打开矩阵实验室/ })).toBeVisible()
  })
})
