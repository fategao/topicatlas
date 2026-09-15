import type { ReactNode } from 'react'

type CalloutProps = {
  title?: string
  tone?: 'info' | 'tip' | 'warn'
  children: ReactNode
}

const TONES: Record<NonNullable<CalloutProps['tone']>, { icon: string; accent: string }> = {
  info: { icon: 'i', accent: 'var(--c-accent)' },
  tip: { icon: '★', accent: 'var(--c-accent-2)' },
  warn: { icon: '!', accent: '#f0a13c' },
}

export function Callout({ title, tone = 'info', children }: CalloutProps) {
  const { icon, accent } = TONES[tone]
  return (
    <aside className="card my-5 p-4" style={{ borderLeft: `2px solid ${accent}` }}>
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <span
          aria-hidden="true"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]"
          style={{ background: 'var(--c-surface-strong)', color: accent }}
        >
          {icon}
        </span>
        {title ?? '说明'}
      </div>
      <div className="mt-2 text-sm text-muted [&_a]:link-underline [&_code]:font-mono">{children}</div>
    </aside>
  )
}
