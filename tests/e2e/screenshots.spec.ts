import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

/**
 * 视觉留档：把首页与学习路径页在桌面 / 移动两个视口下截图，
 * 输出到 artifacts/screenshots/（已在 .gitignore 中忽略）。
 * 这不是断言型测试，而是「上线前肉眼看一眼」的证据。
 */
const OUT_DIR = path.resolve('artifacts', 'screenshots')

test('截取视觉留档', async ({ page }, testInfo) => {
  await mkdir(OUT_DIR, { recursive: true })
  const project = testInfo.project.name

  await page.goto('./')
  await expect(page.getByRole('heading', { name: /把官方文档/ })).toBeVisible()
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(OUT_DIR, `home-${project}.png`), fullPage: false })

  await page.goto('hermes')
  await expect(page.getByRole('heading', { name: '学习路径总览' })).toBeVisible()
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(OUT_DIR, `hermes-top-${project}.png`), fullPage: false })

  await page.locator('#step-installation').scrollIntoViewIfNeeded()
  await expect(page.locator('#step-installation-heading')).toBeVisible()
  await page.waitForTimeout(400)
  await page.screenshot({
    path: path.join(OUT_DIR, `hermes-step1-${project}.png`),
    fullPage: false,
  })

  await page.locator('#reference').scrollIntoViewIfNeeded()
  await page.getByRole('tab', { name: '配置项' }).click()
  await expect(page.getByLabel('搜索配置项索引')).toBeVisible()
  await page.waitForTimeout(400)
  await page.screenshot({
    path: path.join(OUT_DIR, `hermes-reference-${project}.png`),
    fullPage: false,
  })

  // 亮色主题也留一张，确认对比度没有因为换肤而崩掉
  await page.goto('hermes')
  await page.getByRole('button', { name: '切换到亮色主题' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.locator('#step-configuration').scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  await page.screenshot({
    path: path.join(OUT_DIR, `hermes-light-${project}.png`),
    fullPage: false,
  })
})
