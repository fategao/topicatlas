#!/usr/bin/env node
// 抓取官方文档快照（中文 + 英文），固化到 content/upstream/ 下。
//
// 为什么走 api.github.com 而不是 raw.githubusercontent.com：
// 开发机所在的网络环境无法直连 raw.githubusercontent.com（连接被重置），
// 而 api.github.com 的 contents 接口可以正常返回 base64 内容。
//
// 用法：
//   node scripts/fetch-upstream.mjs
//   GITHUB_TOKEN=xxx node scripts/fetch-upstream.mjs   # 提高接口配额（未认证 60 次/小时）

import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MODULES, UPSTREAM_REF, UPSTREAM_REPO } from './modules.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outRoot = path.join(root, 'content', 'upstream')
const manifestPath = path.join(outRoot, 'manifest.json')

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || ''

function apiHeaders() {
  const headers = {
    accept: 'application/vnd.github+json',
    'user-agent': 'topic-atlas-content-pipeline',
    'x-github-api-version': '2022-11-28',
  }
  if (token) headers.authorization = `Bearer ${token}`
  return headers
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: apiHeaders() })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub API ${res.status} ${res.statusText} — ${url}\n${body.slice(0, 400)}`)
  }
  return res.json()
}

async function fetchFile(repoPath) {
  const url = `https://api.github.com/repos/${UPSTREAM_REPO}/contents/${repoPath}?ref=${UPSTREAM_REF}`
  const json = await fetchJson(url)
  if (json.type !== 'file' || typeof json.content !== 'string') {
    throw new Error(`期望文件但拿到其它类型: ${repoPath}`)
  }
  return {
    text: Buffer.from(json.content, 'base64').toString('utf8'),
    sha: json.sha,
    size: json.size,
  }
}

async function main() {
  const repoInfo = await fetchJson(`https://api.github.com/repos/${UPSTREAM_REPO}`)
  const commitInfo = await fetchJson(
    `https://api.github.com/repos/${UPSTREAM_REPO}/commits/${UPSTREAM_REF}`,
  )
  const commitSha = commitInfo.sha
  const fetchedAt = new Date().toISOString()

  const files = []
  let downloaded = 0

  for (const module_ of MODULES) {
    const entry = { id: module_.id, step: module_.step, zh: null, en: null, zhUrl: module_.zhUrl, enUrl: module_.enUrl }

    for (const [locale, repoPath] of [
      ['zh', module_.zhPath],
      ['en', module_.enPath],
    ]) {
      let payload
      try {
        payload = await fetchFile(repoPath)
      } catch (error) {
        console.warn(`  ! 抓取失败 ${repoPath}: ${error.message}`)
        continue
      }

      const target = path.join(outRoot, locale, repoPath.replace(/^website\/(docs|i18n\/zh-Hans\/docusaurus-plugin-content-docs\/current)\//, ''))
      await mkdir(path.dirname(target), { recursive: true })
      await writeFile(target, payload.text, 'utf8')
      entry[locale] = { file: repoPath, snapshot: path.relative(root, target).split(path.sep).join('/'), sha: payload.sha, size: payload.size }
      downloaded += 1
    }

    if (!entry.zh || !entry.en) {
      throw new Error(`模块 ${module_.id} 缺少${entry.zh ? '英文' : '中文'}快照`)
    }
    files.push(entry)
    console.log(`  ✓ ${module_.id.padEnd(20)} zh=${entry.zh.size}B en=${entry.en.size}B`)
  }

  const previous = existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, 'utf8')) : null
  const manifest = {
    repo: UPSTREAM_REPO,
    repoUrl: repoInfo.html_url,
    ref: UPSTREAM_REF,
    commitSha,
    commitUrl: `https://github.com/${UPSTREAM_REPO}/commit/${commitSha}`,
    license: repoInfo.license?.spdx_id ?? 'MIT',
    fetchedAt,
    fileCount: downloaded,
    files,
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

  if (previous && previous.commitSha !== commitSha) {
    console.log(`\n上游有新提交：${previous.commitSha.slice(0, 7)} → ${commitSha.slice(0, 7)}`)
  }
  console.log(`\n抓取完成：${downloaded} 个文件 → content/upstream/`)
  console.log(`上游 commit：${commitSha}`)
  console.log(`抓取时间：${fetchedAt}`)
}

main().catch((error) => {
  console.error('\n抓取失败：', error.message)
  process.exitCode = 1
})
