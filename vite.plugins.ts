import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'
import rehypeShiki from '@shikijs/rehype'
import type { PluginOption } from 'vite'
import { buildSiteArtifacts, loadSiteConfigSync, SITE_ROUTES } from './scripts/site-config.mjs'

/**
 * 把站点地址注入 index.html（canonical / og:url）：
 * 换域名或换部署路径时只改 site.config.json。
 */
function siteUrlPlugin(replacements: Record<string, string>): PluginOption {
  return {
    name: 'topic-atlas:site-url',
    transformIndexHtml(html) {
      return Object.entries(replacements).reduce(
        (acc, [token, value]) => acc.split(token).join(value),
        html,
      )
    },
  }
}

/** Vite 与 Vitest 共用同一套插件，避免两边行为漂移。 */
export function createVitePlugins(): PluginOption[] {
  const siteConfig = loadSiteConfigSync()
  const { replacements } = buildSiteArtifacts(siteConfig, SITE_ROUTES)

  return [
    siteUrlPlugin(replacements),
    {
      enforce: 'pre',
      ...mdx({
        providerImportSource: '@mdx-js/react',
        remarkPlugins: [remarkGfm],
        rehypePlugins: [[rehypeShiki, { theme: 'github-dark-default', defaultLanguage: 'text' }]],
      }),
    } as PluginOption,
    react(),
    tailwindcss(),
  ]
}

/**
 * 部署路径由 site.config.json 的 basePath 决定（可用 BASE_PATH 环境变量临时覆盖）：
 * - 自定义域名（最终形态）：base = '/'，即 basePath 留空
 * - GitHub Pages 项目页 <user>.github.io/<repo>/：base = '/<repo>'
 * 配错会让资源被解析到域名根目录，表现为整页白屏。
 */
export function resolveBase(): string {
  const siteConfig = loadSiteConfigSync()
  // 注意：CI 里未设置的仓库变量会以空字符串传进来，必须当成「未设置」处理，
  // 否则 base 会变成空字符串（相对路径），资源解析全部错位。
  const fromEnv = (process.env.BASE_PATH ?? '').trim()
  return fromEnv || siteConfig.basePath || '/'
}
