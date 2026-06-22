import { cn } from '@/lib/utils'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

export function ChatMessage({ role, content, streaming }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div
        className={cn(
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
          isUser
            ? 'bg-indigo-500/20 text-indigo-400'
            : 'bg-[#1e1e2a] text-[#8080a0]'
        )}
      >
        {isUser ? 'A' : 'AI'}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          'max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-indigo-500/15 text-[#e8e8f0] ring-1 ring-indigo-500/20'
            : 'bg-[#111116] text-[#c0c0d8] ring-1 ring-[#1e1e2a]'
        )}
      >
        {/* Render with preserved line breaks */}
        {content.split('\n').map((line, i) => (
          <p key={i} className={line === '' ? 'h-3' : ''}>
            {line}
          </p>
        ))}
        {streaming && (
          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-indigo-400" />
        )}
      </div>
    </div>
  )
}
