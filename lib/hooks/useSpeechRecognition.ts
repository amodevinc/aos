'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type SpeechState = 'idle' | 'listening' | 'processing' | 'error'

export interface UseSpeechRecognitionReturn {
  transcript: string
  interimTranscript: string
  state: SpeechState
  isSupported: boolean
  errorMessage: string
  start: () => void
  stop: () => void
  reset: () => void
}

// Web Speech API types not in standard lib — minimal declarations
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}
interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}
interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}
interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
}

function getSpeechRecognitionClass(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [state, setState] = useState<SpeechState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const finalTranscriptRef = useRef('')

  const isSupported = typeof window !== 'undefined' && getSpeechRecognitionClass() !== null

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  const start = useCallback(() => {
    const SpeechRecognitionClass = getSpeechRecognitionClass()
    if (!SpeechRecognitionClass) {
      setState('error')
      setErrorMessage('Speech recognition is not supported in this browser. Use Chrome or Edge, or type your capture below.')
      return
    }

    setErrorMessage('')
    finalTranscriptRef.current = transcript // preserve existing typed/spoken text

    const recognition = new SpeechRecognitionClass()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setState('listening')
      setInterimTranscript('')
    }

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interim = ''
      let final = finalTranscriptRef.current

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]
        const text = result[0].transcript
        if (result.isFinal) {
          final += (final ? ' ' : '') + text.trim()
        } else {
          interim += text
        }
      }

      finalTranscriptRef.current = final
      setTranscript(final)
      setInterimTranscript(interim)
    }

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === 'no-speech') return // not an error — just silence
      if (e.error === 'aborted') return    // triggered by stop()
      setState('error')
      setErrorMessage(
        e.error === 'not-allowed'
          ? 'Microphone access denied. Allow mic access in your browser settings.'
          : `Speech error: ${e.error}`
      )
    }

    recognition.onend = () => {
      setInterimTranscript('')
      setState((prev) => (prev === 'listening' ? 'idle' : prev))
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [transcript])

  const reset = useCallback(() => {
    recognitionRef.current?.abort()
    recognitionRef.current = null
    finalTranscriptRef.current = ''
    setTranscript('')
    setInterimTranscript('')
    setState('idle')
    setErrorMessage('')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
    }
  }, [])

  return { transcript, interimTranscript, state, isSupported, errorMessage, start, stop, reset }
}
