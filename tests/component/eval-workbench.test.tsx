import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EvalPromptDiff } from '../../src/components/eval/EvalPromptDiff'
import { EvalWorkbench } from '../../src/components/eval/EvalWorkbench'

describe('EvalWorkbench', () => {
  it('默认 rubric 下 Prompt v2 胜出', () => {
    render(<EvalWorkbench />)

    expect(screen.getByTestId('winner-label')).toHaveTextContent('Prompt v2')
    expect(screen.getByTestId('score-v2')).toHaveTextContent('94.0')
  })

  it('把效率权重调高后，Prompt v1 会反超', () => {
    render(<EvalWorkbench />)

    fireEvent.change(screen.getByRole('slider', { name: '标签正确率权重' }), {
      target: { value: '0' },
    })
    fireEvent.change(screen.getByRole('slider', { name: '格式合规权重' }), {
      target: { value: '0' },
    })
    fireEvent.change(screen.getByRole('slider', { name: '边界用例权重' }), {
      target: { value: '0' },
    })
    fireEvent.change(screen.getByRole('slider', { name: '输出效率权重' }), {
      target: { value: '8' },
    })

    expect(screen.getByTestId('winner-label')).toHaveTextContent('Prompt v1')
  })

  it('逐用例矩阵同时显示标准标签和两个 Prompt 的结果', () => {
    render(<EvalWorkbench />)

    const row = screen.getByTestId('case-row-figma-seat')
    expect(row).toHaveTextContent('Other')
    expect(row).toHaveTextContent('Software')
    expect(row).toHaveTextContent('{"label":"Other"}')
  })
})

describe('EvalPromptDiff', () => {
  it('可以在两版 Prompt 之间切换并查看规格改动', () => {
    render(<EvalPromptDiff />)

    expect(screen.getByText(/裸分类指令/)).toBeVisible()
    fireEvent.click(screen.getByRole('tab', { name: /Prompt v2/ }))

    expect(screen.getByText(/规格化分类器/)).toBeVisible()
    expect(screen.getByText(/规定只返回/)).toBeVisible()
  })
})
