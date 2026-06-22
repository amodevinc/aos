// ─── Core Domain Types ────────────────────────────────────────────────────────
// Five pillars are the central organizing structure of AOS.
// Every data structure maps back to one or more pillars.

export type Pillar = 'health' | 'capability' | 'network' | 'wealth' | 'mission'

export type PillarScores = Record<Pillar, number>

// ─── Daily Entry ─────────────────────────────────────────────────────────────

export interface MorningPlan {
  top3Priorities: [string, string, string]
  healthAction: string
  capabilityAction: string
  networkAction: string
  wealthAction: string
  biggestRisk: string
  identityStatement: string
}

export interface EveningReview {
  // Execution questions — weighted by pillar importance in scoring
  didTrain: boolean
  didEatWell: boolean
  didRecover: boolean
  didLearn: boolean
  didMoveProject: boolean
  didStrengthenRelationship: boolean
  didCreateValue: boolean
  didAvoidDistractions: boolean
  didActInAlignment: boolean
  // Reflection
  biggestWin: string
  biggestMistake: string
  lessonLearned: string
  adjustmentTomorrow: string
}

export interface DailyEntry {
  id: string
  date: string // YYYY-MM-DD
  morning?: MorningPlan
  evening?: EveningReview
  alignmentScore?: number // 0–100, computed from EveningReview
  createdAt: string
  updatedAt: string
}

// ─── Goals & Projects ────────────────────────────────────────────────────────

export type GoalStatus = 'active' | 'completed' | 'paused' | 'abandoned'

export interface Goal {
  id: string
  title: string
  description: string
  pillar: Pillar
  deadline: string // YYYY-MM-DD
  status: GoalStatus
  progress: number // 0–100
  whyItMatters: string
  nextAction: string
  createdAt: string
  updatedAt: string
}

export type ProjectStatus = 'active' | 'completed' | 'paused'

export interface Milestone {
  id: string
  title: string
  completed: boolean
  dueDate?: string
}

export interface Project {
  id: string
  goalId?: string
  title: string
  description: string
  pillar: Pillar
  status: ProjectStatus
  milestones: Milestone[]
  notes: string
  createdAt: string
  updatedAt: string
}

// ─── Decision Engine ─────────────────────────────────────────────────────────

// Each dimension scored -5 to +5.
// Positive dimensions add value; negative dimensions represent cost/risk.
export interface DecisionScores {
  healthImpact: number       // -5 to +5
  capabilityImpact: number   // -5 to +5
  networkImpact: number      // -5 to +5
  wealthImpact: number       // -5 to +5
  missionAlignment: number   // -5 to +5
  longTermLeverage: number   // -5 to +5
  timeRequirement: number    // -5 to 0 (pure cost; 0 = minimal, -5 = massive time sink)
  risk: number               // -5 to 0 (pure cost; 0 = no risk, -5 = extreme risk)
  distractionRisk: number    // -5 to 0 (pure cost; 0 = no distraction, -5 = total derail)
}

export type DecisionRecommendation =
  | 'strong-yes'
  | 'yes'
  | 'neutral'
  | 'probably-no'
  | 'avoid'

export interface Decision {
  id: string
  title: string
  description: string
  scores: DecisionScores
  compositeScore: number          // 0–100, computed
  recommendation: DecisionRecommendation
  opportunityCost: string
  mainUpside: string
  mainDownside: string
  suggestedAction: string
  outcome?: string                // optionally filled in retrospect
  createdAt: string
  updatedAt: string
}

// ─── Weekly Review ───────────────────────────────────────────────────────────

export interface WeeklyReview {
  id: string
  weekStart: string  // YYYY-MM-DD (Monday)
  weekEnd: string    // YYYY-MM-DD (Sunday)
  // Qualitative sections
  whatImproved: string
  whatRegressed: string
  whatCreatedLeverage: string
  whatWastedTime: string
  whoConnectedWith: string
  whatBuilt: string
  whatLearned: string
  whatDoubleDown: string
  whatEliminate: string
  mainFocusNextWeek: string
  // Computed
  weeklyScore: number         // 0–100
  pillarScores: PillarScores
  avgDailyAlignment: number   // average of daily entries in the week
  createdAt: string
  updatedAt: string
}

// ─── Life Compass ────────────────────────────────────────────────────────────

export interface LifeCompass {
  missionStatement: string
  tenYearVision: string
  threeYearMission: string
  currentSeason: string
  coreValues: string[]
  personalRules: string[]
  antiRules: string[]
  nonNegotiables: string[]
  identityStatement: string
  updatedAt: string
}

// ─── Personal CRM ────────────────────────────────────────────────────────────

export type RelationshipType =
  | 'mentor'
  | 'peer'
  | 'collaborator'
  | 'investor'
  | 'advisor'
  | 'client'
  | 'connector'
  | 'other'

export type ContactStatus = 'active' | 'dormant' | 'prospect'

// Tier 1 = critical (mentors, key investors, close collaborators)
// Tier 2 = important (strong network contacts)
// Tier 3 = peripheral (valuable but lower priority)
export type ContactTier = 1 | 2 | 3

export interface Contact {
  id: string
  name: string
  role: string
  company: string
  relationship: RelationshipType
  tier: ContactTier
  pillarRelevance: Pillar[]
  // Contact info
  email: string
  linkedin: string
  phone: string
  // Origin
  met: string        // YYYY-MM-DD
  metVia: string     // conference, intro, online, etc.
  location: string
  // Profile
  bio: string        // who they are and what makes them notable
  notes: string      // ongoing private notes
  tags: string[]
  whatICanOffer: string
  whatTheyCanOffer: string
  // Relationship cadence
  lastContactDate: string    // YYYY-MM-DD
  nextContactDate: string    // YYYY-MM-DD (planned next touch)
  touchFrequencyDays: number // target cadence: 21, 45, 90, 180
  status: ContactStatus
  createdAt: string
  updatedAt: string
}

export type InteractionType =
  | 'meeting'
  | 'call'
  | 'message'
  | 'email'
  | 'event'
  | 'intro'
  | 'other'

export type InteractionSentiment = 'great' | 'good' | 'neutral' | 'difficult'

export interface Interaction {
  id: string
  contactId: string
  date: string    // YYYY-MM-DD
  type: InteractionType
  summary: string
  keyInsight: string
  nextStep: string
  sentiment: InteractionSentiment
  createdAt: string
}

// ─── App Store (root state shape) ────────────────────────────────────────────

export interface AppStore {
  dailyEntries: DailyEntry[]
  goals: Goal[]
  projects: Project[]
  decisions: Decision[]
  weeklyReviews: WeeklyReview[]
  contacts: Contact[]
  interactions: Interaction[]
  compass: LifeCompass
  settings: AppSettings
}

export interface AppSettings {
  theme: 'dark' | 'light'
  userName: string
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

export interface NavItem {
  label: string
  href: string
  icon: string
}
