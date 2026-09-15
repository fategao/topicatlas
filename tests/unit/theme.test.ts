// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { applyTheme, parseTheme, THEME_STORAGE_KEY } from '../../src/lib/theme'

describe('主题', () => {
  it('默认是深色，只有显式写入 light 才是亮色', () => {
    expect(parseTheme(null)).toBe('dark')
    expect(parseTheme('')).toBe('dark')
    expect(parseTheme('nonsense')).toBe('dark')
    expect(parseTheme('light')).toBe('light')
  })

  it('应用主题会写到 html 的 data-theme 上', () => {
    const root = document.createElement('html')
    applyTheme('light', root)
    expect(root.getAttribute('data-theme')).toBe('light')
    applyTheme('dark', root)
    expect(root.getAttribute('data-theme')).toBe('dark')
  })

  it('存储键与进度存储互不干扰', () => {
    expect(THEME_STORAGE_KEY).toBe('topicatlas:theme')
  })
})
