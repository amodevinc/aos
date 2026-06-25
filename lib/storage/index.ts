import { createClient } from '@/lib/supabase/client'
import { createStorage, type StorageBundle } from './factory'

export type { StorageBundle } from './factory'

let cachedStorage: StorageBundle | null = null

/** Browser-side storage bundle (cached per page session). */
export async function getBrowserStorage(): Promise<StorageBundle> {
  if (!cachedStorage) {
    const client = createClient()
    const { data: { user }, error } = await client.auth.getUser()
    if (error || !user) throw new Error('Not authenticated. Refresh the page.')
    cachedStorage = createStorage(client, user.id)
  }
  return cachedStorage
}

function delegate<T>(fn: (s: StorageBundle) => Promise<T>): () => Promise<T> {
  return () => getBrowserStorage().then(fn)
}

// ─── Daily Entries ────────────────────────────────────────────────────────────

export const dailyStorage = {
  getAll: delegate((s) => s.dailyStorage.getAll()),
  getByDate: (date: string) => getBrowserStorage().then((s) => s.dailyStorage.getByDate(date)),
  save: (entry: Parameters<StorageBundle['dailyStorage']['save']>[0]) =>
    getBrowserStorage().then((s) => s.dailyStorage.save(entry)),
  delete: (id: string) => getBrowserStorage().then((s) => s.dailyStorage.delete(id)),
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export const goalStorage = {
  getAll: delegate((s) => s.goalStorage.getAll()),
  getById: (id: string) => getBrowserStorage().then((s) => s.goalStorage.getById(id)),
  save: (goal: Parameters<StorageBundle['goalStorage']['save']>[0]) =>
    getBrowserStorage().then((s) => s.goalStorage.save(goal)),
  delete: (id: string) => getBrowserStorage().then((s) => s.goalStorage.delete(id)),
}

// ─── Projects ────────────────────────────────────────────────────────────────

export const projectStorage = {
  getAll: delegate((s) => s.projectStorage.getAll()),
  save: (project: Parameters<StorageBundle['projectStorage']['save']>[0]) =>
    getBrowserStorage().then((s) => s.projectStorage.save(project)),
  delete: (id: string) => getBrowserStorage().then((s) => s.projectStorage.delete(id)),
}

// ─── Decisions ───────────────────────────────────────────────────────────────

export const decisionStorage = {
  getAll: delegate((s) => s.decisionStorage.getAll()),
  getById: (id: string) => getBrowserStorage().then((s) => s.decisionStorage.getById(id)),
  save: (decision: Parameters<StorageBundle['decisionStorage']['save']>[0]) =>
    getBrowserStorage().then((s) => s.decisionStorage.save(decision)),
  delete: (id: string) => getBrowserStorage().then((s) => s.decisionStorage.delete(id)),
}

// ─── Weekly Reviews ──────────────────────────────────────────────────────────

export const weeklyStorage = {
  getAll: delegate((s) => s.weeklyStorage.getAll()),
  getByWeekStart: (weekStart: string) =>
    getBrowserStorage().then((s) => s.weeklyStorage.getByWeekStart(weekStart)),
  save: (review: Parameters<StorageBundle['weeklyStorage']['save']>[0]) =>
    getBrowserStorage().then((s) => s.weeklyStorage.save(review)),
  delete: (id: string) => getBrowserStorage().then((s) => s.weeklyStorage.delete(id)),
}

// ─── Life Compass ────────────────────────────────────────────────────────────

export const compassStorage = {
  get: delegate((s) => s.compassStorage.get()),
  save: (compass: Parameters<StorageBundle['compassStorage']['save']>[0]) =>
    getBrowserStorage().then((s) => s.compassStorage.save(compass)),
}

// ─── Settings ────────────────────────────────────────────────────────────────

export const settingsStorage = {
  get: delegate((s) => s.settingsStorage.get()),
  save: (settings: Parameters<StorageBundle['settingsStorage']['save']>[0]) =>
    getBrowserStorage().then((s) => s.settingsStorage.save(settings)),
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export const contactStorage = {
  getAll: delegate((s) => s.contactStorage.getAll()),
  getById: (id: string) => getBrowserStorage().then((s) => s.contactStorage.getById(id)),
  save: (contact: Parameters<StorageBundle['contactStorage']['save']>[0]) =>
    getBrowserStorage().then((s) => s.contactStorage.save(contact)),
  delete: (id: string) => getBrowserStorage().then((s) => s.contactStorage.delete(id)),
}

// ─── Interactions ──────────────────────────────────────────────────────────────

export const interactionStorage = {
  getAll: delegate((s) => s.interactionStorage.getAll()),
  getByContact: (contactId: string) =>
    getBrowserStorage().then((s) => s.interactionStorage.getByContact(contactId)),
  save: (interaction: Parameters<StorageBundle['interactionStorage']['save']>[0]) =>
    getBrowserStorage().then((s) => s.interactionStorage.save(interaction)),
  delete: (id: string) => getBrowserStorage().then((s) => s.interactionStorage.delete(id)),
}

// ─── Export / Import ──────────────────────────────────────────────────────────

export const exportAll = delegate((s) => s.exportAll())
export const importAll = (data: Parameters<StorageBundle['importAll']>[0]) =>
  getBrowserStorage().then((s) => s.importAll(data))
export const resetAll = delegate((s) => s.resetAll())
