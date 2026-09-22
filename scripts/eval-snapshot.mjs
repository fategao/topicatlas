#!/usr/bin/env node
/**
 * 生成 Eval-driven Prompt 页面的真实模型快照。
 *
 * 密钥只从 DASHSCOPE_API_KEY 读取，不会写入仓库或构建产物。
 * 运行：npm run eval:snapshot
 */

import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const endpoint = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
const candidateModels = ['qwen3.8-max', 'qwen3.8-flash', 'qwen-plus']

function renderTemplate(template, ticket) {
  return template.replace('{{ticket}}', ticket)
}

function promptHash(prompt) {
  return createHash('sha256')
    .update(`${prompt.system}\n---\n${prompt.userTemplate}`)
    .digest('hex')
}

async function callModel(model, messages, maxTokens = 200) {
  const apiKey = process.env.DASHSCOPE_API_KEY
  if (!apiKey) throw new Error('缺少 DASHSCOPE_API_KEY，无法生成真实模型快照。')

  const startedAt = performance.now()
  const response = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0,
      max_tokens: maxTokens,
    }),
  })
  const latencyMs = Math.round(performance.now() - startedAt)
  const bodyText = await response.text()

  if (!response.ok) {
    throw new Error(`${model} 请求失败（HTTP ${response.status}）：${bodyText.slice(0, 300)}`)
  }

  let payload
  try {
    payload = JSON.parse(bodyText)
  } catch {
    throw new Error(`${model} 返回了非 JSON 响应：${bodyText.slice(0, 200)}`)
  }

  const raw = payload?.choices?.[0]?.message?.content
  if (typeof raw !== 'string') {
    throw new Error(`${model} 响应缺少 choices[0].message.content`)
  }

  return {
    raw,
    latencyMs,
    inputTokens: Number(payload?.usage?.prompt_tokens ?? 0),
    outputTokens: Number(payload?.usage?.completion_tokens ?? 0),
  }
}

async function resolveModel() {
  const errors = []
  for (const model of candidateModels) {
    try {
      await callModel(model, [{ role: 'user', content: 'Reply with OK.' }], 8)
      console.log(`使用模型：${model}`)
      return model
    } catch (error) {
      errors.push(error.message)
    }
  }
  throw new Error(`候选模型都不可用：\n${errors.join('\n')}`)
}

function estimateTokens(text) {
  return Math.max(1, Math.ceil(text.length / 4))
}

function runProcess(command, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error(`命令超时：${command}`))
    }, timeoutMs)

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) {
        resolve({ stdout, stderr })
      } else {
        reject(new Error(`${command} 退出码 ${code}：${(stderr || stdout).slice(-500)}`))
      }
    })
  })
}

async function callCodex(prompt, messages) {
  const runner = await mkdtemp(path.join(os.tmpdir(), 'topic-atlas-codex-'))
  const outputPath = path.join(runner, 'last-message.txt')
  const system = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n')
  const user = messages
    .filter((message) => message.role !== 'system')
    .map((message) => message.content)
    .join('\n\n')
  const fullPrompt = system ? `${system}\n\n---\n\n${user}` : user
  const startedAt = performance.now()

  try {
    const { stdout, stderr } = await runProcess(
      'codex',
      [
        'exec',
        '--ephemeral',
        '--skip-git-repo-check',
        '-s',
        'read-only',
        '-C',
        runner,
        '-o',
        outputPath,
        '-c',
        'model_reasoning_effort="none"',
        fullPrompt,
      ],
      180_000,
    )
    const raw = (await readFile(outputPath, 'utf8')).trim()
    const diagnostics = `${stdout}\n${stderr}`
    const model = /^model:\s+(.+)$/m.exec(diagnostics)?.[1]?.trim() ?? 'codex-default'
    const provider = /^provider:\s+(.+)$/m.exec(diagnostics)?.[1]?.trim() ?? 'codex'

    return {
      raw,
      latencyMs: Math.round(performance.now() - startedAt),
      inputTokens: estimateTokens(fullPrompt),
      outputTokens: estimateTokens(raw),
      model,
      provider,
    }
  } finally {
    await rm(runner, { recursive: true, force: true })
  }
}

async function generateWithDashscope(cases, prompts) {
  const model = await resolveModel()
  const outputs = []

  for (const prompt of prompts) {
    for (const evalCase of cases) {
      const messages = []
      if (prompt.system) messages.push({ role: 'system', content: prompt.system })
      messages.push({
        role: 'user',
        content: renderTemplate(prompt.userTemplate, evalCase.ticket),
      })

      const result = await callModel(model, messages)
      outputs.push({
        caseId: evalCase.id,
        promptId: prompt.id,
        ...result,
      })
      console.log(`✓ ${prompt.id} · ${evalCase.id} · ${result.outputTokens} tokens`)
    }
  }

  return {
    provider: 'Alibaba Cloud Model Studio · OpenAI-compatible API',
    endpoint: `${endpoint}/chat/completions`,
    model,
    tokenSource: 'provider',
    outputs,
  }
}

async function generateWithCodex(cases, prompts) {
  const outputs = []
  let resolvedModel = 'codex-default'
  let resolvedProvider = 'codex'

  for (const prompt of prompts) {
    for (const evalCase of cases) {
      const messages = []
      if (prompt.system) messages.push({ role: 'system', content: prompt.system })
      messages.push({
        role: 'user',
        content: renderTemplate(prompt.userTemplate, evalCase.ticket),
      })

      const result = await callCodex(
        `${prompt.id} / ${evalCase.id}`,
        messages,
      )
      resolvedModel = result.model
      resolvedProvider = result.provider
      outputs.push({
        caseId: evalCase.id,
        promptId: prompt.id,
        raw: result.raw,
        latencyMs: result.latencyMs,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      })
      console.log(`✓ Codex ${prompt.id} · ${evalCase.id} · ${result.outputTokens} est. tokens`)
    }
  }

  return {
    provider: `OpenAI Codex CLI · ${resolvedProvider}`,
    endpoint: 'local codex exec',
    model: resolvedModel,
    tokenSource: 'estimated',
    outputs,
  }
}

async function main() {
  const cases = JSON.parse(await readFile(path.join(root, 'src/data/eval/cases.json'), 'utf8'))
  const prompts = JSON.parse(await readFile(path.join(root, 'src/data/eval/prompts.json'), 'utf8'))
  let run
  try {
    run = await generateWithDashscope(cases, prompts)
  } catch (error) {
    console.warn(`DashScope 不可用，切换到 Codex CLI 真实调用：${error.message}`)
    run = await generateWithCodex(cases, prompts)
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    provider: run.provider,
    endpoint: run.endpoint,
    model: run.model,
    tokenSource: run.tokenSource,
    promptHashes: Object.fromEntries(prompts.map((prompt) => [prompt.id, promptHash(prompt)])),
    outputs: run.outputs,
  }

  const target = path.join(root, 'src/data/eval/snapshot.json')
  await writeFile(target, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
  console.log(`已写入 ${path.relative(root, target)}：${run.outputs.length} 条真实输出`)
}

main().catch((error) => {
  console.error(`快照生成失败：${error.message}`)
  process.exitCode = 1
})
