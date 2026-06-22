import Link from 'next/link'
import type { Contact } from '@/types'
import {
  computeRelationshipHealth,
  daysUntilDue,
  healthColor,
  healthBg,
  TIER_META,
  RELATIONSHIP_LABELS,
} from '@/lib/scoring/crm'
import { PILLAR_META } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ContactCardProps {
  contact: Contact
  onDelete: (id: string) => void
}

export function ContactCard({ contact: c, onDelete }: ContactCardProps) {
  const health = computeRelationshipHealth(c)
  const due = daysUntilDue(c)
  const isProspect = c.status === 'prospect'

  return (
    <div className="rounded-xl border border-[#1e1e2a] bg-[#111116] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Avatar */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-sm font-bold text-indigo-400 ring-1 ring-indigo-500/20">
          {c.name.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/crm/${c.id}`}
              className="truncate text-sm font-medium text-[#e8e8f0] hover:text-white transition-colors"
            >
              {c.name}
            </Link>
            <span className={cn('shrink-0 text-[10px] font-bold', TIER_META[c.tier].color)}>
              T{c.tier}
            </span>
          </div>
          <p className="truncate text-xs text-[#5a5a75]">
            {[c.role, c.company].filter(Boolean).join(' · ')}
            {c.role || c.company ? ' · ' : ''}
            {RELATIONSHIP_LABELS[c.relationship]}
          </p>
          {/* Pillar tags */}
          {c.pillarRelevance.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {c.pillarRelevance.map((p) => (
                <span key={p} className={cn('text-[9px] font-semibold', PILLAR_META[p].color)}>
                  {PILLAR_META[p].label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Health / status */}
        <div className="shrink-0 text-right">
          {isProspect ? (
            <span className="rounded-full bg-[#1a1a22] px-2 py-0.5 text-[10px] font-medium text-[#6b6b88]">
              Prospect
            </span>
          ) : (
            <>
              <span className={cn('text-sm font-bold', healthColor(health))}>{health}</span>
              <p className={cn('text-[10px]', due < 0 ? 'text-red-400' : due <= 7 ? 'text-amber-400' : 'text-[#4a4a60]')}>
                {!c.lastContactDate
                  ? 'Never'
                  : due < 0
                  ? `${Math.abs(due)}d overdue`
                  : `${due}d`}
              </p>
            </>
          )}
        </div>

        <button
          onClick={() => {
            if (!confirm(`Remove ${c.name}?`)) return
            onDelete(c.id)
          }}
          className="ml-1 shrink-0 rounded-md p-1 text-[#3a3a50] hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
