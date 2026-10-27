import { describe, expect, it } from 'vitest'
import {
  eventMatchesFilter,
  normalizeTraceEvents,
  redactTraceText,
} from '../../src/features/agent-observatory/trace'

describe('Agent 轨迹归一化', () => {
  it('只保留可公开的执行事件并忽略 reasoning', () => {
    const events = normalizeTraceEvents([
      {
        type: 'item.completed',
        timestamp: '2026-10-27T10:00:00.000Z',
        item: {
          id: 'command-1',
          type: 'command_execution',
          command: 'npm test',
          status: 'completed',
          exit_code: 0,
        },
      },
      {
        type: 'item.completed',
        timestamp: '2026-10-27T10:00:01.000Z',
        item: {
          id: 'reasoning-1',
          type: 'reasoning',
          text: '不应进入公开轨迹的内部内容',
        },
      },
      {
        type: 'item.completed',
        timestamp: '2026-10-27T10:00:02.000Z',
        item: {
          id: 'file-1',
          type: 'file_change',
          status: 'completed',
          changes: [{ path: 'src/features/matrix-lab/MatrixLab.tsx' }],
        },
      },
    ])

    expect(events).toHaveLength(2)
    expect(events.map((event) => event.kind)).toEqual(['command', 'file'])
    expect(JSON.stringify(events)).not.toContain('内部内容')
  })

  it('脱敏密钥、令牌和本机用户目录', () => {
    const result = redactTraceText(
      'sk-secretvalue123456 token=abc123 C:\\Users\\alice\\project api_key=hello',
    )

    expect(result).not.toContain('secretvalue')
    expect(result).not.toContain('abc123')
    expect(result).not.toContain('alice')
    expect(result).toContain('[REDACTED]')
  })

  it('事件筛选覆盖命令、文件、测试、错误和全部', () => {
    const event = {
      id: 'e1',
      kind: 'test' as const,
      status: 'passed' as const,
      title: 'npm run test',
      summary: '71 个测试通过',
      phase: '验证',
      startedAt: '2026-10-27T10:00:00.000Z',
      targets: [],
      sourceRefs: [],
    }

    expect(eventMatchesFilter(event, 'all')).toBe(true)
    expect(eventMatchesFilter(event, 'test')).toBe(true)
    expect(eventMatchesFilter(event, 'error')).toBe(false)
    expect(eventMatchesFilter({ ...event, status: 'failed' }, 'error')).toBe(true)
  })
})
