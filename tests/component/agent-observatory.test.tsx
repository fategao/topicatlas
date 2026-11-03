import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AgentObservatory } from '../../src/features/agent-observatory/AgentObservatory'
import type { ObservatorySnapshot } from '../../src/features/agent-observatory/types'
import snapshotJson from '../../src/data/observatory/snapshot.json'

const snapshot = snapshotJson as unknown as ObservatorySnapshot

describe('Agent 运行可观测实验室', () => {
  it('默认展示 cctrace 真实样例的 run、模型与循环', () => {
    render(<AgentObservatory snapshot={snapshot} />)

    expect(screen.getByTestId('run-status')).toHaveTextContent('已完成')
    expect(screen.getByText('cctrace 真实样例')).toBeVisible()
    expect(screen.getByTestId('active-event')).toHaveTextContent('修复：最小改动补回可访问标签')
    expect(screen.getByTestId('session-outline')).toHaveTextContent('子代理：复查 dashboard 标签改动')
  })

  it('切换 run 后会改变 provider、step 与源码证据', () => {
    render(<AgentObservatory snapshot={snapshot} />)

    fireEvent.click(screen.getByRole('tab', { name: /矩阵构建 run/ }))

    expect(screen.getByTestId('run-status')).toHaveTextContent('已完成')
    expect(screen.getAllByText(/gpt-5\.6-luna/).length).toBeGreaterThan(0)
    expect(screen.getByTestId('active-event')).toHaveTextContent('规格与勘察')
    expect(screen.getByRole('region', { name: '源代码' })).toBeVisible()
  })

  it('工具筛选会改变可见 step，点击工具后显示真实输入与结果', () => {
    render(<AgentObservatory snapshot={snapshot} />)

    fireEvent.click(screen.getByRole('tab', { name: /矩阵构建 run/ }))
    fireEvent.click(screen.getByRole('button', { name: /apply_patch 4/ }))
    fireEvent.click(screen.getByTestId('step-pstep-event-8'))

    const inspector = screen.getByTestId('active-event')
    expect(inspector).toHaveTextContent('apply_patch')

    fireEvent.click(within(inspector).getByRole('button', { name: /transformVector/ }))
    const highlighted = screen
      .getAllByTestId(/^source-line-/)
      .find((line) => line.getAttribute('data-highlighted') === 'true')
    expect(highlighted).toBeTruthy()

    fireEvent.click(within(inspector).getByRole('button', { name: /apply_patch/ }))
    expect(within(screen.getByTestId('active-event')).getByText('INPUT')).toBeVisible()
    expect(within(screen.getByTestId('active-event')).getByText('RESULT')).toBeVisible()
  })

  it('上下文压缩事件会打开检查器并显示历史消息变化', () => {
    render(<AgentObservatory snapshot={snapshot} />)

    fireEvent.click(
      within(screen.getByTestId('session-outline')).getByRole('button', {
        name: /上下文压缩：71 条消息 → 4 条/,
      }),
    )

    expect(screen.getByTestId('active-event')).toHaveTextContent('71 → 4')
    expect(screen.getByTestId('active-event')).toHaveTextContent('wire history drop')
  })

  it('上下文来源列表可以切换并显示记忆片段', () => {
    render(<AgentObservatory snapshot={snapshot} />)

    fireEvent.click(screen.getByRole('button', { name: /项目 CLAUDE\.md/ }))

    const panel = screen.getByTestId('context-panel')
    expect(panel).toHaveTextContent('/workspace/cctrace/CLAUDE.md')
    expect(panel).toHaveTextContent('真实进入请求的长期指令')
  })

  it('缺少快照时显示可恢复的空状态', () => {
    render(<AgentObservatory snapshot={null} />)

    expect(screen.getByRole('alert')).toHaveTextContent('运行快照不可用')
    expect(screen.getByRole('link', { name: /打开矩阵实验室/ })).toBeVisible()
  })
})
