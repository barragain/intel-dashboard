import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface TrendArrowProps {
  direction: 'improving' | 'stable' | 'deteriorating' | 'up' | 'down' | 'neutral'
  label?: string
  size?: number
}

export default function TrendArrow({ direction, label, size = 16 }: TrendArrowProps) {
  const isUp = direction === 'improving' || direction === 'up'
  const isDown = direction === 'deteriorating' || direction === 'down'

  if (isUp) {
    return (
      <span className="inline-flex items-center gap-1 text-trend-up" aria-label={label ?? 'improving'}>
        <TrendingUp size={size} />
        {label && <span className="text-xs font-medium">{label}</span>}
      </span>
    )
  }
  if (isDown) {
    return (
      <span className="inline-flex items-center gap-1 text-trend-down" aria-label={label ?? 'deteriorating'}>
        <TrendingDown size={size} />
        {label && <span className="text-xs font-medium">{label}</span>}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-trend-neutral" aria-label={label ?? 'stable'}>
      <Minus size={size} />
      {label && <span className="text-xs font-medium">{label}</span>}
    </span>
  )
}
