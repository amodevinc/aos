import Link from 'next/link'
import type { Contact } from '@/types'
import {
  computeRelationshipHealth,
  daysUntilDue,
  healthColor,
  TIER_META,
} from '@/lib/scoring/crm'
import { cn } from '@/lib/utils'

interface TouchQueueProps {
  contacts: Contact[]
}

export function TouchQueue({ contacts }: TouchQueueProps) {
  if (contacts.length === 0) {
    return (
      <div className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#4a4a60]">
          Touch Queue
        </h2>
        <p className="text-sm text-[#3a3a50]">
          All caught up. No contacts are due for outreach.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-amber-400/15 bg-amber-400/5 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-400/70">
          Touch Queue — {contacts.length} due
        </h2>
      </div>

      <div className="space-y-2">
        {contacts.map((c) => {
          const due = daysUntilDue(c)
          const health = computeRelationshipHealth(c)
          const overdue = due < 0

          return (
            <Link
              key={c.id}
              href={`/crm/${c.id}`}
              className="flex items-center gap-3 rounded-lg border border-[#1e1e2a] bg-[#111116] px-4 py-2.5 transition-all hover:border-[#2a2a38]"
            >
              {/* Tier badge */}
              <span className={cn('shrink-0 text-[10px] font-bold', TIER_META[c.tier].color)}>
                T{c.tier}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#e8e8f0]">{c.name}</p>
                <p className="truncate text-xs text-[#5a5a75]">
                  {c.role}{c.company ? ` · ${c.company}` : ''}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <span className={cn('text-xs font-semibold', healthColor(health))}>
                  {health}
                </span>
                <p className={cn('text-[10px]', overdue ? 'text-red-400' : 'text-[#5a5a75]')}>
                  {!c.lastContactDate
                    ? 'Never contacted'
                    : overdue
                    ? `${Math.abs(due)}d overdue`
                    : `Due in ${due}d`}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
