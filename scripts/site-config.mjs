#!/usr/bin/env node
// 站点域名的**单一事实来源**。
//
// 域名字符串以前散落在 CNAME、robots.txt、sitemap.xml、index.html（canonical/og:url）
// 与 README 里，换域名时极易漏改。现在只保留 site.config.json 一处，
// 构建时由这里统一生成 CNAME / robots.txt / sitemap.xml，并注入 index.html。

import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const DEFAULT_CONFIG = { domain: 'topicatlas.dev' }

/** 站点对外开放的路径，用于生成 sitemap.xml。新增路由时记得同步这里。 */
export const SITE_ROUTES = ['/', '/hermes', '/eval-driven-prompt']

/**
 * 已知路由 → 需要额外生成的真实文件路径。
 *
 * 原因：GitHub Pages 是纯静态托管，没有服务端重写。访问 /hermes 时它找不到文件，
 * 会返回 404 状态码（内容虽由 404.html 兜底，浏览器能渲染，但搜索引擎与链接预览
 * 会把它当坏链接）。为每个已知路由生成一份 index.html 副本后，深链就是真 200。
 */
export function routeFallbackPaths(routes = SITE_ROUTES) {
  return routes
    .map((route) => String(route).replace(/^\/+|\/+$/g, ''))
    .filter((route) => route.length > 0)
    .map((route) => `${route}/index.html`)
}

/**
 * 路由的规范 URL。GitHub Pages 会把 /hermes 301 到 /hermes/（因为那里是静态目录），
 * 所以带尾斜杠的才是最终地址——canonical、sitemap 都应该用这个形式，避免搜索引擎踩 301。
 */
export function routeUrl(siteUrl, route) {
  const base = String(siteUrl).replace(/\/+$/, '')
  const path = String(route).replace(/^\/+|\/+$/g, '')
  return path ? `${base}/${path}/` : `${base}/`
}

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
  //
  // basePath：部署在子路径（GitHub Pages 项目页 /topicatlas/）时使用；
  // repo 用于在未绑定域名时推导出真实的访问地址，避免 canonical 指向打不开的域名。
  const basePathRaw = String(raw.basePath ?? '').trim().replace(/^\/+|\/+$/g, '')
  return {
    domain,
    customDomain: raw.customDomain !== false,
    basePath: basePathRaw ? `/${basePathRaw}` : '',
    repo: String(raw.repo ?? '').trim(),
  }
}

/**
 * 切换到自定义域名模式：域名换成新的、清空 basePath（站点挂在根路径）、
 * 打开 customDomain（构建会产出 CNAME）。
 */
export function switchToCustomDomain(raw = {}, domain) {
  const { domain: normalized } = normalizeConfig({ domain })
  const base = normalizeConfig(raw)
  return { ...base, domain: normalized, customDomain: true, basePath: '' }
}

/** 切回 GitHub Pages 项目页模式：不产出 CNAME，basePath 用仓库名推导。 */
export function switchToProjectPage(raw = {}) {
  const base = normalizeConfig(raw)
  const repoName = base.repo.split('/')[1] ?? ''
  return { ...base, customDomain: false, basePath: repoName ? `/${repoName}` : '' }
}

export async function loadSiteConfig(baseDir = root) {
  const raw = await readConfigFile(baseDir)
  return applyEnvOverrides(raw)
}

/** 同步版本：给 vite.config.ts 这类必须同步求值的场景使用。 */
export function loadSiteConfigSync(baseDir = root) {
  let raw = DEFAULT_CONFIG
  try {
    raw = JSON.parse(readFileSync(path.join(baseDir, 'site.config.json'), 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  return applyEnvOverrides(raw)
}

async function readConfigFile(baseDir) {
  try {
    return JSON.parse(await readFile(path.join(baseDir, 'site.config.json'), 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return DEFAULT_CONFIG
    throw error
  }
}

// 环境变量覆盖：让同一份代码既能部署到项目页，也能部署到自定义域名。
function applyEnvOverrides(raw) {
  const merged = { ...raw }
  if (process.env.SITE_DOMAIN) merged.domain = process.env.SITE_DOMAIN
  if (process.env.SITE_CUSTOM_DOMAIN === 'false') merged.customDomain = false
  if (process.env.BASE_PATH) merged.basePath = process.env.BASE_PATH
  return normalizeConfig(merged)
}

/** 生成随构建产物发布的域名相关文件。 */
export function buildSiteArtifacts(config, routes = SITE_ROUTES) {
  const { domain, customDomain, basePath, repo } = normalizeConfig(config)

  const pagesUrl = repo ? `https://${repo.split('/')[0]}.github.io/${repo.split('/')[1] ?? ''}` : ''
  // 没绑自定义域名时，站点真正跑在 GitHub Pages 项目页上，
  // canonical / robots / sitemap 都应该指向那个能打开的地址。
  const siteUrl = customDomain ? `https://${domain}` : pagesUrl || `https://${domain}`

  const locations = routes.map((route) => routeUrl(siteUrl, route))
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
    basePath,
    repo,
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
