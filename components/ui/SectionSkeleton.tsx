interface SkeletonProps {
  lines?: number
  className?: string
}

export function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div
      className={`shimmer rounded h-4 ${className}`}
      aria-hidden="true"
    />
  )
}

export function SkeletonBlock({ lines = 3, className = '' }: SkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={i}
          className={i === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  )
}

export default function SectionSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="p-6 animate-pulse space-y-4" role="status" aria-label="Loading">
      <SkeletonLine className="h-5 w-1/3" />
      <SkeletonBlock lines={lines} />
      <span className="sr-only">Loading...</span>
    </div>
  )
}
