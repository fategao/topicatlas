import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SkillLoadingLab } from '../../src/features/skills-loading/SkillLoadingLab'
import type { SkillsLoadingSnapshot } from '../../src/data/skills-loading/types'
import snapshotJson from '../../src/data/skills-loading/snapshot.json'

const snapshot = snapshotJson as unknown as SkillsLoadingSnapshot

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('SkillLoadingLab', () => {
  it('首屏只显示第一个真实事件和初始索引预算', () => {
    render(<SkillLoadingLab snapshot={snapshot} />)

    expect(screen.getByTestId('skills-load-active-event')).toHaveTextContent(
      '显式调用进入当前 turn',
    )
    expect(screen.getByTestId('skills-load-metadata-budget')).toHaveTextContent('35,318 chars')
    expect(screen.getByTestId('skills-load-metadata-budget')).toHaveTextContent('8,830 token')
    expect(
      within(screen.getByTestId('skills-load-event-list')).getAllByRole('button'),
    ).toHaveLength(8)
  })

  it('点击读取事件后同步高亮已加载文件并展示命令输出', () => {
    render(<SkillLoadingLab snapshot={snapshot} />)

    fireEvent.click(
      screen.getByRole('button', { name: /按需读取审查清单/ }),
    )

    expect(screen.getByTestId('skills-load-active-event')).toHaveTextContent(
      'editorial-checklist.md',
    )
    expect(
      screen.getByTestId(
        'skills-load-file-.agents-skills-release-brief-auditor-references-editorial-checklist.md',
      ),
    ).toHaveClass('is-loaded')
    expect(screen.getByTestId('skills-load-context-total')).not.toHaveTextContent('0 token')
  })

  it('支持单步按钮与键盘方向键', () => {
    render(<SkillLoadingLab snapshot={snapshot} />)
    const workbench = screen.getByTestId('skills-load-workbench')

    fireEvent.keyDown(workbench, { key: 'ArrowRight' })
    expect(screen.getByTestId('skills-load-active-event')).toHaveTextContent(
      '初始技能索引已准备',
    )

    fireEvent.click(screen.getByRole('button', { name: '下一个事件' }))
    expect(screen.getByTestId('skills-load-active-event')).toHaveTextContent(
      `显式命中 ${snapshot.skill.name}`,
    )
  })

  it('播放会按事件顺序推进，并可在末尾停止', async () => {
    vi.useFakeTimers()
    render(<SkillLoadingLab snapshot={snapshot} />)

    fireEvent.click(screen.getByRole('button', { name: '播放轨迹回放' }))
    expect(screen.getByRole('button', { name: '暂停轨迹回放' })).toBeVisible()

    await act(async () => {
      vi.advanceTimersByTime(1_300)
    })
    expect(screen.getByTestId('skills-load-active-event')).toHaveTextContent(
      '初始技能索引已准备',
    )
  })

  it('减少动效偏好下不自动播放，但仍能手动单步', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          matches: query.includes('prefers-reduced-motion'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as MediaQueryList,
    )
    render(<SkillLoadingLab snapshot={snapshot} />)

    fireEvent.click(screen.getByRole('button', { name: '播放轨迹回放' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '播放轨迹回放' })).toBeVisible(),
    )

    fireEvent.click(screen.getByRole('button', { name: '下一个事件' }))
    expect(screen.getByTestId('skills-load-active-event')).toHaveTextContent(
      '初始技能索引已准备',
    )
  })
})
