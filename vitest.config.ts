import { defineConfig } from 'vitest/config'
import { createVitePlugins } from './vite.plugins'

export default defineConfig({
  // 复用与 Vite 完全相同的一套插件（MDX / React / Tailwind），避免两边行为漂移。
  plugins: createVitePlugins(),
  test: {
    // 默认 jsdom（组件测试需要）；纯逻辑测试各自用 docblock 切到 node 环境，
    // 这样单元测试不必为 jsdom 启动付出时间。
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx,js}', 'tests/component/**/*.test.{ts,tsx}'],
    css: false,
    restoreMocks: true,
  },
})
