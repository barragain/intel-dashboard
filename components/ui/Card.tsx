import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  elevated?: boolean
}

export default function Card({ children, className = '', elevated = false }: CardProps) {
  const bg = elevated ? 'bg-intel-elevated' : 'bg-intel-surface'
  return (
    <div
      className={`${bg} border border-intel-border rounded-lg shadow-card ${className}`}
    >
      {children}
    </div>
  )
}
