#!/usr/bin/env node
// 一键切换部署形态。
//
//   node scripts/set-domain.mjs topicatlas.tech   # 切到自定义域名
//   node scripts/set-domain.mjs --project-page    # 切回 GitHub Pages 项目页
//
// 之所以做成脚本：手动改 site.config.json 时最容易漏掉 basePath，
// 一旦 basePath 与真实部署路径不一致，整站会白屏。

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSiteArtifacts, switchToCustomDomain, switchToProjectPage } from './site-config.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const configPath = path.join(root, 'site.config.json')

// 用 GitHub Pages 官方的 A 记录；www 用 CNAME 指向 <user>.github.io
const PAGES_A_RECORDS = [
  '185.199.108.153',
  '185.199.109.153',
  '185.199.110.153',
  '185.199.111.153',
]

function printDnsRecords(config) {
  const [owner] = config.repo.split('/')
  console.log('\n在 Cloudflare（或你的 DNS 服务商）添加这些记录：\n')
  console.log('  类型   名称   内容')
  for (const ip of PAGES_A_RECORDS) console.log(`  A      @      ${ip}`)
  console.log(`  CNAME  www    ${owner}.github.io`)
  console.log('\n  顺序很重要：先把 Cloudflare 的橙云关掉（DNS only / 灰云），')
  console.log('  等 GitHub 签发好证书、Pages 页面显示 HTTPS 正常后，再打开橙云并把 SSL 模式设为 Full。')
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
  const toProjectPage = process.argv.includes('--project-page')

  const raw = JSON.parse(await readFile(configPath, 'utf8'))

  let next
  if (toProjectPage) {
    next = switchToProjectPage(raw)
  } else {
    const domain = args[0]
    if (!domain) {
      console.error('用法：node scripts/set-domain.mjs <域名>   或   node scripts/set-domain.mjs --project-page')
      process.exitCode = 1
      return
    }
    next = switchToCustomDomain(raw, domain)
  }

  await writeFile(configPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8')

  const artifacts = buildSiteArtifacts(next)
  console.log(`已更新 site.config.json：`)
  console.log(JSON.stringify(next, null, 2))
  console.log(`\n站点地址：${artifacts.siteUrl}`)
  console.log(artifacts.cname ? '构建会产出 CNAME（GitHub Pages 会认这个自定义域名）' : '构建不产出 CNAME（按 GitHub Pages 项目页发布）')

  if (!toProjectPage) {
    printDnsRecords(next)
    console.log('\n接下来：')
    console.log('  1. npm run build && npm run deploy:check -- --url ' + artifacts.siteUrl + '/')
    console.log('  2. git add -A && git commit -m "chore: 绑定自定义域名" && git push')
    console.log('  3. 等 1-3 分钟，再用 npm run deploy:check 验证线上')
  } else {
    console.log(`\n接下来：npm run build && git add -A && git commit -m "chore: 切回项目页部署" && git push`)
  }
}

main().catch((error) => {
  console.error('切换失败：', error.message)
  process.exitCode = 1
})
