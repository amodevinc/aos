'use client'

import { useState } from 'react'
import type { Contact, ContactTier, RelationshipType, Pillar } from '@/types'
import { PILLARS, PILLAR_META, generateId, cn } from '@/lib/utils'
import {
  RELATIONSHIP_LABELS,
  TIER_META,
  defaultFrequency,
} from '@/lib/scoring/crm'

interface ContactFormProps {
  initial?: Contact
  onSave: (c: Contact) => void
  onCancel: () => void
}

const RELATIONSHIP_TYPES: RelationshipType[] = [
  'mentor', 'peer', 'collaborator', 'investor', 'advisor', 'client', 'connector', 'other',
]

const defaultContact = (): Omit<Contact, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: '', role: '', company: '', relationship: 'peer', tier: 2,
  pillarRelevance: [], email: '', linkedin: '', phone: '',
  met: '', metVia: '', location: '', bio: '', notes: '', tags: [],
  whatICanOffer: '', whatTheyCanOffer: '',
  lastContactDate: '', nextContactDate: '',
  touchFrequencyDays: 45, status: 'active',
})

export function ContactForm({ initial, onSave, onCancel }: ContactFormProps) {
  const [f, setF] = useState<Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>>(
    initial
      ? { ...initial }
      : defaultContact()
  )
  const [tagInput, setTagInput] = useState('')

  const set = (key: keyof typeof f, val: unknown) =>
    setF((prev) => ({ ...prev, [key]: val }))

  const togglePillar = (p: Pillar) => {
    const cur = f.pillarRelevance
    set('pillarRelevance', cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p])
  }

  const addTag = () => {
    if (!tagInput.trim()) return
    set('tags', [...f.tags, tagInput.trim()])
    setTagInput('')
  }

  const handleTierChange = (tier: ContactTier) => {
    setF((prev) => ({ ...prev, tier, touchFrequencyDays: defaultFrequency(tier) }))
  }

  const handleSave = () => {
    if (!f.name.trim()) return
    const now = new Date().toISOString()
    onSave({
      ...f,
      id: initial?.id ?? generateId(),
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    })
  }

  const field = (label: string, key: keyof typeof f, placeholder = '', type = 'text') => (
    <div>
      <label className="mb-1 block text-xs font-medium text-[#6b6b88]">{label}</label>
      <input
        type={type}
        value={f[key] as string}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#e8e8f0] placeholder-[#3a3a55] outline-none focus:border-indigo-500/50"
      />
    </div>
  )

  const textarea = (label: string, key: keyof typeof f, placeholder = '', rows = 2) => (
    <div>
      <label className="mb-1 block text-xs font-medium text-[#6b6b88]">{label}</label>
      <textarea
        value={f[key] as string}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#e8e8f0] placeholder-[#3a3a55] outline-none focus:border-indigo-500/50"
      />
    </div>
  )

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-[#111116] p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">
        {initial ? 'Edit Contact' : 'Add Contact'}
      </h3>

      <div className="space-y-5">
        {/* Core identity */}
        <div className="grid gap-3 sm:grid-cols-3">
          {field('Name *', 'name', 'Full name…')}
          {field('Role', 'role', 'Title / what they do…')}
          {field('Company', 'company', 'Organisation…')}
        </div>

        {/* Classification */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium text-[#6b6b88]">Tier</label>
            <div className="flex gap-2">
              {([1, 2, 3] as ContactTier[]).map((t) => (
                <button
                  key={t}
                  onClick={() => handleTierChange(t)}
                  className={cn(
                    'flex-1 rounded-lg border py-2 text-xs font-semibold transition-all',
                    f.tier === t
                      ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300'
                      : 'border-[#1e1e2a] text-[#5a5a75] hover:text-[#a0a0c0]'
                  )}
                >
                  {TIER_META[t].label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-[#3a3a50]">{TIER_META[f.tier].description}</p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[#6b6b88]">Relationship</label>
            <select
              value={f.relationship}
              onChange={(e) => set('relationship', e.target.value as RelationshipType)}
              className="w-full rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#e8e8f0] outline-none focus:border-indigo-500/50"
            >
              {RELATIONSHIP_TYPES.map((r) => (
                <option key={r} value={r}>{RELATIONSHIP_LABELS[r]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Pillar relevance */}
        <div>
          <label className="mb-2 block text-xs font-medium text-[#6b6b88]">Pillar Relevance</label>
          <div className="flex flex-wrap gap-1.5">
            {PILLARS.map((p) => {
              const meta = PILLAR_META[p]
              const active = f.pillarRelevance.includes(p)
              return (
                <button
                  key={p}
                  onClick={() => togglePillar(p)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-all',
                    active
                      ? cn(meta.bg, meta.color, 'ring-1', meta.ring)
                      : 'bg-[#1a1a22] text-[#5a5a75] hover:text-[#a0a0c0]'
                  )}
                >
                  {meta.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Contact info */}
        <div className="grid gap-3 sm:grid-cols-3">
          {field('Email', 'email', 'email@example.com')}
          {field('LinkedIn', 'linkedin', 'linkedin.com/in/…')}
          {field('Phone', 'phone', '+1 …')}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {field('Met (date)', 'met', '', 'date')}
          {field('Met via', 'metVia', 'Conference, intro, online…')}
          {field('Location', 'location', 'City, Country')}
        </div>

        {/* Profile */}
        {textarea('Bio', 'bio', 'Who are they, what makes them notable…', 2)}

        <div className="grid gap-3 sm:grid-cols-2">
          {textarea('What I can offer them', 'whatICanOffer', 'Skills, connections, value…', 2)}
          {textarea('What they can offer me', 'whatTheyCanOffer', 'Knowledge, connections, opportunities…', 2)}
        </div>

        {/* Cadence */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#6b6b88]">
              Touch frequency — every {f.touchFrequencyDays} days
            </label>
            <input
              type="range"
              min={7}
              max={180}
              step={7}
              value={f.touchFrequencyDays}
              onChange={(e) => set('touchFrequencyDays', Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="mt-1 flex justify-between text-[10px] text-[#3a3a50]">
              <span>1 week</span><span>6 months</span>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#6b6b88]">Status</label>
            <select
              value={f.status}
              onChange={(e) => set('status', e.target.value)}
              className="w-full rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#e8e8f0] outline-none"
            >
              <option value="active">Active</option>
              <option value="prospect">Prospect (want to meet)</option>
              <option value="dormant">Dormant</option>
            </select>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#6b6b88]">Tags</label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {f.tags.map((tag, i) => (
              <span key={i} className="flex items-center gap-1 rounded-md border border-[#1e1e2a] bg-[#0a0a0c] px-2 py-0.5 text-xs text-[#c0c0d8]">
                {tag}
                <button onClick={() => set('tags', f.tags.filter((_, j) => j !== i))} className="text-[#4a4a60] hover:text-red-400">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
              placeholder="Add tag…"
              className="flex-1 rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-1.5 text-sm text-[#e8e8f0] placeholder-[#3a3a55] outline-none focus:border-indigo-500/50"
            />
            <button onClick={addTag} className="rounded-lg bg-[#1a1a22] px-3 text-xs font-medium text-indigo-400 hover:bg-[#22223a]">Add</button>
          </div>
        </div>

        {/* Notes */}
        {textarea('Notes', 'notes', 'Private ongoing notes…', 3)}

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={!f.name.trim()}
            className="flex-1 rounded-lg bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors disabled:opacity-40"
          >
            {initial ? 'Update Contact' : 'Add Contact'}
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg border border-[#1e1e2a] px-4 text-sm text-[#6b6b88] hover:text-[#a0a0c0] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
