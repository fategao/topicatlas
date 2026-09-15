import { useCallback, useEffect, useRef, useState } from 'react'

type CopyButtonProps = {
  /** 返回要写入剪贴板的文本 */
  getText: () => string
  label?: string
  className?: string
}

export function CopyButton({ getText, label = '复制', className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const onCopy = useCallback(async () => {
    const text = getText()
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        fallbackCopy(text)
      }
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }, [getText])

  return (
    <button
      type="button"
      className={`btn ${className}`}
      onClick={onCopy}
      aria-label={copied ? '已复制' : label}
      data-copied={copied ? 'true' : 'false'}
    >
      <span aria-hidden="true">{copied ? '✓' : '⧉'}</span>
      <span>{copied ? '已复制' : label}</span>
    </button>
  )
}

function fallbackCopy(text: string) {
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  document.execCommand('copy')
  document.body.removeChild(area)
}
