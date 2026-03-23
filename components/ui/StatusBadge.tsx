interface StatusBadgeProps {
  status: string
  variant?: 'stable' | 'watch' | 'worried' | 'escalating' | 'de-escalating' | 'bullish' | 'bearish' | 'neutral' | 'fearful' | 'low' | 'medium' | 'high'
  size?: 'sm' | 'md'
}

const VARIANT_CLASSES: Record<string, string> = {
  stable: 'bg-risk-stable-bg border-risk-stable-border text-risk-stable',
  watch: 'bg-risk-watch-bg border-risk-watch-border text-risk-watch',
  worried: 'bg-risk-worried-bg border-risk-worried-border text-risk-worried',
  escalating: 'bg-risk-worried-bg border-risk-worried-border text-risk-worried',
  'de-escalating': 'bg-risk-stable-bg border-risk-stable-border text-risk-stable',
  bullish: 'bg-risk-stable-bg border-risk-stable-border text-risk-stable',
  bearish: 'bg-risk-worried-bg border-risk-worried-border text-risk-worried',
  fearful: 'bg-risk-worried-bg border-risk-worried-border text-risk-worried',
  neutral: 'bg-intel-elevated border-intel-border text-intel-secondary',
  low: 'bg-risk-stable-bg border-risk-stable-border text-risk-stable',
  medium: 'bg-risk-watch-bg border-risk-watch-border text-risk-watch',
  high: 'bg-risk-worried-bg border-risk-worried-border text-risk-worried',
}

export default function StatusBadge({ status, variant, size = 'sm' }: StatusBadgeProps) {
  const key = variant ?? status.toLowerCase().replace(/\s+/g, '-')
  const classes = VARIANT_CLASSES[key] ?? 'bg-intel-elevated border-intel-border text-intel-secondary'
  const sizeClasses = size === 'md' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[11px]'

  return (
    <span
      className={`inline-flex items-center border rounded font-mono font-medium uppercase tracking-wider ${sizeClasses} ${classes}`}
    >
      {status}
    </span>
  )
}
