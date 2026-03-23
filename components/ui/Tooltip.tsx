'use client'

import { ReactNode } from 'react'

interface TooltipProps {
  text: string
  children: ReactNode
  width?: 'sm' | 'md' | 'lg'
  position?: 'top' | 'bottom'
  align?: 'center' | 'left' | 'right'
  /** Pass "block" or "flex" when wrapping full-width block elements */
  display?: 'inline-flex' | 'block' | 'flex'
}

/**
 * CSS-only hover tooltip. Wrap any element — the popup appears on hover.
 * Uses `group` so the parent div handles the hover target.
 */
export default function Tooltip({
  text,
  children,
  width = 'md',
  position = 'top',
  align = 'center',
  display = 'inline-flex',
}: TooltipProps) {
  const widthClass = { sm: 'w-40', md: 'w-60', lg: 'w-80' }[width]
  const alignClass = {
    center: 'left-1/2 -translate-x-1/2',
    left: 'left-0',
    right: 'right-0',
  }[align]

  const posClass = position === 'top' ? 'bottom-full mb-2.5' : 'top-full mt-2.5'
  const arrowClass =
    position === 'top'
      ? 'absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#27272A]'
      : 'absolute bottom-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-b-[#27272A]'

  return (
    <span className={`relative group/tip cursor-default ${display}`}>
      {children}
      <span
        role="tooltip"
        className={[
          'absolute z-50 pointer-events-none',
          posClass,
          alignClass,
          widthClass,
          'px-3 py-2.5',
          'bg-[#111114] border border-[#27272A] rounded-lg',
          'text-[13px] leading-relaxed text-zinc-300 font-sans',
          'shadow-xl shadow-black/40',
          'opacity-0 group-hover/tip:opacity-100',
          'translate-y-1 group-hover/tip:translate-y-0',
          'transition-all duration-200',
        ].join(' ')}
      >
        {text}
        <span className={arrowClass} aria-hidden="true" />
      </span>
    </span>
  )
}
