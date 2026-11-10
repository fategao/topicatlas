import { describe, expect, it } from 'vitest'
import {
  assertTraceEvidence,
  normalizeTraceEvents,
  parseJsonLines,
  providerUsage,
  redactText,
  sha256,
} from '../../scripts/skills-trace-lib.mjs'

const lines = [
  { type: 'thread.started', thread_id: 'test-thread' },
  {
    type: 'item.completed',
    item: {
      id: 'cmd-1',
      type: 'command_execution',
      command:
        '"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content .agents/skills/demo/SKILL.md -Raw"',
      aggregated_output: 'skill body',
      exit_code: 0,
      status: 'completed',
    },
  },
  {
    type: 'item.completed',
    item: {
      id: 'cmd-2',
      type: 'command_execution',
      command: 'Get-Content .agents/skills/demo/references/editorial-checklist.md',
      aggregated_output: 'checklist',
      exit_code: 0,
      status: 'completed',
    },
  },
  {
    type: 'item.completed',
    item: {
      id: 'cmd-3',
      type: 'command_execution',
      command: 'node .agents/skills/demo/scripts/audit-brief.mjs examples/brief.md',
      aggregated_output: '{"verdict":"needs_revision"}',
      exit_code: 0,
      status: 'completed',
    },
  },
  {
    type: 'item.completed',
    item: { id: 'reasoning-1', type: 'reasoning', text: 'must not enter snapshot' },
  },
  {
    type: 'item.completed',
    item: { id: 'message-1', type: 'agent_message', text: '三条发布建议。' },
  },
  {
    type: 'turn.completed',
    usage: {
      input_tokens: 100,
      cached_input_tokens: 40,
      cache_write_input_tokens: 5,
      output_tokens: 20,
      reasoning_output_tokens: 9,
    },
  },
]

const options = {
  root: 'D:\\task\\demo',
  prompt: '$demo',
  skillName: 'demo',
  skillPath: '.agents/skills/demo/SKILL.md',
  referencePath: '.agents/skills/demo/references/checklist.md',
  scriptPath: '.agents/skills/demo/scripts/audit.mjs',
  fileChars: new Map([
    ['.agents/skills/demo/SKILL.md', 80],
    ['.agents/skills/demo/references/checklist.md', 40],
  ]),
  indexMetadataChars: 400,
  indexEstimatedTokens: 100,
}

describe('skills trace normalization', () => {
  it('保留真实读取、脚本执行、最终输出与 provider usage', () => {
    const rawLines = parseJsonLines(lines.map((line) => JSON.stringify(line)).join('\n'))
    const result = normalizeTraceEvents(rawLines, options)

    expect(result.events.map((event) => event.level)).toEqual([
      'context',
      'metadata',
      'instructions',
      'instructions',
      'reference',
      'script',
      'output',
      'context',
    ])
    expect(result.events.find((event) => event.kind === 'read' && event.level === 'reference'))
      .toMatchObject({ contextCharsAdded: 40, contextTokensAdded: 10 })
    expect(result.events.find((event) => event.level === 'script')?.outputExcerpt).toContain(
      'needs_revision',
    )
    expect(result.finalOutput).toBe('三条发布建议。')
    expect(result.usage).toEqual({
      inputTokens: 100,
      cachedInputTokens: 40,
      cacheWriteInputTokens: 5,
      outputTokens: 20,
      reasoningOutputTokens: 9,
      source: 'provider',
    })
    expect(JSON.stringify(result.events)).not.toContain('must not enter snapshot')
  })

  it('缺少任一关键证据时拒绝生成快照', () => {
    const rawLines = parseJsonLines(
      lines
        .filter(
          (line) =>
            line?.item?.id !== 'cmd-2' &&
            line?.item?.id !== 'cmd-3',
        )
        .map((line) => JSON.stringify(line))
        .join('\n'),
    )
    const result = normalizeTraceEvents(rawLines, options)

    expect(() => assertTraceEvidence(result.events)).toThrow(/引用文件读取、脚本执行/)
  })

  it('缺失 provider usage 时明确失败', () => {
    expect(() => providerUsage(lines.slice(0, -1))).toThrow(/turn\.completed\.usage/)
  })

  it('脱敏 Windows 解释器路径、用户目录与凭据样式文本', () => {
    const text = redactText(
      '"C:\\\\Windows\\\\System32\\\\WindowsPowerShell\\\\v1.0\\\\powershell.exe" C:\\Users\\alice\\demo sk-secret123456 Bearer abc.def',
      'D:\\task\\demo',
    )

    expect(text).toContain('powershell.exe')
    expect(text).not.toContain('C:\\Users\\alice')
    expect(text).not.toContain('sk-secret123456')
    expect(text).not.toContain('Bearer abc.def')
  })

  it('文件哈希稳定且事件 id 连续', () => {
    expect(sha256('demo')).toBe(sha256('demo'))
    const result = normalizeTraceEvents(
      parseJsonLines(lines.map((line) => JSON.stringify(line)).join('\n')),
      options,
    )

    expect(result.events.map((event) => event.id)).toEqual(
      result.events.map((_, index) => `skill-event-${index + 1}`),
    )
  })
})
