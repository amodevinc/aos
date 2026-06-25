import { getBrowserStorage } from '@/lib/storage'
import type { AppliedAction, CaptureSession, ObservabilityMetadata } from './types'

export const captureSessionStorage = {
  save: (input: {
    transcript: string
    actions: AppliedAction[]
    status: 'applied' | 'undone' | 'failed'
    summary: string
    metadata?: ObservabilityMetadata
  }) => getBrowserStorage().then((s) => s.captureSessionStorage.save(input)),

  getById: (id: string) =>
    getBrowserStorage().then((s) => s.captureSessionStorage.getById(id)),

  getRecent: (limit = 10) =>
    getBrowserStorage().then((s) => s.captureSessionStorage.getRecent(limit)),

  markUndone: (id: string) =>
    getBrowserStorage().then((s) => s.captureSessionStorage.markUndone(id)),
}

export type { CaptureSession }
