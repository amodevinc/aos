'use client'

import { scoreToTier } from '@/lib/scoring/daily'
import { cn } from '@/lib/utils'

// Circular score display — the centrepiece of the dashboard.
// strokeDasharray + strokeDashoffset drive the ring fill percentage.

interface AlignmentRingProps {
  score: number
  size?: number
  label?: string
}

export function AlignmentRing({ score, size = 120, label = 'Today' }: AlignmentRingProps) {
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const filled = (score / 100) * circumference
  const tier = scoreToTier(score)

  const strokeColor =
    score >= 80
      ? '#34d399'
      : score >= 60
      ? '#60a5fa'
      : score >= 40
      ? '#fbbf24'
      : score >= 20
      ? '#fb923c'
      : '#f87171'

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1e1e2a"
            strokeWidth={8}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - filled}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{score}</span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-[#5a5a78]">
            {label}
          </span>
        </div>
      </div>
      <span className={cn('text-xs font-semibold', tier.color)}>{tier.label}</span>
    </div>
  )
}
