import { SUGGESTED_PROMPTS } from '@/lib/ai/prompts'
import { cn } from '@/lib/utils'

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void
  disabled?: boolean
}

// Show a random subset of suggested prompts on first load
export function SuggestedPrompts({ onSelect, disabled }: SuggestedPromptsProps) {
  const prompts = [...SUGGESTED_PROMPTS]
    .sort(() => Math.random() - 0.5)
    .slice(0, 4)

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#3a3a50]">
        Suggested
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {prompts.map((p) => (
          <button
            key={p}
            onClick={() => onSelect(p)}
            disabled={disabled}
            className={cn(
              'rounded-lg border border-[#1e1e2a] bg-[#111116] px-3 py-2.5 text-left text-xs text-[#8080a0] transition-all hover:border-indigo-500/30 hover:bg-indigo-500/8 hover:text-[#c0c0d8]',
              disabled && 'pointer-events-none opacity-40'
            )}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}
