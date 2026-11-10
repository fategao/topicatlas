#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import {
  assertTraceEvidence,
  buildSkillFileRecords,
  normalizeTraceEvents,
  parseJsonLines,
  redactText,
  scanSkillIndex,
  sha256,
  skillFrontmatter,
} from './skills-trace-lib.mjs'

const execFileAsync = promisify(execFile)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const artifactDirectory = path.join(root, 'artifacts', 'skills-loading')
const rawLogPath = path.join(artifactDirectory, 'codex-run.jsonl')
const stderrPath = path.join(artifactDirectory, 'codex-run.stderr.txt')
const outputPath = path.join(root, 'src', 'data', 'skills-loading', 'snapshot.json')

const skillRelative = '.agents/skills/release-brief-auditor'
const skillDirectory = path.join(root, skillRelative)
const skillPath = `${skillRelative}/SKILL.md`
const referencePath = `${skillRelative}/references/editorial-checklist.md`
const scriptPath = `${skillRelative}/scripts/audit-brief.mjs`
const briefPath = `${skillRelative}/examples/release-brief.md`
const model = process.env.SKILLS_TRACE_MODEL || 'deepseek-flash'
const provider = process.env.SKILLS_TRACE_PROVIDER || 'custom'
const reasoningEffort = process.env.SKILLS_TRACE_REASONING || 'high'

const prompt = `$release-brief-auditor

你是本次“技能加载”演示的录制 Agent。任务只读，不修改任何文件，不联网，不安装依赖，不提交 Git。

请严格按以下顺序留下可审计证据：
1. 读取 ${skillPath}。
2. 读取 ${referencePath}，用清单审查示例简报。
3. 执行 node ${scriptPath} ${briefPath}。
4. 根据脚本输出和清单，用中文返回三条最高价值的发布建议，并列出你实际读取的文件。

不要调用与该任务无关的技能或工具。不要输出内部推理。`

function runCodex() {
  return new Promise((resolve, reject) => {
    const args = [
      'exec',
      '--json',
      '--ephemeral',
      '--sandbox',
      'read-only',
      '-C',
      root,
      '--color',
      'never',
      '-m',
      model,
      '-c',
      `model_provider=${JSON.stringify(provider)}`,
      '-c',
      `model_reasoning_effort=${JSON.stringify(reasoningEffort)}`,
      prompt,
    ]
    const child = spawn(process.platform === 'win32' ? 'codex.exe' : 'codex', args, {
      cwd: root,
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const stdout = []
    const stderr = []
    const timeout = setTimeout(() => {
      child.kill()
      reject(new Error('Codex 录制超过 180 秒，已终止；raw artifacts 不会进入 Git。'))
    }, Number(process.env.SKILLS_TRACE_TIMEOUT_MS) || 180_000)

    child.stdout.on('data', (chunk) => {
      stdout.push(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr.push(chunk)
    })
    child.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timeout)
      if (code === 0) resolve({ stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8') })
      else reject(new Error(`Codex 录制失败，退出码 ${code}。请检查 artifacts/skills-loading。`))
    })
  })
}

async function version(command, args = ['--version']) {
  try {
    const { stdout } = await execFileAsync(command, args, { cwd: root, windowsHide: true })
    return stdout.trim()
  } catch {
    return 'unavailable'
  }
}

async function main() {
  await mkdir(artifactDirectory, { recursive: true })

  let stdout
  let stderr
  if (process.env.SKILLS_TRACE_REUSE === '1') {
    stdout = await readFile(rawLogPath, 'utf8')
    stderr = await readFile(stderrPath, 'utf8').catch(() => '')
    console.log(`复用已录制日志：${path.relative(root, rawLogPath)}`)
  } else {
    console.log(`录制 Codex 技能轨迹：${provider} / ${model} / ${reasoningEffort}`)
    const result = await runCodex()
    stdout = result.stdout
    stderr = result.stderr
    await writeFile(rawLogPath, stdout, 'utf8')
    await writeFile(stderrPath, stderr, 'utf8')
  }

  const rawLines = parseJsonLines(stdout)
  const skillText = await readFile(path.join(root, skillPath), 'utf8')
  const files = await buildSkillFileRecords(skillDirectory)
  const fileChars = new Map(files.map((file) => [file.path, file.chars]))
  const index = await scanSkillIndex([
    { absolute: path.join(root, '.agents', 'skills'), label: 'project:.agents/skills' },
    { absolute: path.join(os.homedir(), '.codex', 'skills'), label: 'user:~/.codex/skills' },
    { absolute: path.join(os.homedir(), '.agents', 'skills'), label: 'user:~/.agents/skills' },
    {
      absolute: path.join(os.homedir(), '.codex', 'plugins', 'cache'),
      label: 'plugins:~/.codex/plugins/cache',
    },
  ])
  const normalized = normalizeTraceEvents(rawLines, {
    root,
    prompt,
    skillName: 'release-brief-auditor',
    skillPath,
    referencePath,
    scriptPath,
    fileChars,
    indexMetadataChars: index.metadataChars,
    indexEstimatedTokens: index.estimatedTokens,
  })
  assertTraceEvidence(normalized.events)

  const frontmatter = skillFrontmatter(skillText)
  const snapshot = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    title: 'Skill Loading Lab',
    label: 'RECORDED CODEX TURN',
    provider,
    model,
    reasoningEffort,
    environment: {
      os: `${os.type()} ${os.release()} ${os.arch()}`,
      node: await version(process.execPath),
      codex: await version(process.platform === 'win32' ? 'codex.exe' : 'codex'),
      sandbox: 'read-only',
      captureMode: 'codex exec --json --ephemeral',
    },
    prompt: {
      text: redactText(prompt, root),
      sha256: sha256(prompt),
    },
    finalOutput: redactText(normalized.finalOutput, root),
    skill: {
      name: frontmatter.name,
      path: skillRelative,
      description: frontmatter.description,
      files,
    },
    index,
    usage: normalized.usage,
    events: normalized.events,
    sources: [
      {
        label: 'OpenAI · Agent Skills',
        url: 'https://developers.openai.com/codex/skills',
        usedFor: '技能目录、按需加载、2% 初始上下文预算与显式/隐式调用。',
        retrievedAt: '2026-11-10',
      },
      {
        label: 'OpenAI · Skills in plugins',
        url: 'https://developers.openai.com/plugins/concepts/skills',
        usedFor: '模型先看到 name/description，请求匹配后才读取完整 SKILL.md。',
        retrievedAt: '2026-11-10',
      },
      {
        label: 'cctrace · TracePair model',
        url: 'https://github.com/thevibeworks/cctrace/blob/main/README.zh-CN.md',
        usedFor: '诊断控制台的 request、上下文、工具与运行证据组织方式。',
        retrievedAt: '2026-11-10',
      },
    ],
    notes: [
      '轨迹来自一次真实、只读、无持久化会话的 Codex CLI 运行；浏览器只读取构建前快照。',
      'Codex JSON 暴露 agent message、command execution 与 provider usage，但不暴露完整 system prompt。',
      '初始技能索引规模由本机 SKILL.md frontmatter 计算，使用 chars/4 估算，不冒充 provider token。',
      '内部 reasoning 未写入快照；绝对工作区路径已归一化，原始 JSONL 只保留在被 Git 忽略的 artifacts/。',
      stderr.trim() ? '本次录制 stderr 有内容，详见本地 artifacts；未写入页面。' : '本次录制 stderr 为空。',
    ],
  }

  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
  console.log(
    `快照已写入：${path.relative(root, outputPath)} · ${snapshot.events.length} events · ${snapshot.usage.inputTokens} input / ${snapshot.usage.outputTokens} output`,
  )
}

main().catch((error) => {
  console.error(`skills trace 失败：${error.message}`)
  process.exitCode = 1
})
