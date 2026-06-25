import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  DailyEntry,
  Goal,
  Project,
  Decision,
  WeeklyReview,
  LifeCompass,
  AppSettings,
  AppStore,
  Contact,
  Interaction,
} from '@/types'
import type { AppliedAction, CaptureSession, ObservabilityMetadata } from '@/lib/agent/types'
import { generateId } from '@/lib/utils'

// ─── Error guard ─────────────────────────────────────────────────────────────

function throwOnError(error: { message: string } | null, op: string): void {
  if (error) throw new Error(`${op}: ${error.message}`)
}

// ─── Row mappers ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToDaily(r: any): DailyEntry {
  return {
    id: r.id, date: r.date, morning: r.morning, evening: r.evening,
    alignmentScore: r.alignment_score, createdAt: r.created_at, updatedAt: r.updated_at,
  }
}
function dailyToRow(e: DailyEntry, userId: string) {
  return {
    id: e.id, user_id: userId, date: e.date,
    morning: e.morning ?? null, evening: e.evening ?? null,
    alignment_score: e.alignmentScore ?? null,
    created_at: e.createdAt, updated_at: e.updatedAt,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToGoal(r: any): Goal {
  return {
    id: r.id, title: r.title, description: r.description, pillar: r.pillar,
    deadline: r.deadline, status: r.status, progress: r.progress,
    whyItMatters: r.why_it_matters, nextAction: r.next_action,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }
}
function goalToRow(g: Goal, userId: string) {
  return {
    id: g.id, user_id: userId, title: g.title, description: g.description,
    pillar: g.pillar, deadline: g.deadline, status: g.status, progress: g.progress,
    why_it_matters: g.whyItMatters, next_action: g.nextAction,
    created_at: g.createdAt, updated_at: g.updatedAt,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToProject(r: any): Project {
  return {
    id: r.id, goalId: r.goal_id, title: r.title, description: r.description,
    pillar: r.pillar, status: r.status, milestones: r.milestones ?? [],
    notes: r.notes, createdAt: r.created_at, updatedAt: r.updated_at,
  }
}
function projectToRow(p: Project, userId: string) {
  return {
    id: p.id, user_id: userId, goal_id: p.goalId ?? null,
    title: p.title, description: p.description,
    pillar: p.pillar, status: p.status, milestones: p.milestones,
    notes: p.notes, created_at: p.createdAt, updated_at: p.updatedAt,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToDecision(r: any): Decision {
  return {
    id: r.id, title: r.title, description: r.description, scores: r.scores,
    compositeScore: r.composite_score, recommendation: r.recommendation,
    opportunityCost: r.opportunity_cost, mainUpside: r.main_upside,
    mainDownside: r.main_downside, suggestedAction: r.suggested_action,
    outcome: r.outcome, createdAt: r.created_at, updatedAt: r.updated_at,
  }
}
function decisionToRow(d: Decision, userId: string) {
  return {
    id: d.id, user_id: userId, title: d.title, description: d.description,
    scores: d.scores, composite_score: d.compositeScore, recommendation: d.recommendation,
    opportunity_cost: d.opportunityCost, main_upside: d.mainUpside,
    main_downside: d.mainDownside, suggested_action: d.suggestedAction,
    outcome: d.outcome ?? null, created_at: d.createdAt, updated_at: d.updatedAt,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToWeekly(r: any): WeeklyReview {
  return {
    id: r.id, weekStart: r.week_start, weekEnd: r.week_end,
    whatImproved: r.what_improved, whatRegressed: r.what_regressed,
    whatCreatedLeverage: r.what_created_leverage, whatWastedTime: r.what_wasted_time,
    whoConnectedWith: r.who_connected_with, whatBuilt: r.what_built,
    whatLearned: r.what_learned, whatDoubleDown: r.what_double_down,
    whatEliminate: r.what_eliminate, mainFocusNextWeek: r.main_focus_next_week,
    weeklyScore: r.weekly_score, pillarScores: r.pillar_scores,
    avgDailyAlignment: r.avg_daily_alignment,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }
}
function weeklyToRow(w: WeeklyReview, userId: string) {
  return {
    id: w.id, user_id: userId, week_start: w.weekStart, week_end: w.weekEnd,
    what_improved: w.whatImproved, what_regressed: w.whatRegressed,
    what_created_leverage: w.whatCreatedLeverage, what_wasted_time: w.whatWastedTime,
    who_connected_with: w.whoConnectedWith, what_built: w.whatBuilt,
    what_learned: w.whatLearned, what_double_down: w.whatDoubleDown,
    what_eliminate: w.whatEliminate, main_focus_next_week: w.mainFocusNextWeek,
    weekly_score: w.weeklyScore, pillar_scores: w.pillarScores,
    avg_daily_alignment: w.avgDailyAlignment,
    created_at: w.createdAt, updated_at: w.updatedAt,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToContact(r: any): Contact {
  return {
    id: r.id, name: r.name, role: r.role, company: r.company,
    relationship: r.relationship, tier: r.tier,
    pillarRelevance: r.pillar_relevance ?? [],
    email: r.email, linkedin: r.linkedin, phone: r.phone,
    met: r.met, metVia: r.met_via, location: r.location,
    bio: r.bio, notes: r.notes, tags: r.tags ?? [],
    whatICanOffer: r.what_i_can_offer, whatTheyCanOffer: r.what_they_can_offer,
    lastContactDate: r.last_contact_date ?? '',
    nextContactDate: r.next_contact_date ?? '',
    touchFrequencyDays: r.touch_frequency_days,
    status: r.status, createdAt: r.created_at, updatedAt: r.updated_at,
  }
}
function contactToRow(c: Contact, userId: string) {
  return {
    id: c.id, user_id: userId, name: c.name, role: c.role, company: c.company,
    relationship: c.relationship, tier: c.tier,
    pillar_relevance: c.pillarRelevance,
    email: c.email, linkedin: c.linkedin, phone: c.phone,
    met: c.met, met_via: c.metVia, location: c.location,
    bio: c.bio, notes: c.notes, tags: c.tags,
    what_i_can_offer: c.whatICanOffer, what_they_can_offer: c.whatTheyCanOffer,
    last_contact_date: c.lastContactDate || null,
    next_contact_date: c.nextContactDate || null,
    touch_frequency_days: c.touchFrequencyDays,
    status: c.status, created_at: c.createdAt, updated_at: c.updatedAt,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToInteraction(r: any): Interaction {
  return {
    id: r.id, contactId: r.contact_id, date: r.date, type: r.type,
    summary: r.summary, keyInsight: r.key_insight, nextStep: r.next_step,
    sentiment: r.sentiment, createdAt: r.created_at,
  }
}
function interactionToRow(i: Interaction, userId: string) {
  return {
    id: i.id, user_id: userId, contact_id: i.contactId, date: i.date, type: i.type,
    summary: i.summary, key_insight: i.keyInsight, next_step: i.nextStep,
    sentiment: i.sentiment, created_at: i.createdAt,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSession(r: any): CaptureSession {
  return {
    id: r.id,
    transcript: r.transcript,
    actions: r.actions ?? [],
    status: r.status,
    summary: r.summary ?? '',
    createdAt: r.created_at,
    metadata: r.metadata ?? undefined,
  }
}

const defaultCompass: LifeCompass = {
  missionStatement: '', tenYearVision: '', threeYearMission: '', currentSeason: '',
  coreValues: [], personalRules: [], antiRules: [], nonNegotiables: [],
  identityStatement: '', updatedAt: new Date().toISOString(),
}

const defaultSettings: AppSettings = { theme: 'dark', userName: 'Alain' }

export interface StorageBundle {
  client: SupabaseClient
  userId: string
  dailyStorage: {
    getAll: () => Promise<DailyEntry[]>
    getByDate: (date: string) => Promise<DailyEntry | undefined>
    save: (entry: DailyEntry) => Promise<void>
    delete: (id: string) => Promise<void>
  }
  goalStorage: {
    getAll: () => Promise<Goal[]>
    getById: (id: string) => Promise<Goal | undefined>
    save: (goal: Goal) => Promise<void>
    delete: (id: string) => Promise<void>
  }
  projectStorage: {
    getAll: () => Promise<Project[]>
    save: (project: Project) => Promise<void>
    delete: (id: string) => Promise<void>
  }
  decisionStorage: {
    getAll: () => Promise<Decision[]>
    getById: (id: string) => Promise<Decision | undefined>
    save: (decision: Decision) => Promise<void>
    delete: (id: string) => Promise<void>
  }
  weeklyStorage: {
    getAll: () => Promise<WeeklyReview[]>
    getByWeekStart: (weekStart: string) => Promise<WeeklyReview | undefined>
    save: (review: WeeklyReview) => Promise<void>
    delete: (id: string) => Promise<void>
  }
  compassStorage: {
    get: () => Promise<LifeCompass>
    save: (compass: LifeCompass) => Promise<void>
  }
  settingsStorage: {
    get: () => Promise<AppSettings>
    save: (settings: AppSettings) => Promise<void>
  }
  contactStorage: {
    getAll: () => Promise<Contact[]>
    getById: (id: string) => Promise<Contact | undefined>
    save: (contact: Contact) => Promise<void>
    delete: (id: string) => Promise<void>
  }
  interactionStorage: {
    getAll: () => Promise<Interaction[]>
    getByContact: (contactId: string) => Promise<Interaction[]>
    save: (interaction: Interaction) => Promise<void>
    delete: (id: string) => Promise<void>
  }
  captureSessionStorage: {
    save: (input: {
      transcript: string
      actions: AppliedAction[]
      status: 'applied' | 'undone' | 'failed'
      summary: string
      metadata?: ObservabilityMetadata
    }) => Promise<string>
    getById: (id: string) => Promise<CaptureSession | undefined>
    getRecent: (limit?: number) => Promise<CaptureSession[]>
    markUndone: (id: string) => Promise<void>
  }
  exportAll: () => Promise<AppStore>
  importAll: (data: AppStore) => Promise<void>
  resetAll: () => Promise<void>
}

export function createStorage(client: SupabaseClient, userId: string): StorageBundle {
  const dailyStorage = {
    getAll: async (): Promise<DailyEntry[]> => {
      const { data, error } = await client
        .from('daily_entries').select('*').order('date', { ascending: true })
      throwOnError(error, 'load daily entries')
      return (data ?? []).map(rowToDaily)
    },
    getByDate: async (date: string): Promise<DailyEntry | undefined> => {
      const { data, error } = await client
        .from('daily_entries').select('*').eq('date', date).maybeSingle()
      throwOnError(error, 'load daily entry')
      return data ? rowToDaily(data) : undefined
    },
    save: async (entry: DailyEntry): Promise<void> => {
      const { error } = await client.from('daily_entries').upsert(dailyToRow(entry, userId))
      throwOnError(error, 'save daily entry')
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await client.from('daily_entries').delete().eq('id', id)
      throwOnError(error, 'delete daily entry')
    },
  }

  const goalStorage = {
    getAll: async (): Promise<Goal[]> => {
      const { data, error } = await client
        .from('goals').select('*').order('created_at', { ascending: false })
      throwOnError(error, 'load goals')
      return (data ?? []).map(rowToGoal)
    },
    getById: async (id: string): Promise<Goal | undefined> => {
      const { data, error } = await client.from('goals').select('*').eq('id', id).maybeSingle()
      throwOnError(error, 'load goal')
      return data ? rowToGoal(data) : undefined
    },
    save: async (goal: Goal): Promise<void> => {
      const { error } = await client.from('goals').upsert(goalToRow(goal, userId))
      throwOnError(error, 'save goal')
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await client.from('goals').delete().eq('id', id)
      throwOnError(error, 'delete goal')
    },
  }

  const projectStorage = {
    getAll: async (): Promise<Project[]> => {
      const { data, error } = await client
        .from('projects').select('*').order('created_at', { ascending: false })
      throwOnError(error, 'load projects')
      return (data ?? []).map(rowToProject)
    },
    save: async (project: Project): Promise<void> => {
      const { error } = await client.from('projects').upsert(projectToRow(project, userId))
      throwOnError(error, 'save project')
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await client.from('projects').delete().eq('id', id)
      throwOnError(error, 'delete project')
    },
  }

  const decisionStorage = {
    getAll: async (): Promise<Decision[]> => {
      const { data, error } = await client
        .from('decisions').select('*').order('created_at', { ascending: false })
      throwOnError(error, 'load decisions')
      return (data ?? []).map(rowToDecision)
    },
    getById: async (id: string): Promise<Decision | undefined> => {
      const { data, error } = await client.from('decisions').select('*').eq('id', id).maybeSingle()
      throwOnError(error, 'load decision')
      return data ? rowToDecision(data) : undefined
    },
    save: async (decision: Decision): Promise<void> => {
      const { error } = await client.from('decisions').upsert(decisionToRow(decision, userId))
      throwOnError(error, 'save decision')
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await client.from('decisions').delete().eq('id', id)
      throwOnError(error, 'delete decision')
    },
  }

  const weeklyStorage = {
    getAll: async (): Promise<WeeklyReview[]> => {
      const { data, error } = await client
        .from('weekly_reviews').select('*').order('week_start', { ascending: false })
      throwOnError(error, 'load weekly reviews')
      return (data ?? []).map(rowToWeekly)
    },
    getByWeekStart: async (weekStart: string): Promise<WeeklyReview | undefined> => {
      const { data, error } = await client
        .from('weekly_reviews').select('*').eq('week_start', weekStart).maybeSingle()
      throwOnError(error, 'load weekly review')
      return data ? rowToWeekly(data) : undefined
    },
    save: async (review: WeeklyReview): Promise<void> => {
      const { error } = await client.from('weekly_reviews').upsert(weeklyToRow(review, userId))
      throwOnError(error, 'save weekly review')
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await client.from('weekly_reviews').delete().eq('id', id)
      throwOnError(error, 'delete weekly review')
    },
  }

  const compassStorage = {
    get: async (): Promise<LifeCompass> => {
      const { data, error } = await client.from('life_compass').select('*').maybeSingle()
      throwOnError(error, 'load compass')
      if (!data) return defaultCompass
      return {
        missionStatement: data.mission_statement, tenYearVision: data.ten_year_vision,
        threeYearMission: data.three_year_mission, currentSeason: data.current_season,
        coreValues: data.core_values ?? [], personalRules: data.personal_rules ?? [],
        antiRules: data.anti_rules ?? [], nonNegotiables: data.non_negotiables ?? [],
        identityStatement: data.identity_statement, updatedAt: data.updated_at,
      }
    },
    save: async (compass: LifeCompass): Promise<void> => {
      const { error } = await client.from('life_compass').upsert({
        user_id: userId,
        mission_statement: compass.missionStatement, ten_year_vision: compass.tenYearVision,
        three_year_mission: compass.threeYearMission, current_season: compass.currentSeason,
        core_values: compass.coreValues, personal_rules: compass.personalRules,
        anti_rules: compass.antiRules, non_negotiables: compass.nonNegotiables,
        identity_statement: compass.identityStatement, updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      throwOnError(error, 'save compass')
    },
  }

  const settingsStorage = {
    get: async (): Promise<AppSettings> => {
      const { data, error } = await client.from('app_settings').select('*').maybeSingle()
      throwOnError(error, 'load settings')
      if (!data) return defaultSettings
      return { theme: data.theme, userName: data.user_name }
    },
    save: async (settings: AppSettings): Promise<void> => {
      const { error } = await client.from('app_settings').upsert({
        user_id: userId,
        theme: settings.theme, user_name: settings.userName,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      throwOnError(error, 'save settings')
    },
  }

  const contactStorage = {
    getAll: async (): Promise<Contact[]> => {
      const { data, error } = await client
        .from('contacts').select('*').order('tier').order('name')
      throwOnError(error, 'load contacts')
      return (data ?? []).map(rowToContact)
    },
    getById: async (id: string): Promise<Contact | undefined> => {
      const { data, error } = await client.from('contacts').select('*').eq('id', id).maybeSingle()
      throwOnError(error, 'load contact')
      return data ? rowToContact(data) : undefined
    },
    save: async (contact: Contact): Promise<void> => {
      const { error } = await client.from('contacts').upsert(contactToRow(contact, userId))
      throwOnError(error, 'save contact')
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await client.from('contacts').delete().eq('id', id)
      throwOnError(error, 'delete contact')
    },
  }

  const interactionStorage = {
    getAll: async (): Promise<Interaction[]> => {
      const { data, error } = await client
        .from('interactions').select('*').order('date', { ascending: false })
      throwOnError(error, 'load interactions')
      return (data ?? []).map(rowToInteraction)
    },
    getByContact: async (contactId: string): Promise<Interaction[]> => {
      const { data, error } = await client
        .from('interactions').select('*')
        .eq('contact_id', contactId).order('date', { ascending: false })
      throwOnError(error, 'load interactions')
      return (data ?? []).map(rowToInteraction)
    },
    save: async (interaction: Interaction): Promise<void> => {
      const { error } = await client.from('interactions').upsert(interactionToRow(interaction, userId))
      throwOnError(error, 'save interaction')
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await client.from('interactions').delete().eq('id', id)
      throwOnError(error, 'delete interaction')
    },
  }

  const captureSessionStorage = {
    save: async (input: {
      transcript: string
      actions: AppliedAction[]
      status: 'applied' | 'undone' | 'failed'
      summary: string
      metadata?: ObservabilityMetadata
    }): Promise<string> => {
      const id = generateId()
      const { error } = await client.from('capture_sessions').insert({
        id,
        user_id: userId,
        transcript: input.transcript,
        actions: input.actions,
        status: input.status,
        summary: input.summary,
        metadata: input.metadata ?? null,
      })
      if (error) throw new Error(`save capture session: ${error.message}`)
      return id
    },
    getById: async (id: string): Promise<CaptureSession | undefined> => {
      const { data, error } = await client
        .from('capture_sessions').select('*').eq('id', id).maybeSingle()
      if (error) throw new Error(`load capture session: ${error.message}`)
      return data ? rowToSession(data) : undefined
    },
    getRecent: async (limit = 10): Promise<CaptureSession[]> => {
      const { data, error } = await client
        .from('capture_sessions').select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw new Error(`load capture sessions: ${error.message}`)
      return (data ?? []).map(rowToSession)
    },
    markUndone: async (id: string): Promise<void> => {
      const { error } = await client
        .from('capture_sessions').update({ status: 'undone' }).eq('id', id)
      if (error) throw new Error(`mark undone: ${error.message}`)
    },
  }

  const exportAll = async (): Promise<AppStore> => {
    const [dailyEntries, goals, projects, decisions, weeklyReviews, contacts, interactions, compass, settings] =
      await Promise.all([
        dailyStorage.getAll(),
        goalStorage.getAll(),
        projectStorage.getAll(),
        decisionStorage.getAll(),
        weeklyStorage.getAll(),
        contactStorage.getAll(),
        interactionStorage.getAll(),
        compassStorage.get(),
        settingsStorage.get(),
      ])
    return { dailyEntries, goals, projects, decisions, weeklyReviews, contacts, interactions, compass, settings }
  }

  const importAll = async (data: AppStore): Promise<void> => {
    await Promise.all([
      ...data.dailyEntries.map((e) => client.from('daily_entries').upsert(dailyToRow(e, userId))),
      ...data.goals.map((g) => client.from('goals').upsert(goalToRow(g, userId))),
      ...data.projects.map((p) => client.from('projects').upsert(projectToRow(p, userId))),
      ...data.decisions.map((d) => client.from('decisions').upsert(decisionToRow(d, userId))),
      ...data.weeklyReviews.map((w) => client.from('weekly_reviews').upsert(weeklyToRow(w, userId))),
      ...(data.contacts ?? []).map((c) => client.from('contacts').upsert(contactToRow(c, userId))),
      ...(data.interactions ?? []).map((i) => client.from('interactions').upsert(interactionToRow(i, userId))),
    ])
    await compassStorage.save(data.compass)
    await settingsStorage.save(data.settings)
  }

  const resetAll = async (): Promise<void> => {
    await Promise.all([
      client.from('daily_entries').delete().neq('id', ''),
      client.from('goals').delete().neq('id', ''),
      client.from('projects').delete().neq('id', ''),
      client.from('decisions').delete().neq('id', ''),
      client.from('weekly_reviews').delete().neq('id', ''),
      client.from('contacts').delete().neq('id', ''),
      client.from('interactions').delete().neq('id', ''),
      client.from('life_compass').delete().neq('id', ''),
      client.from('app_settings').delete().neq('id', ''),
    ])
  }

  return {
    client,
    userId,
    dailyStorage,
    goalStorage,
    projectStorage,
    decisionStorage,
    weeklyStorage,
    compassStorage,
    settingsStorage,
    contactStorage,
    interactionStorage,
    captureSessionStorage,
    exportAll,
    importAll,
    resetAll,
  }
}
