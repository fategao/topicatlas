import { useEffect, useRef, useState, type ReactNode } from 'react'

type RevealProps = {
  children: ReactNode
  /** 延迟毫秒数，用于做错落的入场节奏 */
  delay?: number
  className?: string
  as?: 'div' | 'li' | 'section'
}

/**
 * 滚动入场。用 IntersectionObserver 而不是滚动事件监听，
 * 并且只做一次（进入视口后就断开），避免长页面上的持续开销。
 */
export function Reveal({ children, delay = 0, className = '', as = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const Tag = as as 'div'
  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={className}
      style={
        visible
          ? { animation: `reveal-up 620ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }
          : { opacity: 0 }
      }
    >
      {children}
    </Tag>
  )
}
