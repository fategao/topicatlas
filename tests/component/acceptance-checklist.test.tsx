import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProgressProvider } from '../../src/components/hermes/ProgressContext'
import { AcceptanceChecklist } from '../../src/components/hermes/AcceptanceChecklist'
import { hermesSteps } from '../../src/data/hermes/steps'
import { PROGRESS_STORAGE_KEY } from '../../src/lib/progress'

const step = hermesSteps[0]!

function renderChecklist() {
  return render(
    <ProgressProvider>
      <AcceptanceChecklist stepId={step.id} items={step.acceptance} />
    </ProgressProvider>,
  )
}

describe('验收清单', () => {
  it('勾选后写进 localStorage，取消勾选后状态被清掉', async () => {
    const user = userEvent.setup()
    renderChecklist()

    const first = screen.getByLabelText(new RegExp(step.acceptance[0]!.label))
    await user.click(first)

    await waitFor(() => {
      const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY)
      expect(raw).toBeTruthy()
      expect(raw).toContain(step.acceptance[0]!.id)
    })

    await user.click(first)
    await waitFor(() => {
      const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY) ?? ''
      const parsed = JSON.parse(raw) as { steps: Record<string, { items: Record<string, boolean> }> }
      expect(parsed.steps[step.id]?.items[step.acceptance[0]!.id]).toBe(false)
    })
  })

  it('重新挂载后会读回已勾选的状态', async () => {
    const user = userEvent.setup()
    const first = renderChecklist()

    const checkbox = screen.getByLabelText(new RegExp(step.acceptance[0]!.label))
    await user.click(checkbox)
    await waitFor(() =>
      expect(window.localStorage.getItem(PROGRESS_STORAGE_KEY)).toContain(step.acceptance[0]!.id),
    )

    first.unmount()
    renderChecklist()

    await waitFor(() => {
      const restored = screen.getByLabelText(new RegExp(step.acceptance[0]!.label))
      expect(restored).toBeChecked()
    })
  })

  it('只有把全部验收项勾完，才会显示通过文案', async () => {
    const user = userEvent.setup()
    renderChecklist()

    expect(screen.getByText(/把上面每一项都确认后/)).toBeInTheDocument()

    for (const item of step.acceptance) {
      await user.click(screen.getByLabelText(new RegExp(item.label)))
    }

    await waitFor(() => {
      expect(screen.getByText('这一步已全部验收通过')).toBeInTheDocument()
    })
  })
})
