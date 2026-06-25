'use client'

import { cn } from '@/lib/utils'
import type { PromptChip } from '@/lib/capture/daily-prompts'

interface CapturePromptChipsProps {
  prompts: PromptChip[]
  onSelect: (starter: string) => void
  disabled?: boolean
  className?: string
}

export function CapturePromptChips({ prompts, onSelect, disabled, className }: CapturePromptChipsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {prompts.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(p.starter)}
          className={cn(
            'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            disabled
              ? 'cursor-not-allowed border-[#1a1a22] text-[#3a3a50]'
              : 'border-[#1e1e2a] bg-[#0d0d12] text-[#8080a0] hover:border-indigo-500/40 hover:text-indigo-300'
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
