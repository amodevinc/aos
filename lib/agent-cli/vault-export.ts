import fs from 'fs'
import path from 'path'
import os from 'os'
import type { StorageBundle } from '@/lib/storage/factory'
import { buildAOSContext } from '@/lib/ai/context'
import type {
  AppStore, Contact, DailyEntry, Decision, Goal, Interaction, LifeCompass, WeeklyReview,
} from '@/types'

export function resolveVaultPath(): string {
  const configured = process.env.AOS_VAULT_PATH
  if (configured) return configured.replace(/^~/, os.homedir())
  return path.join(os.homedir(), 'vault')
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'untitled'
}

function yamlEscape(value: string): string {
  if (/[:#\n\r"'&*!?|>@[\]{},]/.test(value) || value.startsWith(' ') || value.endsWith(' ')) {
    return JSON.stringify(value)
  }
  return value
}

function frontmatter(data: Record<string, string | number | boolean | string[] | undefined>): string {
  const lines = ['---']
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === '') continue
    if (Array.isArray(value)) {
      lines.push(`${key}:`)
      for (const item of value) lines.push(`  - ${yamlEscape(String(item))}`)
    } else {
      lines.push(`${key}: ${typeof value === 'string' ? yamlEscape(value) : value}`)
    }
  }
  lines.push('---', '')
  return lines.join('\n')
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true })
}

function writeFile(filePath: string, content: string): void {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, content, 'utf8')
}

function cleanGeneratedDir(dir: string): void {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir)) {
    if (entry.startsWith('.')) continue
    fs.rmSync(path.join(dir, entry), { recursive: true, force: true })
  }
}

function formatDaily(entry: DailyEntry): string {
  const fm = frontmatter({
    id: entry.id,
    date: entry.date,
    alignment_score: entry.alignmentScore,
    aos_type: 'daily',
    updated_at: entry.updatedAt,
  })

  const parts: string[] = [`# Daily — ${entry.date}`, '']
  if (entry.morning) {
    parts.push('## Morning plan', '')
    const m = entry.morning
    parts.push(`**Top 3:** ${m.top3Priorities.filter(Boolean).join(' · ') || '—'}`)
    if (m.healthAction) parts.push(`- Health: ${m.healthAction}`)
    if (m.capabilityAction) parts.push(`- Capability: ${m.capabilityAction}`)
    if (m.networkAction) parts.push(`- Network: ${m.networkAction}`)
    if (m.wealthAction) parts.push(`- Wealth: ${m.wealthAction}`)
    if (m.biggestRisk) parts.push(`- Biggest risk: ${m.biggestRisk}`)
    if (m.identityStatement) parts.push(`- Identity: ${m.identityStatement}`)
    parts.push('')
  }
  if (entry.evening) {
    parts.push('## Evening review', '')
    const e = entry.evening
    const checks = [
      e.didTrain && 'trained', e.didEatWell && 'ate well', e.didRecover && 'recovered',
      e.didLearn && 'learned', e.didMoveProject && 'moved project',
      e.didStrengthenRelationship && 'strengthened relationship',
      e.didCreateValue && 'created value', e.didAvoidDistractions && 'avoided distractions',
      e.didActInAlignment && 'acted in alignment',
    ].filter(Boolean)
    if (checks.length) parts.push(`**Done:** ${checks.join(', ')}`)
    if (e.biggestWin) parts.push(`**Win:** ${e.biggestWin}`)
    if (e.biggestMistake) parts.push(`**Mistake:** ${e.biggestMistake}`)
    if (e.lessonLearned) parts.push(`**Lesson:** ${e.lessonLearned}`)
    if (e.adjustmentTomorrow) parts.push(`**Tomorrow:** ${e.adjustmentTomorrow}`)
  }
  return fm + parts.join('\n') + '\n'
}

function formatGoal(goal: Goal): string {
  const fm = frontmatter({
    id: goal.id,
    title: goal.title,
    pillar: goal.pillar,
    status: goal.status,
    progress: goal.progress,
    deadline: goal.deadline,
    aos_type: 'goal',
    updated_at: goal.updatedAt,
  })
  return fm + [
    `# ${goal.title}`,
    '',
    goal.description && `## Description\n\n${goal.description}`,
    goal.whyItMatters && `## Why it matters\n\n${goal.whyItMatters}`,
    goal.nextAction && `## Next action\n\n${goal.nextAction}`,
  ].filter(Boolean).join('\n\n') + '\n'
}

function formatDecision(decision: Decision): string {
  const fm = frontmatter({
    id: decision.id,
    title: decision.title,
    composite_score: decision.compositeScore,
    recommendation: decision.recommendation,
    aos_type: 'decision',
    updated_at: decision.updatedAt,
  })
  return fm + [
    `# ${decision.title}`,
    '',
    decision.description && `## Context\n\n${decision.description}`,
    `## Score: ${decision.compositeScore}/100 — ${decision.recommendation}`,
    decision.mainUpside && `**Upside:** ${decision.mainUpside}`,
    decision.mainDownside && `**Downside:** ${decision.mainDownside}`,
    decision.suggestedAction && `**Suggested action:** ${decision.suggestedAction}`,
    decision.outcome && `**Outcome:** ${decision.outcome}`,
  ].filter(Boolean).join('\n\n') + '\n'
}

function formatContact(contact: Contact, interactions: Interaction[]): string {
  const fm = frontmatter({
    id: contact.id,
    name: contact.name,
    tier: contact.tier,
    relationship: contact.relationship,
    company: contact.company,
    status: contact.status,
    last_contact: contact.lastContactDate,
    aos_type: 'contact',
    updated_at: contact.updatedAt,
  })
  const parts = [
    `# ${contact.name}`,
    '',
    contact.role && `**Role:** ${contact.role}${contact.company ? ` @ ${contact.company}` : ''}`,
    contact.bio && `## Bio\n\n${contact.bio}`,
    contact.notes && `## Notes\n\n${contact.notes}`,
    contact.whatTheyCanOffer && `**They offer:** ${contact.whatTheyCanOffer}`,
    contact.whatICanOffer && `**I offer:** ${contact.whatICanOffer}`,
  ].filter(Boolean) as string[]

  if (interactions.length > 0) {
    parts.push('', '## Interactions', '')
    for (const i of interactions.slice(0, 20)) {
      parts.push(`### ${i.date} — ${i.type}`)
      if (i.summary) parts.push(i.summary)
      if (i.keyInsight) parts.push(`*Insight:* ${i.keyInsight}`)
      if (i.nextStep) parts.push(`*Next:* ${i.nextStep}`)
      parts.push('')
    }
  }
  return fm + parts.join('\n') + '\n'
}

function formatWeekly(review: WeeklyReview): string {
  const fm = frontmatter({
    id: review.id,
    week_start: review.weekStart,
    week_end: review.weekEnd,
    weekly_score: review.weeklyScore,
    aos_type: 'weekly',
    updated_at: review.updatedAt,
  })
  const fields: [string, string][] = [
    ['What improved', review.whatImproved],
    ['What regressed', review.whatRegressed],
    ['Leverage created', review.whatCreatedLeverage],
    ['Time wasted', review.whatWastedTime],
    ['Connected with', review.whoConnectedWith],
    ['Built', review.whatBuilt],
    ['Learned', review.whatLearned],
    ['Double down', review.whatDoubleDown],
    ['Eliminate', review.whatEliminate],
    ['Focus next week', review.mainFocusNextWeek],
  ]
  const body = fields
    .filter(([, v]) => v)
    .map(([label, value]) => `## ${label}\n\n${value}`)
    .join('\n\n')
  return fm + `# Week ${review.weekStart} — ${review.weekEnd}\n\n${body}\n`
}

function formatCompass(compass: LifeCompass): string {
  const fm = frontmatter({
    aos_type: 'compass',
    updated_at: compass.updatedAt,
  })
  const list = (title: string, items: string[]) =>
    items.length ? `## ${title}\n\n${items.map((i) => `- ${i}`).join('\n')}` : ''

  return fm + [
    '# Life Compass',
    '',
    compass.missionStatement && `## Mission\n\n${compass.missionStatement}`,
    compass.identityStatement && `## Identity\n\n${compass.identityStatement}`,
    compass.currentSeason && `## Current season\n\n${compass.currentSeason}`,
    compass.tenYearVision && `## 10-year vision\n\n${compass.tenYearVision}`,
    compass.threeYearMission && `## 3-year mission\n\n${compass.threeYearMission}`,
    list('Core values', compass.coreValues),
    list('Personal rules', compass.personalRules),
    list('Anti-rules', compass.antiRules),
    list('Non-negotiables', compass.nonNegotiables),
  ].filter(Boolean).join('\n\n') + '\n'
}

function ensureVaultScaffold(vaultPath: string): void {
  for (const dir of ['aos', 'journal', 'notes', 'agent']) {
    ensureDir(path.join(vaultPath, dir))
  }

  const claudeMd = path.join(vaultPath, 'CLAUDE.md')
  if (!fs.existsSync(claudeMd)) {
    fs.writeFileSync(claudeMd, VAULT_CLAUDE_MD, 'utf8')
  }
}

const VAULT_CLAUDE_MD = `# AOS Vault — Agent Instructions

You are working in Alain's personal vault for the **Alain Operating System (AOS)**.

## Layout

- \`aos/\` — **read-only mirror** of structured AOS data (regenerated by export). Do not edit files here.
- \`journal/\` — free-form long-form thinking
- \`notes/\` — research, meeting notes, ideas (use Obsidian backlinks)
- \`agent/\` — your syntheses, reports, and drafts

## AOS domains (5 pillars)

health · capability · network · wealth · mission

Structured records live in Supabase. Use MCP tools to **read** live data and **write** structured updates.

## Writing back to AOS

1. Prefer the \`capture\` tool for natural-language updates (evening review, CRM, goals, etc.)
2. Use \`apply_actions\` only when you have validated structured actions
3. Compass changes require explicit confirmation — never auto-apply
4. Every write is logged in \`capture_sessions\` and can be undone with \`undo_session\`

## Before deep analysis

Run \`sync_vault\` MCP tool (or \`npm run aos:sync\`) to refresh the mirror before deep analysis.
`

export interface ExportResult {
  vaultPath: string
  filesWritten: number
  exportedAt: string
}

export async function exportVault(storage: StorageBundle, vaultPath = resolveVaultPath()): Promise<ExportResult> {
  const data = await storage.exportAll()
  return writeVaultFromData(data, vaultPath)
}

export function writeVaultFromData(data: AppStore, vaultPath = resolveVaultPath()): ExportResult {
  ensureVaultScaffold(vaultPath)

  const aosDir = path.join(vaultPath, 'aos')
  for (const sub of ['daily', 'goals', 'decisions', 'contacts', 'weekly']) {
    cleanGeneratedDir(path.join(aosDir, sub))
  }

  let filesWritten = 0

  const interactionsByContact = new Map<string, Interaction[]>()
  for (const interaction of data.interactions) {
    const list = interactionsByContact.get(interaction.contactId) ?? []
    list.push(interaction)
    interactionsByContact.set(interaction.contactId, list)
  }

  for (const entry of data.dailyEntries) {
    writeFile(path.join(aosDir, 'daily', `${entry.date}.md`), formatDaily(entry))
    filesWritten++
  }

  for (const goal of data.goals) {
    writeFile(path.join(aosDir, 'goals', `${slugify(goal.title)}.md`), formatGoal(goal))
    filesWritten++
  }

  for (const decision of data.decisions) {
    writeFile(path.join(aosDir, 'decisions', `${slugify(decision.title)}.md`), formatDecision(decision))
    filesWritten++
  }

  for (const contact of data.contacts) {
    const interactions = (interactionsByContact.get(contact.id) ?? [])
      .sort((a, b) => b.date.localeCompare(a.date))
    writeFile(path.join(aosDir, 'contacts', `${slugify(contact.name)}.md`), formatContact(contact, interactions))
    filesWritten++
  }

  for (const review of data.weeklyReviews) {
    writeFile(path.join(aosDir, 'weekly', `${review.weekStart}.md`), formatWeekly(review))
    filesWritten++
  }

  writeFile(path.join(aosDir, 'compass.md'), formatCompass(data.compass))
  filesWritten++

  const context = buildAOSContext({
    allEntries: data.dailyEntries,
    goals: data.goals,
    decisions: data.decisions,
    weeklyReviews: data.weeklyReviews,
    contacts: data.contacts,
    compass: data.compass,
  })
  writeFile(path.join(aosDir, '_context.md'), `# AOS Context Snapshot\n\n> Auto-generated. Source: Supabase via export-vault.\n\n\`\`\`\n${context}\n\`\`\`\n`)
  filesWritten++

  writeFile(
    path.join(aosDir, '_meta.json'),
    JSON.stringify({ exportedAt: new Date().toISOString(), filesWritten }, null, 2)
  )
  filesWritten++

  return { vaultPath, filesWritten, exportedAt: new Date().toISOString() }
}
