'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, RotateCcw, Brain } from 'lucide-react'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'

import { PageHeader } from '@/components/layout/PageHeader'
import { ChatMessage } from '@/components/coach/ChatMessage'
import { SuggestedPrompts } from '@/components/coach/SuggestedPrompts'

import { streamAI } from '@/lib/ai/client'
import { buildAOSContext } from '@/lib/ai/context'
import { COACH_SYSTEM_PROMPT } from '@/lib/ai/prompts'
import { apiKeyStorage, conversationStorage } from '@/lib/ai/storage'
import {
  dailyStorage,
  goalStorage,
  decisionStorage,
  weeklyStorage,
  compassStorage,
  contactStorage,
} from '@/lib/storage'
import { cn, generateId } from '@/lib/utils'

interface UIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

export default function CoachPage() {
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [hasKey, setHasKey] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Load key + restore conversation
  useEffect(() => {
    const key = apiKeyStorage.get()
    if (key) {
      setApiKey(key)
      setHasKey(true)
    }
    const conv = conversationStorage.get()
    if (conv?.messages) {
      const uiMessages: UIMessage[] = conv.messages.map((m) => ({
        id: generateId(),
        role: m.role as 'user' | 'assistant',
        content: Array.isArray(m.content)
          ? m.content.map((b: { type: string; text?: string }) => b.type === 'text' ? b.text ?? '' : '').join('')
          : (m.content as string),
      }))
      setMessages(uiMessages)
    }
  }, [])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  const saveKey = () => {
    if (!keyInput.startsWith('sk-ant-')) {
      setError('Key must start with sk-ant-')
      return
    }
    apiKeyStorage.set(keyInput)
    setApiKey(keyInput)
    setHasKey(true)
    setKeyInput('')
    setError('')
  }

  const buildSystemPrompt = async (): Promise<string> => {
    const [allEntries, goals, decisions, weeklyReviews, contacts, compass] = await Promise.all([
      dailyStorage.getAll(),
      goalStorage.getAll(),
      decisionStorage.getAll(),
      weeklyStorage.getAll(),
      contactStorage.getAll(),
      compassStorage.get(),
    ])
    const context = buildAOSContext({ allEntries, goals, decisions, weeklyReviews, contacts, compass })
    return COACH_SYSTEM_PROMPT(context)
  }

  const send = async (text: string) => {
    if (!text.trim() || streaming) return
    setInput('')
    setError('')

    const userMsg: UIMessage = { id: generateId(), role: 'user', content: text }
    const assistantId = generateId()
    const assistantMsg: UIMessage = { id: assistantId, role: 'assistant', content: '', streaming: true }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setStreaming(true)

    // Build message history for the API
    const history: MessageParam[] = [
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: text },
    ]

    let fullResponse = ''

    abortRef.current = await streamAI({
      apiKey,
      messages: history,
      system: await buildSystemPrompt(),
      onChunk: (chunk) => {
        fullResponse += chunk
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: fullResponse } : m
          )
        )
      },
      onDone: (full) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: full, streaming: false } : m
          )
        )
        setStreaming(false)

        // Persist conversation
        const allMessages: MessageParam[] = [
          ...history,
          { role: 'assistant', content: full },
        ]
        conversationStorage.save({
          id: generateId(),
          messages: allMessages,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      },
      onError: (err) => {
        setError(err)
        setStreaming(false)
        setMessages((prev) => prev.filter((m) => m.id !== assistantId))
      },
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const clearConversation = () => {
    conversationStorage.clear()
    setMessages([])
    abortRef.current?.abort()
    setStreaming(false)
  }

  // ─── No API key — show setup screen ───────────────────────────────────────
  if (!hasKey) {
    return (
      <div>
        <PageHeader title="AI Coach" subtitle="Context-aware coaching powered by Claude" />
        <div className="mx-auto max-w-md">
          <div className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/15">
                <Brain className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <p className="font-medium text-white">Connect Claude</p>
                <p className="text-xs text-[#5a5a75]">Enter your Anthropic API key to enable AI coaching</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#6b6b88]">
                  Anthropic API Key
                </label>
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveKey()}
                  placeholder="sk-ant-api03-..."
                  className="w-full rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-2 text-sm font-mono text-[#e8e8f0] placeholder-[#3a3a55] outline-none focus:border-indigo-500/50"
                />
                {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
              </div>
              <button
                onClick={saveKey}
                className="w-full rounded-lg bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors"
              >
                Connect
              </button>
              <p className="text-center text-[10px] text-[#3a3a50]">
                Key stored in your browser only. Never sent to any server except Anthropic.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Chat interface ────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">AI Coach</h1>
          <p className="mt-0.5 text-sm text-[#6b6b88]">
            Your coach has full context of your AOS data.
          </p>
        </div>
        <button
          onClick={clearConversation}
          className="flex items-center gap-1.5 rounded-lg border border-[#1e1e2a] px-3 py-1.5 text-xs text-[#5a5a75] hover:text-[#a0a0c0] transition-colors"
        >
          <RotateCcw className="h-3 w-3" /> New conversation
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-[#1e1e2a] bg-[#0a0a0c] p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/15">
                <Brain className="h-6 w-6 text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-[#8080a0]">
                Your AI coach is ready
              </p>
              <p className="mt-1 text-xs text-[#4a4a60]">
                It knows your goals, scores, decisions, and mission.
              </p>
            </div>
            <SuggestedPrompts onSelect={(p) => send(p)} />
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m) => (
              <ChatMessage
                key={m.id}
                role={m.role}
                content={m.content}
                streaming={m.streaming}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}

      {/* Input bar */}
      <div className="mt-3 flex gap-2">
        <div className="flex flex-1 items-end gap-2 rounded-xl border border-[#1e1e2a] bg-[#111116] px-4 py-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your coach anything… (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-[#e8e8f0] placeholder-[#3a3a55] outline-none"
            style={{ maxHeight: 140 }}
            disabled={streaming}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || streaming}
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all',
              input.trim() && !streaming
                ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                : 'bg-[#1a1a22] text-[#3a3a50]'
            )}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Suggested prompts below input when empty */}
      {messages.length === 0 && (
        <p className="mt-2 text-center text-[10px] text-[#2a2a3a]">
          Shift+Enter for new line · Enter to send
        </p>
      )}
    </div>
  )
}
