'use client'

import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/layout/StatCard'
import { ContactCard } from '@/components/crm/ContactCard'
import { ContactForm } from '@/components/crm/ContactForm'
import { TouchQueue } from '@/components/crm/TouchQueue'
import { contactStorage } from '@/lib/storage'
import { useToast } from '@/lib/hooks/useToast'
import { parseError } from '@/lib/utils/errors'
import {
  networkHealthScore,
  getTouchQueue,
  TIER_META,
  RELATIONSHIP_LABELS,
} from '@/lib/scoring/crm'
import { PILLARS, PILLAR_META, cn } from '@/lib/utils'
import type { Contact, ContactTier, Pillar } from '@/types'

type FilterTier = ContactTier | 'all'
type FilterStatus = 'all' | 'active' | 'prospect' | 'dormant'

export default function CRMPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [filterTier, setFilterTier] = useState<FilterTier>('all')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterPillar, setFilterPillar] = useState<Pillar | 'all'>('all')

  const toast = useToast()

  const load = async () => {
    try {
      setContacts(await contactStorage.getAll())
    } catch (err) {
      toast.error('Failed to load contacts', parseError(err))
    }
  }
  useEffect(() => { load() }, [])

  const touchQueue = getTouchQueue(contacts)
  const avgHealth = networkHealthScore(contacts)
  const tier1Count = contacts.filter((c) => c.tier === 1).length
  const activeCount = contacts.filter((c) => c.status === 'active').length

  const filtered = contacts.filter((c) => {
    if (filterTier !== 'all' && c.tier !== filterTier) return false
    if (filterStatus !== 'all' && c.status !== filterStatus) return false
    if (filterPillar !== 'all' && !c.pillarRelevance.includes(filterPillar)) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        c.name.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    return true
  })

  const handleSave = async (c: Contact) => {
    try {
      await contactStorage.save(c)
      load()
      setShowForm(false)
      toast.success('Contact saved')
    } catch (err) {
      toast.error('Failed to save contact', parseError(err))
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await contactStorage.delete(id)
      load()
    } catch (err) {
      toast.error('Failed to delete contact', parseError(err))
    }
  }

  return (
    <div>
      <PageHeader
        title="Network"
        subtitle="Relationships compound. Track them like investments."
        action={
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Contact
          </button>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Contacts" value={contacts.length} />
        <StatCard label="Active" value={activeCount} />
        <StatCard label="Tier 1" value={tier1Count} accent="text-indigo-400" />
        <StatCard
          label="Network Health"
          value={avgHealth}
          accent={avgHealth >= 70 ? 'text-emerald-400' : avgHealth >= 40 ? 'text-yellow-400' : 'text-red-400'}
        />
      </div>

      {/* Touch queue */}
      {touchQueue.length > 0 && (
        <div className="mb-6">
          <TouchQueue contacts={touchQueue} />
        </div>
      )}

      {/* New contact form */}
      {showForm && (
        <div className="mb-6">
          <ContactForm
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Filters + search */}
      <div className="mb-4 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#4a4a60]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, role, company, tag…"
            className="w-full rounded-lg border border-[#1e1e2a] bg-[#111116] py-2 pl-9 pr-4 text-sm text-[#e8e8f0] placeholder-[#3a3a55] outline-none focus:border-indigo-500/50"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Tier filter */}
          <div className="flex gap-1 rounded-lg border border-[#1e1e2a] bg-[#111116] p-1">
            {(['all', 1, 2, 3] as FilterTier[]).map((t) => (
              <button
                key={t}
                onClick={() => setFilterTier(t)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-all',
                  filterTier === t ? 'bg-[#1e1e2a] text-white' : 'text-[#5a5a75] hover:text-[#a0a0c0]'
                )}
              >
                {t === 'all' ? 'All Tiers' : TIER_META[t as number].label}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex gap-1 rounded-lg border border-[#1e1e2a] bg-[#111116] p-1">
            {(['all', 'active', 'prospect', 'dormant'] as FilterStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-all capitalize',
                  filterStatus === s ? 'bg-[#1e1e2a] text-white' : 'text-[#5a5a75] hover:text-[#a0a0c0]'
                )}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>

          {/* Pillar filter */}
          <div className="flex gap-1 rounded-lg border border-[#1e1e2a] bg-[#111116] p-1">
            <button
              onClick={() => setFilterPillar('all')}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-all',
                filterPillar === 'all' ? 'bg-[#1e1e2a] text-white' : 'text-[#5a5a75] hover:text-[#a0a0c0]'
              )}
            >
              All Pillars
            </button>
            {PILLARS.map((p) => (
              <button
                key={p}
                onClick={() => setFilterPillar(p)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-all',
                  filterPillar === p
                    ? cn('bg-[#1e1e2a]', PILLAR_META[p].color)
                    : 'text-[#5a5a75] hover:text-[#a0a0c0]'
                )}
              >
                {PILLAR_META[p].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contact list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-10 text-center">
            <p className="text-sm text-[#4a4a60]">
              {contacts.length === 0
                ? 'No contacts yet. Add the people who matter most to your mission.'
                : 'No contacts match the current filter.'}
            </p>
          </div>
        )}
        {filtered.map((c) => (
          <ContactCard key={c.id} contact={c} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  )
}
