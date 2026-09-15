import { defineConfig, devices } from '@playwright/test'
import { loadSiteConfig } from './scripts/site-config.mjs'
import { resolveBase } from './vite.plugins'

// 本地开发机的网络无法访问 Playwright 的浏览器 CDN（storage.googleapis.com 超时），
// 因此允许通过 PLAYWRIGHT_CHANNEL 复用本机已安装的 Chrome / Edge；
// CI（GitHub Actions）里留空，使用 `npx playwright install chromium` 下载的浏览器。
const channel = (process.env.PLAYWRIGHT_CHANNEL || undefined) as 'chrome' | 'msedge' | undefined

// 站点跑在根路径还是子路径由 site.config.json 决定，E2E 必须跟着走，
// 否则在项目页模式下所有用例都会 404。
await loadSiteConfig()
const basePath = resolveBase().replace(/\/$/, '')
const origin = 'http://127.0.0.1:4173'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: `${origin}${basePath}/`,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run preview',
    // 就绪检查也要用带子路径的地址，否则项目页模式下会被当成 404
    url: `${origin}${basePath}/`,
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
