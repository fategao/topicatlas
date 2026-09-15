#!/usr/bin/env node
// 站点域名的**单一事实来源**。
//
// 域名字符串以前散落在 CNAME、robots.txt、sitemap.xml、index.html（canonical/og:url）
// 与 README 里，换域名时极易漏改。现在只保留 site.config.json 一处，
// 构建时由这里统一生成 CNAME / robots.txt / sitemap.xml，并注入 index.html。

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const DEFAULT_CONFIG = { domain: 'topicatlas.dev' }

/** 站点对外开放的路径，用于生成 sitemap.xml。新增路由时记得同步这里。 */
export const SITE_ROUTES = ['/', '/hermes']

const DOMAIN_PATTERN = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/

export function normalizeConfig(raw = {}) {
  const input = String(raw.domain ?? '').trim()
  const domain = input
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
    .toLowerCase()

  if (!DOMAIN_PATTERN.test(domain)) {
    throw new Error(
      `site.config.json 里的 domain 不合法：${input || '(空)'}。应形如 topicatlas.dev，不要带协议或路径。`,
    )
  }
  // customDomain=false 时不产出 CNAME：还没注册/还没绑定域名就部署时，
  // CNAME 会让 GitHub Pages 把项目页重定向到一个不存在的域名。
  return { domain, customDomain: raw.customDomain !== false }
}

export async function loadSiteConfig(baseDir = root) {
  const file = path.join(baseDir, 'site.config.json')
  let raw = DEFAULT_CONFIG
  try {
    raw = JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  // 环境变量覆盖：让同一份代码既能部署到项目页，也能部署到自定义域名。
  const merged = { ...raw }
  if (process.env.SITE_DOMAIN) merged.domain = process.env.SITE_DOMAIN
  if (process.env.SITE_CUSTOM_DOMAIN === 'false') merged.customDomain = false
  return normalizeConfig(merged)
}

/** 生成随构建产物发布的域名相关文件。 */
export function buildSiteArtifacts(config, routes = SITE_ROUTES) {
  const { domain, customDomain } = normalizeConfig(config)
  const siteUrl = `https://${domain}`

  const locations = routes.map((route) => (route === '/' ? `${siteUrl}/` : `${siteUrl}${route}`))
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...locations.map((location, index) =>
      [
        '  <url>',
        `    <loc>${location}</loc>`,
        '    <changefreq>weekly</changefreq>',
        `    <priority>${index === 0 ? '1.0' : '0.9'}</priority>`,
        '  </url>',
      ].join('\n'),
    ),
    '</urlset>',
    '',
  ].join('\n')

  const robots = ['User-agent: *', 'Allow: /', '', `Sitemap: ${siteUrl}/sitemap.xml`, ''].join('\n')

  return {
    domain,
    customDomain,
    siteUrl,
    cname: customDomain ? `${domain}\n` : null,
    robots,
    sitemap,
    replacements: {
      '%%SITE_URL%%': siteUrl,
      '%%SITE_DOMAIN%%': domain,
    },
  }
}
