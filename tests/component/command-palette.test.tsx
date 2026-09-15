import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommandPalette } from '../../src/components/hermes/CommandPalette'

describe('全局搜索面板', () => {
  it('关闭状态不渲染对话框', () => {
    render(<CommandPalette open={false} onClose={() => {}} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('可以搜到学习步骤', async () => {
    const user = userEvent.setup()
    render(<CommandPalette open onClose={() => {}} />)

    await user.type(screen.getByLabelText('搜索关键词'), '安装')

    await waitFor(() => {
      expect(screen.getByText('安装 Hermes Agent')).toBeInTheDocument()
    })
    expect(screen.getByText('学习步骤')).toBeInTheDocument()
  })

  it('可以搜到 CLI 命令（懒加载参考数据后进入索引）', async () => {
    const user = userEvent.setup()
    render(<CommandPalette open onClose={() => {}} />)

    await user.type(screen.getByLabelText('搜索关键词'), 'hermes logs')

    await waitFor(
      () => {
        expect(screen.getByText('hermes logs')).toBeInTheDocument()
      },
      { timeout: 5000 },
    )
  })

  it('Esc 会触发关闭回调', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<CommandPalette open onClose={onClose} />)

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
