#!/usr/bin/env node
// 部署自检：确认 GitHub 仓库、Pages 站点与资源路径都真的可用。
//
// 用法：
//   node scripts/check-deploy.mjs
//   node scripts/check-deploy.mjs --repo fategao/topicatlas --url https://fategao.github.io/topicatlas/
//
// 它会逐项检查并给出「人话」结论，专门覆盖三种最常见的“部署成功但页面打不开”：
//   1. 站点被 301 到还没解析的自定义域名（仓库里存在 CNAME）
//   2. HTML 引用了 /assets/... 但站点跑在子路径下（缺 BASE_PATH）
//   3. 资源文件 404 / 页面白屏（构建产物不完整）

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback
}

async function loadLocalConfig() {
  try {
    return JSON.parse(await readFile(path.join(root, 'site.config.json'), 'utf8'))
  } catch {
    return { domain: '' }
  }
}

const problems = []
const notes = []

async function checkRepo(repo) {
  const response = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: { accept: 'application/vnd.github+json', 'user-agent': 'topic-atlas-deploy-check' },
  })
  if (response.status === 404) {
    problems.push(`仓库 ${repo} 不存在或不是公开仓库`)
    return null
  }
  const data = await response.json()
  notes.push(`仓库 ${data.full_name} 存在，默认分支 ${data.default_branch}，${data.private ? '私有' : '公开'}`)
  if (data.homepage) notes.push(`仓库主页字段：${data.homepage}`)
  return data
}

async function checkSite(siteUrl) {
  const response = await fetch(siteUrl, {
    redirect: 'follow',
    headers: { 'user-agent': 'Mozilla/5.0 (deploy-check)' },
  })

  if (response.status !== 200) {
    problems.push(`站点返回 ${response.status}（${siteUrl}）`)
    return
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('text/html')) {
    problems.push(`站点返回的不是 HTML（content-type: ${contentType}），可能仍是默认占位页`)
  }

  const html = await response.text()
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1]?.trim() ?? '(无标题)'
  notes.push(`站点可访问：${response.url}｜标题「${title}」`)

  if (response.url.replace(/\/$/, '') !== siteUrl.replace(/\/$/, '')) {
    problems.push(
      `站点被跳转到 ${response.url}——如果那是你还没解析好的自定义域名，页面就会打不开。` +
        '此时请把 site.config.json 的 customDomain 设为 false（或在仓库 Variables 里设 SITE_CUSTOM_DOMAIN=false）后重新部署。',
    )
  }

  // 资源路径检查：最典型的白屏原因
  const assetPaths = [
    ...new Set(
      [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((match) => match[1]),
    ),
  ]
  if (assetPaths.length === 0) {
    problems.push('HTML 里找不到任何 JS/CSS 引用，构建产物可能不完整')
    return
  }

  const base = new URL(response.url)
  const sitePath = base.pathname.replace(/\/[^/]*$/, '/')
  const isRootAbsolute = assetPaths.some((asset) => asset.startsWith('/') && !asset.startsWith(sitePath))
  if (isRootAbsolute && sitePath !== '/') {
    problems.push(
      `资源用的是站点根路径（例如 ${assetPaths[0]}），但站点跑在子路径 ${sitePath} 下。` +
        '这就是整页白屏的原因：部署时需要在仓库 Variables 里设置 BASE_PATH 为该子路径（例如 /topicatlas）。',
    )
  }

  let failedAssets = 0
  for (const asset of assetPaths.slice(0, 6)) {
    const assetUrl = new URL(asset, response.url).href
    const assetResponse = await fetch(assetUrl, { method: 'GET', headers: { 'user-agent': 'deploy-check' } })
    if (!assetResponse.ok) failedAssets += 1
  }
  if (failedAssets > 0) {
    problems.push(`${failedAssets} 个静态资源请求失败，页面会白屏或样式缺失`)
  } else {
    notes.push(`已抽检 ${Math.min(assetPaths.length, 6)} 个静态资源，全部可正常加载`)
  }
}

async function main() {
  const local = await loadLocalConfig()
  const repo = arg('repo', 'fategao/topicatlas')
  const url = arg('url', `https://${repo.split('/')[0]}.github.io/${repo.split('/')[1]}/`)

  console.log(`检查仓库：${repo}`)
  console.log(`检查站点：${url}`)
  if (local.domain) console.log(`配置里的自定义域名：${local.domain}（customDomain=${local.customDomain !== false}）`)
  console.log('')

  await checkRepo(repo)
  await checkSite(url)

  console.log('检查结果：')
  for (const note of notes) console.log(`  ✓ ${note}`)

  if (problems.length === 0) {
    console.log('\n结论：部署正常，页面可以直接打开。')
    return
  }

  console.log('')
  for (const problem of problems) console.log(`  ✗ ${problem}`)
  console.log('\n结论：部署还有问题，按上面的提示处理后重新推送即可。')
  process.exitCode = 1
}

main().catch((error) => {
  console.error('自检脚本自身出错：', error)
  process.exitCode = 1
})
