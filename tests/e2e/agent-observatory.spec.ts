import { expect, test } from '@playwright/test'

test.describe('双 Agent 可观测实验室', () => {
  test('首页可以进入监控页并从真实快照打开矩阵产品', async ({ page }) => {
    await page.goto('./')
    await page.locator('[data-topic="agent-observatory"]').click()

    await expect(page).toHaveURL(/\/agent-observatory\/?$/)
    await expect(page.getByTestId('run-status')).toHaveText(/已完成/)
    await expect(page.getByTestId('event-list').getByRole('button').first()).toBeVisible()

    await page.getByRole('link', { name: /实际使用矩阵实验室/ }).click()
    await expect(page).toHaveURL(/\/agent-observatory\/matrix-lab\/?$/)
    await expect(page.getByRole('heading', { name: '矩阵实验室' })).toBeVisible()
  })

  test('矩阵预设会改变行列式、秩与挑战状态', async ({ page }) => {
    await page.goto('agent-observatory/matrix-lab')

    await expect(page.getByTestId('matrix-determinant')).toHaveText('1.00')
    await page.getByRole('button', { name: /降秩/ }).click()

    await expect(page.getByTestId('matrix-determinant')).toHaveText('0.00')
    await expect(page.getByTestId('matrix-rank')).toHaveText('1')
    await expect(page.getByTestId('matrix-challenge-collapse')).toContainText('已通过')

    const handle = page.getByRole('slider', { name: '输入向量' })
    await handle.focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByTestId('input-vector-value')).toContainText('2.20')

    const canvas = page.getByRole('group', { name: '二维向量操作区域' })
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      await page.mouse.move(box.x + box.width * 0.66, box.y + box.height * 0.39)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.3, { steps: 4 })
      await page.mouse.up()
      await expect(page.getByTestId('input-vector-value')).not.toContainText('2.20, 1.20')
    }
  })

  test('可以筛选文件事件并联动源码行段', async ({ page }) => {
    await page.goto('agent-observatory')

    await page.getByRole('button', { name: /文件 \d+/ }).click()
    const fileEvent = page.getByTestId('event-list').getByRole('button').first()
    await expect(fileEvent).toBeVisible()
    await fileEvent.click()

    const sourceButton = page.getByTestId('active-event').getByRole('button').first()
    await sourceButton.click()
    await expect(page.locator('[data-highlighted="true"]').first()).toBeVisible()
  })

  test('两个新深链可直接访问且移动端没有横向溢出', async ({ page }) => {
    const observatoryResponse = await page.goto('agent-observatory')
    expect(observatoryResponse?.status()).toBeLessThan(400)
    await expect(page.getByTestId('run-status')).toBeVisible()

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)

    const productResponse = await page.goto('agent-observatory/matrix-lab')
    expect(productResponse?.status()).toBeLessThan(400)
    await expect(page.getByTestId('matrix-determinant')).toBeVisible()
  })

  test('减少动效时监控页仍可直接单步浏览', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('agent-observatory')

    await page.getByRole('button', { name: '下一条事件' }).click()
    await expect(page.getByTestId('active-event')).toBeVisible()
  })
})
