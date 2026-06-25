import type { Contact, DailyEntry, EveningReview, Goal, MorningPlan } from '@/types'
import type { StorageBundle } from '@/lib/storage/factory'
import { getBrowserStorage } from '@/lib/storage'
import { computeDailyAlignmentScore } from '@/lib/scoring/daily'
import { computeDecisionScore, scoreToRecommendation, generateDecisionNarrative } from '@/lib/scoring/decision'
import { getWeekRange, generateId, todayISO } from '@/lib/utils'
import type {
  AppliedAction,
  CaptureAction,
  ExecutionResult,
  ObservabilityMetadata,
  UndoOperation,
} from './types'
import { sortActionsForExecution } from './action-pipeline'

// ─── Fuzzy name matching ──────────────────────────────────────────────────────

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

export function findContactByName(contacts: Contact[], name: string): Contact | undefined {
  const needle = normalizeName(name)
  const exact = contacts.find((c) => normalizeName(c.name) === needle)
  if (exact) return exact
  const words = needle.split(' ').filter(Boolean)
  return contacts.find((c) => {
    const hay = normalizeName(c.name)
    return words.every((w) => hay.includes(w))
  })
}

function findGoalByTitle(goals: Goal[], title: string): Goal | undefined {
  const needle = normalizeName(title)
  const exact = goals.find((g) => normalizeName(g.title) === needle)
  if (exact) return exact
  const words = needle.split(' ').filter(Boolean)
  return goals.find((g) => {
    const hay = normalizeName(g.title)
    return words.every((w) => hay.includes(w))
  })
}

function defaultEvening(): EveningReview {
  return {
    didTrain: false, didEatWell: false, didRecover: false,
    didLearn: false, didMoveProject: false, didStrengthenRelationship: false,
    didCreateValue: false, didAvoidDistractions: false, didActInAlignment: false,
    biggestWin: '', biggestMistake: '', lessonLearned: '', adjustmentTomorrow: '',
  }
}

function defaultMorning(): MorningPlan {
  return {
    top3Priorities: ['', '', ''],
    healthAction: '', capabilityAction: '', networkAction: '', wealthAction: '',
    biggestRisk: '', identityStatement: '',
  }
}

// ─── Action handlers ─────────────────────────────────────────────────────────

async function applyUpsertDaily(
  storage: StorageBundle,
  action: Extract<CaptureAction, { kind: 'upsert_daily' }>
): Promise<UndoOperation> {
  const { date, morning, evening } = action.payload
  const existing = await storage.dailyStorage.getByDate(date)
  const previousEntry = existing ? { ...existing } : undefined

  const entry: DailyEntry = existing ?? {
    id: generateId(), date, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }

  if (morning) {
    entry.morning = { ...defaultMorning(), ...(entry.morning ?? {}), ...morning } as MorningPlan
  }
  if (evening) {
    entry.evening = { ...defaultEvening(), ...(entry.evening ?? {}), ...evening } as EveningReview
  }
  if (entry.evening) {
    entry.alignmentScore = computeDailyAlignmentScore(entry.evening)
  }
  entry.updatedAt = new Date().toISOString()

  await storage.dailyStorage.save(entry)
  return { type: 'restore_daily', previousEntry, date }
}

async function applyLogInteraction(
  storage: StorageBundle,
  action: Extract<CaptureAction, { kind: 'log_interaction' }>,
  contacts: Contact[]
): Promise<UndoOperation> {
  const { contactName, date, type, summary, keyInsight, nextStep, sentiment } = action.payload
  let contactId = action.payload.contactId

  if (!contactId) {
    const matched = findContactByName(contacts, contactName)
    if (!matched) throw new Error(`Contact "${contactName}" not found. Create the contact first.`)
    contactId = matched.id
  }

  const interactionId = generateId()
  await storage.interactionStorage.save({
    id: interactionId,
    contactId,
    date: date ?? todayISO(),
    type: type ?? 'meeting',
    summary: summary ?? '',
    keyInsight: keyInsight ?? '',
    nextStep: nextStep ?? '',
    sentiment: sentiment ?? 'good',
    createdAt: new Date().toISOString(),
  })

  const contact = contacts.find((c) => c.id === contactId)
  const previousLastContact = contact?.lastContactDate ?? ''
  if (contact) {
    const entryDate = date ?? todayISO()
    if (!contact.lastContactDate || entryDate > contact.lastContactDate) {
      await storage.contactStorage.save({ ...contact, lastContactDate: entryDate, updatedAt: new Date().toISOString() })
    }
  }

  return {
    type: 'restore_contact_fields',
    contactId: contactId!,
    previousFields: { lastContactDate: previousLastContact },
  }
}

async function applyCreateContact(
  storage: StorageBundle,
  action: Extract<CaptureAction, { kind: 'create_contact' }>
): Promise<UndoOperation> {
  const id = generateId()
  const now = new Date().toISOString()
  const { name, role, company, relationship, tier, notes, bio, location } = action.payload
  await storage.contactStorage.save({
    id, name, role: role ?? '', company: company ?? '',
    relationship: relationship ?? 'other', tier: tier ?? 2,
    pillarRelevance: [], email: '', linkedin: '', phone: '',
    met: todayISO(), metVia: '', location: location ?? '',
    bio: bio ?? '', notes: notes ?? '', tags: [],
    whatICanOffer: '', whatTheyCanOffer: '',
    lastContactDate: '', nextContactDate: '',
    touchFrequencyDays: 30, status: 'active',
    createdAt: now, updatedAt: now,
  })
  return { type: 'delete_row', table: 'contacts', id }
}

async function applyUpdateContact(
  storage: StorageBundle,
  action: Extract<CaptureAction, { kind: 'update_contact' }>,
  contacts: Contact[]
): Promise<UndoOperation> {
  let contactId = action.payload.contactId
  if (!contactId) {
    const matched = findContactByName(contacts, action.payload.contactName)
    if (!matched) throw new Error(`Contact "${action.payload.contactName}" not found.`)
    contactId = matched.id
  }
  const contact = contacts.find((c) => c.id === contactId)
  if (!contact) throw new Error(`Contact not found by id: ${contactId}`)

  const previousFields: Partial<Contact> = {}
  for (const key of Object.keys(action.payload.fields) as Array<keyof typeof action.payload.fields>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    previousFields[key] = contact[key] as any
  }

  await storage.contactStorage.save({ ...contact, ...action.payload.fields, updatedAt: new Date().toISOString() })
  return { type: 'restore_contact_fields', contactId: contactId!, previousFields }
}

async function applyCreateGoal(
  storage: StorageBundle,
  action: Extract<CaptureAction, { kind: 'create_goal' }>
): Promise<UndoOperation> {
  const id = generateId()
  const now = new Date().toISOString()
  const { title, description, pillar, deadline, progress, whyItMatters, nextAction } = action.payload
  await storage.goalStorage.save({
    id, title, description: description ?? '', pillar,
    deadline: deadline ?? '', status: 'active',
    progress: progress ?? 0,
    whyItMatters: whyItMatters ?? '', nextAction: nextAction ?? '',
    createdAt: now, updatedAt: now,
  })
  return { type: 'delete_row', table: 'goals', id }
}

async function applyUpdateGoal(
  storage: StorageBundle,
  action: Extract<CaptureAction, { kind: 'update_goal' }>,
  goals: Goal[]
): Promise<UndoOperation> {
  let goalId = action.payload.goalId
  if (!goalId && action.payload.goalTitle) {
    const matched = findGoalByTitle(goals, action.payload.goalTitle)
    if (!matched) throw new Error(`Goal "${action.payload.goalTitle}" not found.`)
    goalId = matched.id
  }
  if (!goalId) throw new Error('Goal ID or title required for update_goal.')

  const goal = goals.find((g) => g.id === goalId)
  if (!goal) throw new Error(`Goal not found: ${goalId}`)

  const previousFields: Partial<Goal> = {}
  for (const key of Object.keys(action.payload.fields) as Array<keyof typeof action.payload.fields>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    previousFields[key] = goal[key] as any
  }

  await storage.goalStorage.save({ ...goal, ...action.payload.fields, updatedAt: new Date().toISOString() })
  return { type: 'restore_goal_fields', goalId: goalId!, previousFields }
}

async function applyCreateDecision(
  storage: StorageBundle,
  action: Extract<CaptureAction, { kind: 'create_decision' }>
): Promise<UndoOperation> {
  const id = generateId()
  const now = new Date().toISOString()
  const { title, description, scores } = action.payload
  const compositeScore = computeDecisionScore(scores)
  const recommendation = scoreToRecommendation(compositeScore)
  const { opportunityCost, mainUpside, mainDownside, suggestedAction } =
    generateDecisionNarrative(scores, compositeScore, recommendation)

  await storage.decisionStorage.save({
    id, title, description: description ?? '',
    scores, compositeScore, recommendation,
    opportunityCost, mainUpside, mainDownside, suggestedAction,
    createdAt: now, updatedAt: now,
  })
  return { type: 'delete_row', table: 'decisions', id }
}

async function applyUpdateWeekly(
  storage: StorageBundle,
  action: Extract<CaptureAction, { kind: 'update_weekly' }>
): Promise<UndoOperation> {
  const { start: defaultStart, end: defaultEnd } = getWeekRange()
  const weekStart = action.payload.weekStart ?? defaultStart

  const existing = await storage.weeklyStorage.getByWeekStart(weekStart)
  const now = new Date().toISOString()

  const previousFields: Partial<typeof existing> = {}
  if (existing) {
    for (const key of Object.keys(action.payload.fields) as Array<keyof typeof action.payload.fields>) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      previousFields[key] = existing[key] as any
    }
  }

  const base = existing ?? {
    id: generateId(), weekStart, weekEnd: defaultEnd,
    whatImproved: '', whatRegressed: '', whatCreatedLeverage: '',
    whatWastedTime: '', whoConnectedWith: '', whatBuilt: '',
    whatLearned: '', whatDoubleDown: '', whatEliminate: '',
    mainFocusNextWeek: '', weeklyScore: 0,
    pillarScores: { health: 0, capability: 0, network: 0, wealth: 0, mission: 0 },
    avgDailyAlignment: 0, createdAt: now, updatedAt: now,
  }

  await storage.weeklyStorage.save({ ...base, ...action.payload.fields, updatedAt: now })
  return { type: 'restore_weekly_fields', weekStart, previousFields }
}

async function applyUpdateCompass(
  storage: StorageBundle,
  action: Extract<CaptureAction, { kind: 'update_compass' }>
): Promise<UndoOperation> {
  const current = await storage.compassStorage.get()
  const previousCompass = { ...current }

  const updated = { ...current }
  if (action.payload.fields) Object.assign(updated, action.payload.fields)
  if (action.payload.addCoreValues?.length)
    updated.coreValues = [...new Set([...updated.coreValues, ...action.payload.addCoreValues])]
  if (action.payload.addPersonalRules?.length)
    updated.personalRules = [...updated.personalRules, ...action.payload.addPersonalRules]
  if (action.payload.addAntiRules?.length)
    updated.antiRules = [...updated.antiRules, ...action.payload.addAntiRules]
  if (action.payload.addNonNegotiables?.length)
    updated.nonNegotiables = [...updated.nonNegotiables, ...action.payload.addNonNegotiables]
  updated.updatedAt = new Date().toISOString()

  await storage.compassStorage.save(updated)
  return { type: 'restore_compass', previousCompass }
}

// ─── Main executor ────────────────────────────────────────────────────────────

export async function executeActions(
  actions: CaptureAction[],
  transcript: string,
  summary: string,
  metadata?: ObservabilityMetadata,
  storageBundle?: StorageBundle
): Promise<ExecutionResult> {
  const storage = storageBundle ?? await getBrowserStorage()

  const [contacts, goals] = await Promise.all([
    storage.contactStorage.getAll(),
    storage.goalStorage.getAll(),
  ])

  const sortedActions = sortActionsForExecution(actions)

  const applied: AppliedAction[] = []
  const failed: { action: CaptureAction; error: string }[] = []

  for (const action of sortedActions) {
    try {
      let undoOp: UndoOperation

      switch (action.kind) {
        case 'upsert_daily':
          undoOp = await applyUpsertDaily(storage, action)
          break
        case 'log_interaction':
          undoOp = await applyLogInteraction(storage, action, contacts)
          break
        case 'create_contact':
          undoOp = await applyCreateContact(storage, action)
          contacts.push({
            id: (undoOp as { id: string }).id,
            name: action.payload.name,
            role: action.payload.role ?? '',
            company: action.payload.company ?? '',
            relationship: action.payload.relationship ?? 'other',
            tier: action.payload.tier ?? 2,
            pillarRelevance: [], email: '', linkedin: '', phone: '',
            met: todayISO(), metVia: '', location: action.payload.location ?? '',
            bio: action.payload.bio ?? '', notes: action.payload.notes ?? '',
            tags: [], whatICanOffer: '', whatTheyCanOffer: '',
            lastContactDate: '', nextContactDate: '',
            touchFrequencyDays: 30, status: 'active',
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          })
          break
        case 'update_contact':
          undoOp = await applyUpdateContact(storage, action, contacts)
          break
        case 'create_goal':
          undoOp = await applyCreateGoal(storage, action)
          break
        case 'update_goal':
          undoOp = await applyUpdateGoal(storage, action, goals)
          break
        case 'create_decision':
          undoOp = await applyCreateDecision(storage, action)
          break
        case 'update_weekly':
          undoOp = await applyUpdateWeekly(storage, action)
          break
        case 'update_compass':
          undoOp = await applyUpdateCompass(storage, action)
          break
        default:
          throw new Error(`Unhandled action kind: ${(action as CaptureAction).kind}`)
      }

      applied.push({ action, undoOp })
    } catch (err) {
      failed.push({ action, error: err instanceof Error ? err.message : 'Unknown error' })
    }
  }

  const sessionId = await storage.captureSessionStorage.save({
    transcript, summary,
    actions: applied,
    status: failed.length === applied.length && applied.length === 0 ? 'failed' : 'applied',
    metadata,
  })

  return { applied, failed, sessionId }
}

// ─── Undo a session ───────────────────────────────────────────────────────────

export async function undoSession(
  sessionId: string,
  storageBundle?: StorageBundle
): Promise<void> {
  const storage = storageBundle ?? await getBrowserStorage()
  const session = await storage.captureSessionStorage.getById(sessionId)
  if (!session || session.status === 'undone') return

  for (const { undoOp } of [...session.actions].reverse()) {
    try {
      await applyUndoOp(storage, undoOp)
    } catch {
      // Best-effort undo
    }
  }

  await storage.captureSessionStorage.markUndone(sessionId)
}

async function applyUndoOp(storage: StorageBundle, op: UndoOperation): Promise<void> {
  switch (op.type) {
    case 'delete_row': {
      await storage.client.from(op.table).delete().eq('id', op.id)
      break
    }
    case 'restore_daily': {
      if (op.previousEntry) {
        await storage.dailyStorage.save(op.previousEntry)
      } else {
        const entry = await storage.dailyStorage.getByDate(op.date)
        if (entry) await storage.dailyStorage.delete(entry.id)
      }
      break
    }
    case 'restore_contact_fields': {
      const contact = await storage.contactStorage.getById(op.contactId)
      if (contact) await storage.contactStorage.save({ ...contact, ...op.previousFields, updatedAt: new Date().toISOString() })
      break
    }
    case 'restore_goal_fields': {
      const goal = await storage.goalStorage.getById(op.goalId)
      if (goal) await storage.goalStorage.save({ ...goal, ...op.previousFields, updatedAt: new Date().toISOString() })
      break
    }
    case 'restore_weekly_fields': {
      const review = await storage.weeklyStorage.getByWeekStart(op.weekStart)
      if (review) await storage.weeklyStorage.save({ ...review, ...op.previousFields, updatedAt: new Date().toISOString() })
      break
    }
    case 'restore_compass': {
      await storage.compassStorage.save(op.previousCompass)
      break
    }
  }
}
