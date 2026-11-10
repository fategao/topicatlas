import { expect, test } from '@playwright/test'

test.describe('Skills Loading Lab', () => {
  test('首页可以进入技能加载页并回放文件读取证据', async ({ page }) => {
    await page.goto('./')
    await page.locator('[data-topic="skills-loading"]').click()

    await expect(page).toHaveURL(/\/skills-loading\/?$/)
    await expect(
      page.getByRole('heading', { name: '技能不是一开始就全部读进上下文' }),
    ).toBeVisible()
    await expect(page.getByTestId('skills-load-event-list').getByRole('button')).toHaveCount(8)

    await page.getByRole('button', { name: /按需读取审查清单/ }).click()
    await expect(page.getByTestId('skills-load-active-event')).toContainText(
      'editorial-checklist.md',
    )
    await expect(
      page.getByTestId(
        'skills-load-file-.agents-skills-release-brief-auditor-references-editorial-checklist.md',
      ),
    ).toHaveClass(/is-loaded/)
    await expect(page.getByTestId('skills-load-context-total')).toContainText('CONTEXT')
  })

  test('播放、单步与键盘操作都会更新检查器', async ({ page }) => {
    await page.goto('skills-loading')

    await page.getByRole('button', { name: '播放轨迹回放' }).click()
    await expect(page.getByRole('button', { name: '暂停轨迹回放' })).toBeVisible()
    await expect(page.getByTestId('skills-load-active-event')).toContainText(
      '初始技能索引已准备',
      { timeout: 4_000 },
    )

    const workbench = page.getByTestId('skills-load-workbench')
    await workbench.focus()
    await page.keyboard.press('End')
    await expect(page.getByTestId('skills-load-active-event')).toContainText('收束 provider usage')
    await page.keyboard.press('Home')
    await expect(page.getByTestId('skills-load-active-event')).toContainText(
      '显式调用进入当前 turn',
    )
  })

  test('深浅色、深链与移动端都没有布局回归', async ({ page }) => {
    const response = await page.goto('skills-loading')
    expect(response?.status()).toBeLessThan(400)
    await expect(page.getByTestId('skills-load-workbench')).toBeVisible()

    await page.getByRole('button', { name: '切换到亮色主题' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('减少动效时停止自动播放，但保留手动回放', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('skills-loading')

    await page.getByRole('button', { name: '播放轨迹回放' }).click()
    await expect(page.getByRole('button', { name: '播放轨迹回放' })).toBeVisible()

    await page.getByRole('button', { name: '下一个事件' }).click()
    await expect(page.getByTestId('skills-load-active-event')).toContainText(
      '初始技能索引已准备',
    )
  })

  test('静态回放不会请求模型 provider', async ({ page }) => {
    const externalRequests: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
        externalRequests.push(url.href)
      }
    })

    await page.goto('skills-loading')
    await page.getByRole('button', { name: /执行确定性审计脚本/ }).click()

    expect(externalRequests).toEqual([])
  })
})
