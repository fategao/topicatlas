export type ThemeName = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'topicatlas:theme'

export function parseTheme(raw: string | null | undefined): ThemeName {
  return raw === 'light' ? 'light' : 'dark'
}

export function loadTheme(storage?: Storage): ThemeName {
  const target = storage ?? safeStorage()
  if (!target) return 'dark'
  try {
    return parseTheme(target.getItem(THEME_STORAGE_KEY))
  } catch {
    return 'dark'
  }
}

export function saveTheme(theme: ThemeName, storage?: Storage): void {
  const target = storage ?? safeStorage()
  if (!target) return
  try {
    target.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // 存储不可用时主题只在内存中生效
  }
}

export function applyTheme(theme: ThemeName, root: HTMLElement): void {
  root.setAttribute('data-theme', theme)
}

/** 在 React 挂载前同步一次，避免深色页面闪一下亮色。 */
export function initTheme(root: HTMLElement): ThemeName {
  const theme = loadTheme()
  applyTheme(theme, root)
  return theme
}

function safeStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}
