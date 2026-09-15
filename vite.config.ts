import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'
import rehypeShiki from '@shikijs/rehype'
import { buildSiteArtifacts, loadSiteConfig, SITE_ROUTES } from './scripts/site-config.mjs'

/**
 * 把站点域名注入 index.html：canonical 与 og:url 都用同一份配置，
 * 换域名时只需要改 site.config.json。
 */
const siteUrlPlugin = {
  name: 'topic-atlas:site-url',
  async transformIndexHtml(html: string) {
    const config = await loadSiteConfig()
    const { replacements } = buildSiteArtifacts(config, SITE_ROUTES)
    return Object.entries(replacements).reduce(
      (acc, [token, value]) => acc.split(token).join(value),
      html,
    )
  },
}

export default defineConfig({
  /**
   * 两种部署形态都支持：
   * - 绑定自定义域名（最终形态）：base = '/'（默认）
   * - 先用 GitHub Pages 项目地址 <user>.github.io/topicatlas：
   *   构建时设 BASE_PATH=/topicatlas，否则资源会被解析到域名根目录而白屏。
   */
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    siteUrlPlugin,
    {
      enforce: 'pre',
      ...mdx({
        providerImportSource: '@mdx-js/react',
        remarkPlugins: [remarkGfm],
        rehypePlugins: [[rehypeShiki, { theme: 'github-dark-default', defaultLanguage: 'text' }]],
      }),
    },
    react(),
    tailwindcss(),
  ],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
