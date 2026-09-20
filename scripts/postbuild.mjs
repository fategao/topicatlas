#!/usr/bin/env node
// GitHub Pages 上 SPA 深链回退：把 index.html 复制成 404.html。
// 直接访问 /hermes（或在该地址刷新）时 GitHub Pages 会返回 404.html，
// 由前端路由接管渲染，避免出现真 404 页面。

import { access, copyFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSiteArtifacts, loadSiteConfig, SITE_ROUTES } from './site-config.mjs'
import { mkdir } from 'node:fs/promises'
import { routeFallbackPaths } from './site-config.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')

async function exists(target) {
  try {
    await access(target)
    return true
  } catch {
    return false
  }
}

async function main() {
  const index = path.join(dist, 'index.html')
  if (!(await exists(index))) {
    throw new Error('dist/index.html 不存在，请先运行 vite build')
  }

  await copyFile(index, path.join(dist, '404.html'))

  // 为每个已知路由生成真实的 index.html，让深链返回 200 而不是 404
  const routeFiles = routeFallbackPaths(SITE_ROUTES)
  for (const relative of routeFiles) {
    const target = path.join(dist, relative)
    await mkdir(path.dirname(target), { recursive: true })
    await copyFile(index, target)
  }

  // 域名相关的三个文件统一由 site.config.json 生成，避免多处硬编码。
  const config = await loadSiteConfig(root)
  const artifacts = buildSiteArtifacts(config, SITE_ROUTES)
  if (artifacts.cname) {
    await writeFile(path.join(dist, 'CNAME'), artifacts.cname, 'utf8')
  }
  await writeFile(path.join(dist, 'robots.txt'), artifacts.robots, 'utf8')
  await writeFile(path.join(dist, 'sitemap.xml'), artifacts.sitemap, 'utf8')

  console.log(
    [
      'postbuild: 已生成 dist/404.html（SPA 回退）',
      `域名 ${artifacts.domain}`,
      artifacts.cname ? '已写入 CNAME' : '按配置跳过 CNAME（尚未绑定自定义域名）',
      '已写入 robots.txt / sitemap.xml',
      routeFiles.length > 0 ? `已为 ${routeFiles.join('、')} 生成静态入口` : '',
    ].join('；'),
  )
}

main().catch((error) => {
  console.error('postbuild 失败：', error.message)
  process.exitCode = 1
})
