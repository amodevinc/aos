'use client'

import type { Pillar, PillarScores } from '@/types'
import { PILLARS, PILLAR_META } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface PillarScoreRowProps {
  scores: PillarScores
}

export function PillarScoreRow({ scores }: PillarScoreRowProps) {
  return (
    <div className="space-y-3">
      {PILLARS.map((pillar) => {
        const meta = PILLAR_META[pillar]
        const score = scores[pillar]
        return (
          <div key={pillar} className="flex items-center gap-3">
            <div className={cn('w-20 shrink-0 text-xs font-medium', meta.color)}>
              {meta.label}
            </div>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1e1e2a]">
              <div
                className={cn('h-full rounded-full transition-all duration-500', meta.bg.replace('/10', '/60'))}
                style={{ width: `${score}%` }}
              />
            </div>
            <span className="w-9 shrink-0 text-right text-xs font-semibold text-[#8080a0]">
              {score}
            </span>
          </div>
        )
      })}
    </div>
  )
}
