import { defineConfig, devices } from '@playwright/test'

// 本地开发机的网络无法访问 Playwright 的浏览器 CDN（storage.googleapis.com 超时），
// 因此允许通过 PLAYWRIGHT_CHANNEL 复用本机已安装的 Chrome / Edge；
// CI（GitHub Actions）里留空，使用 `npx playwright install chromium` 下载的浏览器。
const channel = (process.env.PLAYWRIGHT_CHANNEL || undefined) as 'chrome' | 'msedge' | undefined

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1440, height: 900 } },
    },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel } },
  ],
})
