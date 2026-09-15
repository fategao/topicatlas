#!/usr/bin/env node
// 零依赖本地静态服务器，用来预览构建产物。
//
// 为什么需要它：dist/index.html 里引用的是站点根路径（/assets/...），
// 直接双击文件（file://）时浏览器会按磁盘根目录解析并因 CORS 而白屏。
// 通过 http 提供即可正常打开，并还原 SPA 的 404 回退行为。

import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// SERVE_DIR 用于预览任意目录（例如模拟 GitHub Pages 项目页的子路径部署）
const dist = process.env.SERVE_DIR ? path.resolve(process.env.SERVE_DIR) : path.join(root, 'dist')
const port = Number(process.env.PORT ?? 4173)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
}

/** 解析请求路径；找不到时回退到 404.html（与 GitHub Pages 行为一致）。 */
export async function resolveFile(urlPath) {
  const relative = decodeURIComponent(String(urlPath).split('?')[0]).replace(/^\/+/, '')
  const candidate = path.join(dist, relative)

  if (!candidate.startsWith(dist)) return null // 阻断路径穿越

  try {
    const info = await stat(candidate)
    if (info.isFile()) return candidate
    const index = path.join(candidate, 'index.html')
    await stat(index)
    return index
  } catch {
    try {
      const fallback = path.join(dist, '404.html')
      await stat(fallback)
      return fallback
    } catch {
      return null
    }
  }
}

const server = createServer(async (req, res) => {
  const file = await resolveFile(req.url ?? '/')
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('404 — 请先运行 npm run build')
    return
  }
  res.writeHead(200, {
    'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  })
  createReadStream(file).pipe(res)
})

export { server }

// 被 import 时不启动监听，直接运行时才启动
if (process.argv[1] && process.argv[1].endsWith('serve.mjs')) {
  server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${port}/`
    console.log(`本地预览已启动：${url}`)
    console.log('按 Ctrl+C 停止。')
    if (!process.env.NO_OPEN) {
      const [command, args] =
        process.platform === 'win32'
          ? ['cmd', ['/c', 'start', '', url]]
          : ['open', [url]]
      spawn(command, args, { stdio: 'ignore', detached: true }).unref()
    }
  })
}
