type ProgressRingProps = {
  percent: number
  done: number
  total: number
  size?: number
  label?: string
}

export function ProgressRing({ percent, done, total, size = 96, label }: ProgressRingProps) {
  const stroke = 7
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, percent))
  const offset = circumference * (1 - clamped / 100)

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`学习进度：已完成 ${done} / ${total} 项验收，约 ${clamped}%`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--c-line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ring-gradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)' }}
        />
        <defs>
          <linearGradient id="ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--c-accent)" />
            <stop offset="100%" stopColor="var(--c-accent-2)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className="text-lg font-semibold tabular-nums">{clamped}%</span>
        <span className="mt-1 text-[11px] text-faint tabular-nums">
          {done}/{total}
        </span>
      </div>
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  )
}
