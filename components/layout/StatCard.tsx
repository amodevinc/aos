import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: string
  className?: string
}

export function StatCard({ label, value, sub, accent, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[#1e1e2a] bg-[#111116] p-4',
        className
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-[#4a4a60]">
        {label}
      </p>
      <p className={cn('mt-2 text-2xl font-bold tracking-tight', accent ?? 'text-white')}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-[#5a5a75]">{sub}</p>}
    </div>
  )
}
