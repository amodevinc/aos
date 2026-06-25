'use client'

import Link from 'next/link'
import { Sun, Moon, Mic, CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DailyRitualStripProps {
  hasMorning: boolean
  hasEvening: boolean
  captureCountToday: number
  className?: string
}

function RitualItem({
  done,
  icon: Icon,
  label,
  href,
}: {
  done: boolean
  icon: typeof Sun
  label: string
  href?: string
}) {
  const content = (
    <>
      <Icon className={cn('h-3.5 w-3.5', done ? 'text-emerald-400' : 'text-[#4a4a60]')} />
      {done ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <Circle className="h-3.5 w-3.5 text-[#3a3a50]" />
      )}
      <span className={cn('text-xs', done ? 'text-[#8080a0]' : 'text-[#6b6b88]')}>{label}</span>
    </>
  )

  if (href && !done) {
    return (
      <Link
        href={href}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-[#1a1a22]"
      >
        {content}
      </Link>
    )
  }

  return <div className="flex items-center gap-1.5 px-2 py-1">{content}</div>
}

export function DailyRitualStrip({
  hasMorning,
  hasEvening,
  captureCountToday,
  className,
}: DailyRitualStripProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1 border-t border-[#1e1e2a] pt-3',
        className
      )}
    >
      <RitualItem done={hasMorning} icon={Sun} label="Morning plan" href="/daily" />
      <span className="text-[#2a2a38]">·</span>
      <RitualItem
        done={captureCountToday > 0}
        icon={Mic}
        label={captureCountToday > 0 ? `${captureCountToday} capture${captureCountToday !== 1 ? 's' : ''}` : 'Capture'}
        href="/capture"
      />
      <span className="text-[#2a2a38]">·</span>
      <RitualItem done={hasEvening} icon={Moon} label="Evening review" href="/daily" />
    </div>
  )
}
