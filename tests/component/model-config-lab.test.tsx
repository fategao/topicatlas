import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ModelConfigLab } from '../../src/components/hermes/labs/ModelConfigLab'

describe('模型配置实验台', () => {
  it('默认渲染出官方的 config.yaml 字段形状', async () => {
    render(<ModelConfigLab />)
    await waitFor(() => expect(screen.getByText(/api_mode: chat_completions/)).toBeInTheDocument())
    expect(screen.getByText(/provider: /)).toBeInTheDocument()
  })

  it('选自定义端点但没填 Base URL 时给出明确错误', async () => {
    const user = userEvent.setup()
    render(<ModelConfigLab />)

    const select = await screen.findByLabelText('Provider')
    await waitFor(() => expect(screen.getByText(/共 \d+ 个 provider/)).toBeInTheDocument())

    await user.selectOptions(select, screen.getByRole('option', { name: '自定义端点' }))
    expect(await screen.findByText('! 自定义端点必须填写 Base URL')).toBeInTheDocument()
  })

  it('填了 Base URL 后写进生成的配置并给出密钥提示', async () => {
    const user = userEvent.setup()
    render(<ModelConfigLab />)

    const baseUrl = screen.getByLabelText(/Base URL/)
    await user.type(baseUrl, 'http://127.0.0.1:8000/v1')

    await waitFor(() =>
      expect(screen.getByText(/base_url: 'http:\/\/127.0.0.1:8000\/v1'/)).toBeInTheDocument(),
    )
    expect(screen.getAllByText(/\.env/).length).toBeGreaterThan(0)
  })
})
