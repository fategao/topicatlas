import { expect, test } from '@playwright/test'

const PROGRESS_KEY = 'topicatlas:progress:hermes:v1'

test.describe('Topic Atlas 端到端流程', () => {
  test('首页 → Hermes 学习路径 → 勾选验收 → 刷新后进度仍在', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: /把官方文档/ })).toBeVisible()
    await page.locator('[data-topic="hermes"]').click()
    await expect(page).toHaveURL(/\/hermes$/)

    await expect(page.getByRole('heading', { name: 'Hermes Agent 六步上手' })).toBeVisible()
    await expect(page.locator('[data-step]')).toHaveCount(7)

    const checkbox = page.getByRole('checkbox', { name: /安装完成/ })
    await checkbox.scrollIntoViewIfNeeded()
    await checkbox.check()
    await expect(checkbox).toBeChecked()

    const stored = await page.evaluate((key) => window.localStorage.getItem(key), PROGRESS_KEY)
    expect(stored).toContain('installed')

    await page.reload()
    const afterReload = page.getByRole('checkbox', { name: /安装完成/ })
    await afterReload.scrollIntoViewIfNeeded()
    await expect(afterReload).toBeChecked()
  })

  test('全局搜索可以检索到步骤、命令与配置项', async ({ page }) => {
    await page.goto('/hermes')

    // 等应用挂载完成（快捷键监听器在 App 挂载时注册）
    await expect(page.getByRole('heading', { name: '学习路径总览' })).toBeVisible()
    await page.keyboard.press('Control+k')
    const dialog = page.getByRole('dialog', { name: '全局搜索' })
    await expect(dialog).toBeVisible()

    const input = dialog.getByLabel('搜索关键词')
    await input.fill('安装')
    await expect(dialog.getByRole('button', { name: /安装 Hermes Agent/ }).first()).toBeVisible()

    await input.fill('hermes logs')
    await expect(dialog.getByText('hermes logs')).toBeVisible({ timeout: 10_000 })

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('速查参考可以切换分类并搜索', async ({ page }) => {
    await page.goto('/hermes')

    await page.getByRole('heading', { name: '速查参考' }).scrollIntoViewIfNeeded()
    await page.getByRole('tab', { name: '配置项' }).click()

    const search = page.getByLabel('搜索配置项索引')
    await expect(search).toBeVisible()
    await search.fill('terminal')

    await expect(page.locator('#reference-panel').getByText(/命中 \d+ 个小节/)).toBeVisible()
  })

  test('主题可以在深色与亮色之间切换', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    await page.getByRole('button', { name: '切换到亮色主题' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })

  test('深链直接访问 /hermes 也能正常渲染（404 回退生效）', async ({ page }) => {
    const response = await page.goto('/hermes')
    expect(response?.status()).toBeLessThan(400)
    await expect(page.getByRole('heading', { name: '学习路径总览' })).toBeVisible()
    await expect(page.locator('#step-installation-heading')).toBeVisible()
  })

  test('页面没有横向溢出', async ({ page }) => {
    await page.goto('/hermes')
    await page.locator('#reference').scrollIntoViewIfNeeded()

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })
})

test.describe('减少动效偏好', () => {
  test.use({ reducedMotion: 'reduce' })

  test('开启 reduced-motion 后页面依然完整可用', async ({ page }) => {
    await page.goto('/hermes')
    await expect(page.getByRole('heading', { name: '学习路径总览' })).toBeVisible()
    await expect(page.locator('[data-step]')).toHaveCount(7)

    const checkbox = page.getByRole('checkbox', { name: /hermes 能正常启动/ })
    await checkbox.scrollIntoViewIfNeeded()
    await checkbox.check()
    await expect(checkbox).toBeChecked()
  })
})
