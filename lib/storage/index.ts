import { createClient } from '@/lib/supabase/client'
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

// ─── Row mappers ──────────────────────────────────────────────────────────────
// Supabase uses snake_case columns; our TypeScript types use camelCase.
// These mappers keep the conversion in one place.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToDaily(r: any): DailyEntry {
  return {
    id: r.id, date: r.date, morning: r.morning, evening: r.evening,
    alignmentScore: r.alignment_score, createdAt: r.created_at, updatedAt: r.updated_at,
  }
}
function dailyToRow(e: DailyEntry) {
  return {
    id: e.id, date: e.date, morning: e.morning ?? null, evening: e.evening ?? null,
    alignment_score: e.alignmentScore ?? null, created_at: e.createdAt, updated_at: e.updatedAt,
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
function goalToRow(g: Goal) {
  return {
    id: g.id, title: g.title, description: g.description, pillar: g.pillar,
    deadline: g.deadline, status: g.status, progress: g.progress,
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
function projectToRow(p: Project) {
  return {
    id: p.id, goal_id: p.goalId ?? null, title: p.title, description: p.description,
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
function decisionToRow(d: Decision) {
  return {
    id: d.id, title: d.title, description: d.description, scores: d.scores,
    composite_score: d.compositeScore, recommendation: d.recommendation,
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
function weeklyToRow(w: WeeklyReview) {
  return {
    id: w.id, week_start: w.weekStart, week_end: w.weekEnd,
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

const defaultCompass: LifeCompass = {
  missionStatement: '', tenYearVision: '', threeYearMission: '', currentSeason: '',
  coreValues: [], personalRules: [], antiRules: [], nonNegotiables: [],
  identityStatement: '', updatedAt: new Date().toISOString(),
}

const defaultSettings: AppSettings = { theme: 'dark', userName: 'Alain' }

// ─── Daily Entries ────────────────────────────────────────────────────────────

export const dailyStorage = {
  getAll: async (): Promise<DailyEntry[]> => {
    const { data } = await createClient()
      .from('daily_entries').select('*').order('date', { ascending: true })
    return (data ?? []).map(rowToDaily)
  },
  getByDate: async (date: string): Promise<DailyEntry | undefined> => {
    const { data } = await createClient()
      .from('daily_entries').select('*').eq('date', date).maybeSingle()
    return data ? rowToDaily(data) : undefined
  },
  save: async (entry: DailyEntry): Promise<void> => {
    await createClient().from('daily_entries').upsert(dailyToRow(entry))
  },
  delete: async (id: string): Promise<void> => {
    await createClient().from('daily_entries').delete().eq('id', id)
  },
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export const goalStorage = {
  getAll: async (): Promise<Goal[]> => {
    const { data } = await createClient()
      .from('goals').select('*').order('created_at', { ascending: false })
    return (data ?? []).map(rowToGoal)
  },
  getById: async (id: string): Promise<Goal | undefined> => {
    const { data } = await createClient().from('goals').select('*').eq('id', id).maybeSingle()
    return data ? rowToGoal(data) : undefined
  },
  save: async (goal: Goal): Promise<void> => {
    await createClient().from('goals').upsert(goalToRow(goal))
  },
  delete: async (id: string): Promise<void> => {
    await createClient().from('goals').delete().eq('id', id)
  },
}

// ─── Projects ────────────────────────────────────────────────────────────────

export const projectStorage = {
  getAll: async (): Promise<Project[]> => {
    const { data } = await createClient()
      .from('projects').select('*').order('created_at', { ascending: false })
    return (data ?? []).map(rowToProject)
  },
  save: async (project: Project): Promise<void> => {
    await createClient().from('projects').upsert(projectToRow(project))
  },
  delete: async (id: string): Promise<void> => {
    await createClient().from('projects').delete().eq('id', id)
  },
}

// ─── Decisions ───────────────────────────────────────────────────────────────

export const decisionStorage = {
  getAll: async (): Promise<Decision[]> => {
    const { data } = await createClient()
      .from('decisions').select('*').order('created_at', { ascending: false })
    return (data ?? []).map(rowToDecision)
  },
  getById: async (id: string): Promise<Decision | undefined> => {
    const { data } = await createClient().from('decisions').select('*').eq('id', id).maybeSingle()
    return data ? rowToDecision(data) : undefined
  },
  save: async (decision: Decision): Promise<void> => {
    await createClient().from('decisions').upsert(decisionToRow(decision))
  },
  delete: async (id: string): Promise<void> => {
    await createClient().from('decisions').delete().eq('id', id)
  },
}

// ─── Weekly Reviews ──────────────────────────────────────────────────────────

export const weeklyStorage = {
  getAll: async (): Promise<WeeklyReview[]> => {
    const { data } = await createClient()
      .from('weekly_reviews').select('*').order('week_start', { ascending: false })
    return (data ?? []).map(rowToWeekly)
  },
  getByWeekStart: async (weekStart: string): Promise<WeeklyReview | undefined> => {
    const { data } = await createClient()
      .from('weekly_reviews').select('*').eq('week_start', weekStart).maybeSingle()
    return data ? rowToWeekly(data) : undefined
  },
  save: async (review: WeeklyReview): Promise<void> => {
    await createClient().from('weekly_reviews').upsert(weeklyToRow(review))
  },
  delete: async (id: string): Promise<void> => {
    await createClient().from('weekly_reviews').delete().eq('id', id)
  },
}

// ─── Life Compass ────────────────────────────────────────────────────────────

export const compassStorage = {
  get: async (): Promise<LifeCompass> => {
    const { data } = await createClient().from('life_compass').select('*').maybeSingle()
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
    const { data: { user } } = await createClient().auth.getUser()
    if (!user) return
    await createClient().from('life_compass').upsert({
      user_id: user.id,
      mission_statement: compass.missionStatement, ten_year_vision: compass.tenYearVision,
      three_year_mission: compass.threeYearMission, current_season: compass.currentSeason,
      core_values: compass.coreValues, personal_rules: compass.personalRules,
      anti_rules: compass.antiRules, non_negotiables: compass.nonNegotiables,
      identity_statement: compass.identityStatement, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  },
}

// ─── Settings ────────────────────────────────────────────────────────────────

export const settingsStorage = {
  get: async (): Promise<AppSettings> => {
    const { data } = await createClient().from('app_settings').select('*').maybeSingle()
    if (!data) return defaultSettings
    return { theme: data.theme, userName: data.user_name }
  },
  save: async (settings: AppSettings): Promise<void> => {
    const { data: { user } } = await createClient().auth.getUser()
    if (!user) return
    await createClient().from('app_settings').upsert({
      user_id: user.id,
      theme: settings.theme, user_name: settings.userName,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  },
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

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
function contactToRow(c: Contact) {
  return {
    id: c.id, name: c.name, role: c.role, company: c.company,
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

export const contactStorage = {
  getAll: async (): Promise<Contact[]> => {
    const { data } = await createClient()
      .from('contacts').select('*').order('tier').order('name')
    return (data ?? []).map(rowToContact)
  },
  getById: async (id: string): Promise<Contact | undefined> => {
    const { data } = await createClient().from('contacts').select('*').eq('id', id).maybeSingle()
    return data ? rowToContact(data) : undefined
  },
  save: async (contact: Contact): Promise<void> => {
    await createClient().from('contacts').upsert(contactToRow(contact))
  },
  delete: async (id: string): Promise<void> => {
    await createClient().from('contacts').delete().eq('id', id)
  },
}

// ─── Interactions ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToInteraction(r: any): Interaction {
  return {
    id: r.id, contactId: r.contact_id, date: r.date, type: r.type,
    summary: r.summary, keyInsight: r.key_insight, nextStep: r.next_step,
    sentiment: r.sentiment, createdAt: r.created_at,
  }
}
function interactionToRow(i: Interaction) {
  return {
    id: i.id, contact_id: i.contactId, date: i.date, type: i.type,
    summary: i.summary, key_insight: i.keyInsight, next_step: i.nextStep,
    sentiment: i.sentiment, created_at: i.createdAt,
  }
}

export const interactionStorage = {
  getAll: async (): Promise<Interaction[]> => {
    const { data } = await createClient()
      .from('interactions').select('*').order('date', { ascending: false })
    return (data ?? []).map(rowToInteraction)
  },
  getByContact: async (contactId: string): Promise<Interaction[]> => {
    const { data } = await createClient()
      .from('interactions').select('*')
      .eq('contact_id', contactId).order('date', { ascending: false })
    return (data ?? []).map(rowToInteraction)
  },
  save: async (interaction: Interaction): Promise<void> => {
    await createClient().from('interactions').upsert(interactionToRow(interaction))
  },
  delete: async (id: string): Promise<void> => {
    await createClient().from('interactions').delete().eq('id', id)
  },
}

// ─── Export / Import ──────────────────────────────────────────────────────────

export async function exportAll(): Promise<AppStore> {
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

export async function importAll(data: AppStore): Promise<void> {
  const db = createClient()
  await Promise.all([
    ...data.dailyEntries.map((e) => db.from('daily_entries').upsert(dailyToRow(e))),
    ...data.goals.map((g) => db.from('goals').upsert(goalToRow(g))),
    ...data.projects.map((p) => db.from('projects').upsert(projectToRow(p))),
    ...data.decisions.map((d) => db.from('decisions').upsert(decisionToRow(d))),
    ...data.weeklyReviews.map((w) => db.from('weekly_reviews').upsert(weeklyToRow(w))),
    ...(data.contacts ?? []).map((c) => db.from('contacts').upsert(contactToRow(c))),
    ...(data.interactions ?? []).map((i) => db.from('interactions').upsert(interactionToRow(i))),
  ])
  await compassStorage.save(data.compass)
  await settingsStorage.save(data.settings)
}

export async function resetAll(): Promise<void> {
  const db = createClient()
  await Promise.all([
    db.from('daily_entries').delete().neq('id', ''),
    db.from('goals').delete().neq('id', ''),
    db.from('projects').delete().neq('id', ''),
    db.from('decisions').delete().neq('id', ''),
    db.from('weekly_reviews').delete().neq('id', ''),
    db.from('contacts').delete().neq('id', ''),
    db.from('interactions').delete().neq('id', ''),
    db.from('life_compass').delete().neq('id', ''),
    db.from('app_settings').delete().neq('id', ''),
  ])
}
