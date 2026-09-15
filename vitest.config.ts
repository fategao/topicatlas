import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // 默认 jsdom（组件测试需要）；纯逻辑测试各自用 docblock 切到 node 环境，
      // 这样单元测试不必为 jsdom 启动付出时间。
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/component/**/*.test.{ts,tsx}'],
      css: false,
      restoreMocks: true,
    },
  }),
)
