import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { applyTheme, loadTheme, saveTheme, type ThemeName } from '../../lib/theme'

type SiteHeaderProps = {
  onOpenSearch: () => void
}

export function SiteHeader({ onOpenSearch }: SiteHeaderProps) {
  const [theme, setTheme] = useState<ThemeName>(() => loadTheme())

  useEffect(() => {
    applyTheme(theme, document.documentElement)
    saveTheme(theme)
  }, [theme])

  return (
    <header
      className="sticky top-0 z-40 border-b border-line backdrop-blur-xl"
      style={{ background: 'color-mix(in oklab, var(--c-page) 82%, transparent)' }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold"
            style={{
              backgroundImage: 'linear-gradient(135deg, var(--c-accent), var(--c-accent-3))',
              color: '#06070d',
            }}
          >
            TA
          </span>
          <span className="text-sm font-semibold tracking-tight text-ink">Topic Atlas</span>
        </Link>

        <nav aria-label="主导航" className="flex items-center gap-2">
          <Link to="/hermes" className="hidden text-xs text-muted transition-colors hover:text-ink sm:block">
            Hermes Agent
          </Link>
          <Link
            to="/eval-driven-prompt"
            className="hidden text-xs text-muted transition-colors hover:text-ink md:block"
          >
            Eval-driven Prompt
          </Link>
          <button
            type="button"
            className="btn"
            onClick={onOpenSearch}
            aria-label="搜索 Hermes 内容"
            aria-keyshortcuts="Control+K Meta+K"
          >
            <span aria-hidden="true">⌕</span>
            <span className="hidden sm:inline">搜索 Hermes</span>
            <kbd
              className="hidden rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-faint sm:inline"
              aria-hidden="true"
            >
              ⌘K
            </kbd>
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? '切换到亮色主题' : '切换到深色主题'}
          >
            <span aria-hidden="true">{theme === 'dark' ? '☾' : '☀'}</span>
          </button>
        </nav>
      </div>
    </header>
  )
}
