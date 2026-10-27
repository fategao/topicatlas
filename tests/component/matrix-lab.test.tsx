import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MatrixLab } from '../../src/features/matrix-lab/MatrixLab'

describe('矩阵学习实验', () => {
  it('修改矩阵后同步更新行列式、秩与变换结果', () => {
    render(<MatrixLab />)

    expect(screen.getByTestId('matrix-determinant')).toHaveTextContent('1.00')
    expect(screen.getByTestId('matrix-rank')).toHaveTextContent('2')

    fireEvent.change(screen.getByLabelText('矩阵 a 项'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('矩阵 b 项'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('矩阵 c 项'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('矩阵 d 项'), { target: { value: '4' } })

    expect(screen.getByTestId('matrix-determinant')).toHaveTextContent('0.00')
    expect(screen.getByTestId('matrix-rank')).toHaveTextContent('1')
    expect(screen.getByTestId('matrix-challenge-collapse')).toHaveTextContent('已通过')
  })

  it('预设可以一键构造降秩变换', () => {
    render(<MatrixLab />)

    fireEvent.click(screen.getByRole('button', { name: /降秩/ }))

    expect(screen.getByTestId('matrix-determinant')).toHaveTextContent('0.00')
    expect(screen.getByTestId('matrix-rank')).toHaveTextContent('1')
  })

  it('向量手柄支持键盘移动并实时显示坐标', async () => {
    const user = userEvent.setup()
    render(<MatrixLab />)

    const handle = screen.getByRole('slider', { name: '输入向量' })
    handle.focus()
    await user.keyboard('{ArrowRight}{ArrowUp}')

    expect(screen.getByTestId('input-vector-value')).toHaveTextContent('(2.20, 1.20)')
  })

  it('重置恢复单位矩阵和默认向量', () => {
    render(<MatrixLab />)

    fireEvent.click(screen.getByRole('button', { name: /反射/ }))
    expect(screen.getByTestId('matrix-determinant')).toHaveTextContent('-1.00')

    fireEvent.click(screen.getByRole('button', { name: /重置/ }))
    expect(screen.getByTestId('matrix-determinant')).toHaveTextContent('1.00')
    expect(screen.getByTestId('input-vector-value')).toHaveTextContent('(2.00, 1.00)')
  })
})
