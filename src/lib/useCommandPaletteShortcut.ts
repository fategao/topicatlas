import { useEffect } from 'react'

/** 全局快捷键：⌘K / Ctrl+K 打开全局搜索。 */
export function useCommandPaletteShortcut(setOpen: (open: boolean) => void) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setOpen])
}
