#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const artifactDir = path.join(root, 'artifacts', 'agent-observatory')
const productLog = path.join(artifactDir, 'product-agent.jsonl')
const monitorLog = path.join(artifactDir, 'monitor-agent.jsonl')
const monitorResult = path.join(artifactDir, 'monitor-agent-result.json')
const productLastMessage = path.join(artifactDir, 'product-agent-last.txt')
const schema = path.join(root, 'scripts', 'observatory-monitor-schema.json')
const snapshotPath = path.join(root, 'src', 'data', 'observatory', 'snapshot.json')

const PRODUCT_PROMPT = `你是“产品 Agent”，负责按照已经冻结的测试实现矩阵学习页，不要重新做需求分析或计划。
允许修改的文件只有：
- src/features/matrix-lab/matrixMath.ts
- src/features/matrix-lab/MatrixLab.tsx
- src/features/matrix-lab/matrix-lab.css
不得修改其他项目文件，不得安装依赖，不得联网，不得提交 Git。
先读取 tests/unit/matrix-math.test.ts 与 tests/component/matrix-lab.test.tsx，遵守现有 React 19、TypeScript strict、Tailwind v4 与可访问性约定。实现 2x2 矩阵数学、六个预设、可拖动且支持键盘的向量手柄、SVG 网格、行列式/秩提示和三个挑战。按钮可用已安装的 lucide-react 图标。完成后只运行：
npx vitest run tests/unit/matrix-math.test.ts tests/component/matrix-lab.test.tsx
持续修复直到测试通过。最终回复请简短列出修改文件和测试结果，不要输出推理过程。`

function run(command, args, { capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const chunks = []
    child.stdout.on('data', (chunk) => {
      chunks.push(chunk)
      if (!capture) process.stdout.write(chunk)
    })
    child.stderr.on('data', (chunk) => {
      chunks.push(chunk)
      if (!capture) process.stderr.write(chunk)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      const output = Buffer.concat(chunks).toString('utf8')
      if (code === 0) resolve(output)
      else reject(new Error(`命令失败（${command}，退出码 ${code}）`))
    })
  })
}

async function runCodexAgent({
  prompt,
  log,
  outputLastMessage,
  outputSchema,
  sandbox = 'workspace-write',
}) {
  const args = [
    'exec',
    '--json',
    '--sandbox',
    sandbox,
    '-C',
    root,
    '--color',
    'never',
  ]
  if (outputLastMessage) args.push('--output-last-message', outputLastMessage)
  if (outputSchema) args.push('--output-schema', outputSchema)
  args.push(prompt)

  const child = spawn(process.platform === 'win32' ? 'codex.cmd' : 'codex', args, {
    cwd: root,
    shell: false,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const chunks = []
  child.stdout.on('data', (chunk) => {
    chunks.push(chunk)
    process.stdout.write(chunk)
  })
  child.stderr.on('data', (chunk) => process.stderr.write(chunk))

  await new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Codex Agent 运行失败，退出码 ${code}`))
    })
  })
  await writeFile(log, Buffer.concat(chunks))
}

async function main() {
  await mkdir(artifactDir, { recursive: true })

  if (process.env.OBSERVATORY_REUSE_RUN === '1') {
    await run(process.execPath, [path.join(root, 'scripts', 'observatory-snapshot.mjs')])
    return
  }

  console.log('1/4 产品 Agent 正在实现矩阵学习页…')
  await runCodexAgent({
    prompt: PRODUCT_PROMPT,
    log: productLog,
    outputLastMessage: productLastMessage,
  })

  console.log('2/4 主会话运行冻结测试…')
  const testOutput = await run(process.platform === 'win32' ? 'npx.cmd' : 'npx', [
    'vitest',
    'run',
    'tests/unit/matrix-math.test.ts',
    'tests/component/matrix-lab.test.tsx',
  ], { capture: true })
  await writeFile(path.join(artifactDir, 'product-test.txt'), testOutput, 'utf8')
  process.stdout.write(testOutput)

  console.log('3/4 生成脱敏事件索引并启动监控 Agent…')
  await run(process.execPath, [path.join(root, 'scripts', 'observatory-snapshot.mjs')])
  const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'))
  const eventIndex = snapshot.events.map(({ id, phase, kind, status, title }) => ({
    id,
    phase,
    kind,
    status,
    title,
  }))
  const monitorPrompt = `你是独立的监控 Agent。下面只有产品 Agent 的脱敏事件索引，不包含内部推理。
请只输出 schema 要求的 JSON。事实：产品 Agent 写入了 matrixMath.ts、MatrixLab.tsx、matrix-lab.css；
嵌套 Codex 沙箱中的 Vitest 可能因 EPERM 无法启动 esbuild，主会话随后独立运行同一测试并成功。
不要调用工具，不要虚构未提供的内容。
事件索引：${JSON.stringify(eventIndex)}`

  await runCodexAgent({
    prompt: monitorPrompt,
    log: monitorLog,
    outputLastMessage: monitorResult,
    outputSchema: schema,
    sandbox: 'read-only',
  })

  console.log('4/4 写入提交快照…')
  await run(process.execPath, [path.join(root, 'scripts', 'observatory-snapshot.mjs')])
  console.log('双 Agent 实验完成。请检查 git diff、npm run test 和浏览器验收后再提交。')
}

main().catch((error) => {
  console.error('双 Agent 实验失败：', error.message)
  console.error('原始日志保留在 artifacts/agent-observatory/，不会进入 Git。')
  process.exitCode = 1
})
