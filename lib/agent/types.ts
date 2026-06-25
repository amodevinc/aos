import type {
  Contact,
  DailyEntry,
  EveningReview,
  Goal,
  Interaction,
  LifeCompass,
  MorningPlan,
  WeeklyReview,
} from '@/types'

// ─── Confidence tiers ─────────────────────────────────────────────────────────

export type ConfidenceTier = 'auto' | 'confirm' | 'hold'

export type ActionKind =
  | 'upsert_daily'
  | 'log_interaction'
  | 'create_contact'
  | 'update_contact'
  | 'create_goal'
  | 'update_goal'
  | 'create_decision'
  | 'update_weekly'
  | 'update_compass'

// ─── Action payloads ─────────────────────────────────────────────────────────

export interface UpsertDailyPayload {
  date: string
  morning?: Partial<MorningPlan>
  evening?: Partial<EveningReview>
}

export interface LogInteractionPayload {
  contactId?: string           // populated by executor after fuzzy match
  contactName: string
  date: string
  type: Interaction['type']
  summary: string
  keyInsight?: string
  nextStep?: string
  sentiment?: Interaction['sentiment']
}

export interface CreateContactPayload {
  name: string
  role?: string
  company?: string
  relationship?: Contact['relationship']
  tier?: Contact['tier']
  notes?: string
  bio?: string
  location?: string
}

export interface UpdateContactPayload {
  contactId?: string           // populated by executor after fuzzy match
  contactName: string
  fields: Partial<Pick<Contact,
    'notes' | 'bio' | 'role' | 'company' | 'location' | 'tier' | 'status' | 'nextContactDate'
  >>
}

export interface CreateGoalPayload {
  title: string
  description?: string
  pillar: Goal['pillar']
  deadline?: string
  progress?: number
  whyItMatters?: string
  nextAction?: string
}

export interface UpdateGoalPayload {
  goalId?: string              // populated by executor after fuzzy match
  goalTitle?: string           // used for fuzzy match when goalId unknown
  fields: Partial<Pick<Goal, 'progress' | 'status' | 'nextAction' | 'description' | 'deadline'>>
}

export interface CreateDecisionPayload {
  title: string
  description?: string
  scores: {
    healthImpact: number       // -5 to +5
    capabilityImpact: number
    networkImpact: number
    wealthImpact: number
    missionAlignment: number
    longTermLeverage: number
    timeRequirement: number    // -5 to 0
    risk: number
    distractionRisk: number
  }
}

export interface UpdateWeeklyPayload {
  weekStart?: string           // defaults to current week start
  fields: Partial<Pick<WeeklyReview,
    | 'whatImproved' | 'whatRegressed' | 'whatCreatedLeverage'
    | 'whatWastedTime' | 'whoConnectedWith' | 'whatBuilt'
    | 'whatLearned' | 'whatDoubleDown' | 'whatEliminate'
    | 'mainFocusNextWeek'
  >>
}

export interface UpdateCompassPayload {
  fields?: Partial<Pick<LifeCompass,
    | 'missionStatement' | 'tenYearVision' | 'threeYearMission'
    | 'currentSeason' | 'identityStatement'
  >>
  addCoreValues?: string[]
  addPersonalRules?: string[]
  addAntiRules?: string[]
  addNonNegotiables?: string[]
}

// ─── CaptureAction union ──────────────────────────────────────────────────────

interface BaseAction {
  confidence: number        // 0.0–1.0 from agent
  tier: ConfidenceTier      // derived client-side via confidenceToTier()
  reasoning: string         // short debug note from agent
}

export interface UpsertDailyAction   extends BaseAction { kind: 'upsert_daily';    payload: UpsertDailyPayload }
export interface LogInteractionAction extends BaseAction { kind: 'log_interaction'; payload: LogInteractionPayload }
export interface CreateContactAction  extends BaseAction { kind: 'create_contact';  payload: CreateContactPayload }
export interface UpdateContactAction  extends BaseAction { kind: 'update_contact';  payload: UpdateContactPayload }
export interface CreateGoalAction     extends BaseAction { kind: 'create_goal';     payload: CreateGoalPayload }
export interface UpdateGoalAction     extends BaseAction { kind: 'update_goal';     payload: UpdateGoalPayload }
export interface CreateDecisionAction extends BaseAction { kind: 'create_decision'; payload: CreateDecisionPayload }
export interface UpdateWeeklyAction   extends BaseAction { kind: 'update_weekly';   payload: UpdateWeeklyPayload }
export interface UpdateCompassAction  extends BaseAction { kind: 'update_compass';  payload: UpdateCompassPayload }

export type CaptureAction =
  | UpsertDailyAction
  | LogInteractionAction
  | CreateContactAction
  | UpdateContactAction
  | CreateGoalAction
  | UpdateGoalAction
  | CreateDecisionAction
  | UpdateWeeklyAction
  | UpdateCompassAction

export interface AgentResponse {
  actions: CaptureAction[]
  summary: string
  metadata?: ObservabilityMetadata
}

// ─── Undo operations ─────────────────────────────────────────────────────────

export type UndoOperation =
  | { type: 'delete_row';              table: string; id: string }
  | { type: 'restore_daily';           previousEntry: DailyEntry | undefined; date: string }
  | { type: 'restore_contact_fields';  contactId: string; previousFields: Partial<Contact> }
  | { type: 'restore_goal_fields';     goalId: string; previousFields: Partial<Goal> }
  | { type: 'restore_weekly_fields';   weekStart: string; previousFields: Partial<WeeklyReview> }
  | { type: 'restore_compass';         previousCompass: LifeCompass }

export interface AppliedAction {
  action: CaptureAction
  undoOp: UndoOperation
}

export interface ExecutionResult {
  applied: AppliedAction[]
  failed: { action: CaptureAction; error: string }[]
  sessionId: string
}

// ─── Observability metadata ───────────────────────────────────────────────────

export interface ObservabilityMetadata {
  extractionMs: number
  totalMs: number
  extractionInputTokens: number
  extractionOutputTokens: number
  evaluatorInputTokens: number
  evaluatorOutputTokens: number
  evaluatorCorrections: string[]
  domainsDetected: string[]
}

// ─── Capture session ──────────────────────────────────────────────────────────

export interface CaptureSession {
  id: string
  transcript: string
  actions: AppliedAction[]
  status: 'applied' | 'undone' | 'failed'
  summary: string
  createdAt: string
  metadata?: ObservabilityMetadata
}

// ─── Tier derivation ──────────────────────────────────────────────────────────

export function confidenceToTier(confidence: number, kind: ActionKind): ConfidenceTier {
  if (kind === 'update_compass') return 'hold'
  if (kind === 'create_contact') return confidence >= 0.85 ? 'confirm' : 'hold'
  if (confidence >= 0.85) return 'auto'
  if (confidence >= 0.60) return 'confirm'
  return 'hold'
}

export const TIER_META: Record<ConfidenceTier, { label: string; color: string; border: string }> = {
  auto:    { label: 'Auto-applied',    color: 'text-emerald-400', border: 'border-emerald-400/20' },
  confirm: { label: 'Confirm',         color: 'text-amber-400',   border: 'border-amber-400/20' },
  hold:    { label: 'Review required', color: 'text-orange-400',  border: 'border-orange-400/20' },
}

export const ACTION_LABELS: Record<ActionKind, string> = {
  upsert_daily:    'Daily Entry',
  log_interaction: 'Interaction Log',
  create_contact:  'New Contact',
  update_contact:  'Contact Update',
  create_goal:     'New Goal',
  update_goal:     'Goal Update',
  create_decision: 'Decision',
  update_weekly:   'Weekly Review',
  update_compass:  'Life Compass',
}
