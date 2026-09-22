import { useEffect, useState } from 'react'
import { MDXProvider } from '@mdx-js/react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { SiteHeader } from './components/layout/SiteHeader'
import { SiteFooter } from './components/layout/SiteFooter'
import { mdxComponents } from './components/mdx/MdxComponents'
import { ProgressProvider } from './components/hermes/ProgressContext'
import { CommandPalette } from './components/hermes/CommandPalette'
import { useCommandPaletteShortcut } from './lib/useCommandPaletteShortcut'
import { HomePage } from './routes/HomePage'
import { HermesPage } from './routes/HermesPage'
import { EvalDrivenPromptPage } from './routes/EvalDrivenPromptPage'
import { NotFoundPage } from './routes/NotFoundPage'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (!window.location.hash) window.scrollTo({ top: 0 })
  }, [pathname])
  return null
}

export default function App() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  useCommandPaletteShortcut(setPaletteOpen)

  return (
    <MDXProvider components={mdxComponents}>
      <ProgressProvider>
        <ScrollToTop />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-page-soft focus:px-4 focus:py-2 focus:text-sm"
        >
          跳到主要内容
        </a>
        <SiteHeader onOpenSearch={() => setPaletteOpen(true)} />

        <div id="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/hermes" element={<HermesPage />} />
            <Route path="/eval-driven-prompt" element={<EvalDrivenPromptPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>

        <SiteFooter />
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </ProgressProvider>
    </MDXProvider>
  )
}
