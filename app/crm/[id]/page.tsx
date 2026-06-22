'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, ExternalLink, Mail, Phone } from 'lucide-react'
import Link from 'next/link'
import { ContactForm } from '@/components/crm/ContactForm'
import { InteractionForm } from '@/components/crm/InteractionForm'
import { contactStorage, interactionStorage } from '@/lib/storage'
import {
  computeRelationshipHealth,
  daysUntilDue,
  healthColor,
  healthBg,
  TIER_META,
  RELATIONSHIP_LABELS,
  SENTIMENT_META,
} from '@/lib/scoring/crm'
import { PILLAR_META, formatDate, todayISO, cn } from '@/lib/utils'
import type { Contact, Interaction } from '@/types'

export default function ContactPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [contact, setContact] = useState<Contact | null>(null)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [editing, setEditing] = useState(false)
  const [showLog, setShowLog] = useState(false)

  const load = async () => {
    const [c, ints] = await Promise.all([
      contactStorage.getById(id),
      interactionStorage.getByContact(id),
    ])
    if (!c) { router.push('/crm'); return }
    setContact(c)
    setInteractions(ints)
  }

  useEffect(() => { load() }, [id])

  const handleSaveContact = async (updated: Contact) => {
    await contactStorage.save(updated)
    setContact(updated)
    setEditing(false)
  }

  const handleLogInteraction = async (i: Interaction) => {
    await interactionStorage.save(i)
    // Update contact's lastContactDate to today
    if (contact && i.date >= (contact.lastContactDate || '')) {
      const updated = { ...contact, lastContactDate: i.date, updatedAt: new Date().toISOString() }
      await contactStorage.save(updated)
      setContact(updated)
    }
    setShowLog(false)
    load()
  }

  const handleDeleteInteraction = async (iid: string) => {
    if (!confirm('Delete this interaction?')) return
    await interactionStorage.delete(iid)
    load()
  }

  if (!contact) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  const health = computeRelationshipHealth(contact)
  const due = daysUntilDue(contact)
  const isProspect = contact.status === 'prospect'

  if (editing) {
    return (
      <div>
        <button onClick={() => setEditing(false)} className="mb-4 flex items-center gap-1.5 text-sm text-[#6b6b88] hover:text-[#c0c0d8]">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <ContactForm initial={contact} onSave={handleSaveContact} onCancel={() => setEditing(false)} />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        <Link href="/crm" className="mt-1 rounded-md p-1.5 text-[#4a4a60] hover:text-[#c0c0d8] hover:bg-[#1a1a22] transition-all">
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-lg font-bold text-indigo-400 ring-1 ring-indigo-500/20">
              {contact.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-white">{contact.name}</h1>
                <span className={cn('text-xs font-bold', TIER_META[contact.tier].color)}>
                  {TIER_META[contact.tier].label}
                </span>
                <span className="rounded-full bg-[#1a1a22] px-2 py-0.5 text-[10px] font-medium text-[#6b6b88] capitalize">
                  {contact.status}
                </span>
              </div>
              <p className="text-sm text-[#5a5a75]">
                {[contact.role, contact.company].filter(Boolean).join(' · ')}
                {(contact.role || contact.company) && ' · '}
                {RELATIONSHIP_LABELS[contact.relationship]}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 rounded-lg border border-[#1e1e2a] px-3 py-1.5 text-xs text-[#6b6b88] hover:text-[#c0c0d8] transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — profile */}
        <div className="space-y-5 lg:col-span-1">
          {/* Health score */}
          {!isProspect && (
            <div className={cn('rounded-xl border p-4', healthBg(health), 'border-[#1e1e2a]')}>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#4a4a60]">
                Relationship Health
              </p>
              <div className="flex items-end gap-2">
                <span className={cn('text-3xl font-bold', healthColor(health))}>{health}</span>
                <span className="mb-0.5 text-xs text-[#5a5a75]">
                  {!contact.lastContactDate
                    ? 'Never contacted'
                    : due < 0
                    ? `${Math.abs(due)} days overdue`
                    : due === 0
                    ? 'Due today'
                    : `${due} days until due`}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-[#4a4a60]">
                Target: every {contact.touchFrequencyDays} days
                {contact.lastContactDate && ` · Last: ${formatDate(contact.lastContactDate)}`}
              </p>
            </div>
          )}

          {/* Contact info */}
          <div className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-4 space-y-3">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-[#8080a0] hover:text-indigo-400 transition-colors">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                {contact.email}
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm text-[#8080a0] hover:text-indigo-400 transition-colors">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                {contact.phone}
              </a>
            )}
            {contact.linkedin && (
              <a href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`} target="_blank" rel="noopener" className="flex items-center gap-2 text-sm text-[#8080a0] hover:text-indigo-400 transition-colors">
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                LinkedIn
              </a>
            )}
            {contact.location && (
              <p className="text-sm text-[#5a5a75]">📍 {contact.location}</p>
            )}
            {contact.met && (
              <p className="text-xs text-[#4a4a60]">
                Met {formatDate(contact.met)}{contact.metVia ? ` via ${contact.metVia}` : ''}
              </p>
            )}
          </div>

          {/* Pillar relevance */}
          {contact.pillarRelevance.length > 0 && (
            <div className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#4a4a60]">Pillar Relevance</p>
              <div className="flex flex-wrap gap-1.5">
                {contact.pillarRelevance.map((p) => (
                  <span key={p} className={cn('rounded-md px-2 py-1 text-xs font-medium', PILLAR_META[p].bg, PILLAR_META[p].color)}>
                    {PILLAR_META[p].label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Value exchange */}
          {(contact.whatICanOffer || contact.whatTheyCanOffer) && (
            <div className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-4 space-y-3">
              {contact.whatICanOffer && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#4a4a60]">I can offer</p>
                  <p className="text-sm text-[#8080a0]">{contact.whatICanOffer}</p>
                </div>
              )}
              {contact.whatTheyCanOffer && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#4a4a60]">They can offer</p>
                  <p className="text-sm text-[#8080a0]">{contact.whatTheyCanOffer}</p>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map((tag, i) => (
                <span key={i} className="rounded-md border border-[#1e1e2a] bg-[#0a0a0c] px-2 py-0.5 text-xs text-[#6b6b88]">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right column — bio, notes, interactions */}
        <div className="space-y-5 lg:col-span-2">
          {/* Bio */}
          {contact.bio && (
            <div className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#4a4a60]">Bio</p>
              <p className="text-sm leading-relaxed text-[#a0a0c0]">{contact.bio}</p>
            </div>
          )}

          {/* Notes */}
          {contact.notes && (
            <div className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#4a4a60]">Notes</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#a0a0c0]">{contact.notes}</p>
            </div>
          )}

          {/* Interaction log */}
          <div className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#4a4a60]">
                Interaction History ({interactions.length})
              </p>
              <button
                onClick={() => setShowLog(!showLog)}
                className="rounded-lg bg-indigo-500/15 px-3 py-1 text-xs font-medium text-indigo-400 hover:bg-indigo-500/25 transition-colors ring-1 ring-indigo-500/20"
              >
                + Log
              </button>
            </div>

            {showLog && (
              <div className="mb-4">
                <InteractionForm
                  contactId={id}
                  onSave={handleLogInteraction}
                  onCancel={() => setShowLog(false)}
                />
              </div>
            )}

            {interactions.length === 0 ? (
              <p className="text-sm text-[#3a3a50]">
                No interactions logged yet. Log your first touchpoint above.
              </p>
            ) : (
              <div className="space-y-3">
                {interactions.map((i) => (
                  <div key={i.id} className="rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] p-3">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#e8e8f0]">{formatDate(i.date)}</span>
                        <span className="rounded-full bg-[#1a1a22] px-1.5 py-0.5 text-[9px] font-medium capitalize text-[#6b6b88]">
                          {i.type}
                        </span>
                        <span className={cn('text-[10px] font-semibold capitalize', SENTIMENT_META[i.sentiment]?.color)}>
                          {i.sentiment}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteInteraction(i.id)}
                        className="text-[#3a3a50] hover:text-red-400 transition-colors text-xs"
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-sm text-[#c0c0d8]">{i.summary}</p>
                    {i.keyInsight && (
                      <p className="mt-1 text-xs text-indigo-400/80 italic">"{i.keyInsight}"</p>
                    )}
                    {i.nextStep && (
                      <p className="mt-1 text-xs text-emerald-400/80">→ {i.nextStep}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
