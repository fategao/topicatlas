#!/usr/bin/env node
// GitHub Pages 上 SPA 深链回退：把 index.html 复制成 404.html。
// 直接访问 /hermes（或在该地址刷新）时 GitHub Pages 会返回 404.html，
// 由前端路由接管渲染，避免出现真 404 页面。

import { access, copyFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

  // public/CNAME 会被 Vite 自动复制，这里兜底确认一次。
  const cname = path.join(dist, 'CNAME')
  if (!(await exists(cname))) {
    await writeFile(cname, 'topicatlas.dev\n', 'utf8')
  }

  console.log('postbuild: 已生成 dist/404.html（SPA 回退）并确认 CNAME')
}

main().catch((error) => {
  console.error('postbuild 失败：', error.message)
  process.exitCode = 1
})
