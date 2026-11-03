import { expect, test } from '@playwright/test'

test.describe('Agent 运行可观测实验室', () => {
  test('首页可以进入监控页、切换两条真实 run 并打开矩阵产品', async ({ page }) => {
    await page.goto('./')
    await page.locator('[data-topic="agent-observatory"]').click()

    await expect(page).toHaveURL(/\/agent-observatory\/?$/)
    await expect(page.getByTestId('run-status')).toHaveText(/已完成/)
    await expect(page.getByTestId('run-tabs')).toBeVisible()
    await expect(
      page.getByRole('tab', { name: /cctrace 真实样例/ }),
    ).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByTestId('session-outline').getByText(/子代理：复查/)).toBeVisible()
    await expect(page.getByTestId('reference-probes')).toContainText('404')
    await expect(page.getByTestId('reference-probes')).toContainText('cctrace')

    await page.getByRole('tab', { name: /矩阵构建 run/ }).click()
    await expect(page.getByTestId('active-event')).toContainText('规格与勘察')
    await expect(page.getByRole('region', { name: '源代码' })).toBeVisible()

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

  test('工具筛选只留下匹配的真实工具调用，点击后打开输入与结果', async ({ page }) => {
    await page.goto('agent-observatory')

    await page.getByRole('button', { name: /Read 10/ }).click()
    const toolRows = page.getByTestId('session-outline').locator('[data-testid^="tool-"]')
    await expect(toolRows).toHaveCount(10)

    await toolRows.first().click()
    const inspector = page.getByTestId('active-event')
    await expect(inspector).toContainText('INPUT')
    await expect(inspector).toContainText('RESULT')
    await expect(inspector).toContainText('Read')
  })

  test('压缩事件与记忆来源可以逐条检查', async ({ page }) => {
    await page.goto('agent-observatory')

    await page
      .getByTestId('session-outline')
      .getByRole('button', { name: /上下文压缩：71 条消息 → 4 条/ })
      .click()
    await expect(page.getByTestId('active-event')).toContainText('71 → 4')
    await expect(page.getByTestId('active-event')).toContainText('wire history drop')

    await page.getByTestId('context-panel').getByRole('button', { name: /项目 CLAUDE\.md/ }).click()
    await expect(page.getByTestId('context-panel')).toContainText('/workspace/cctrace/CLAUDE.md')
    await expect(page.getByTestId('context-panel')).toContainText('真实进入请求的长期指令')
  })

  test('源码检查器会随真实源码引用高亮行段', async ({ page }) => {
    await page.goto('agent-observatory')
    await page.getByRole('tab', { name: /矩阵构建 run/ }).click()
    await page.getByRole('button', { name: /apply_patch 4/ }).click()
    await page.getByTestId('step-pstep-event-8').click()

    await page.getByTestId('active-event').getByRole('button', { name: /transformVector/ }).click()
    await expect(page.locator('[data-highlighted="true"]').first()).toBeVisible()
  })

  test('两个深链可直接访问且移动端没有横向溢出', async ({ page }) => {
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

    await page.getByRole('button', { name: '下一条 step' }).click()
    await expect(page.getByTestId('active-event')).toBeVisible()
    await expect(page.getByTestId('active-event')).not.toContainText('STEP 1 /')
  })
})
