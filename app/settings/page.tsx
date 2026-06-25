'use client'

import { useEffect, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  Download, Upload, RotateCcw, Brain, Eye, EyeOff, Terminal, Shield, Pencil, Check, X, Trash2,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { settingsStorage, exportAll, importAll, resetAll } from '@/lib/storage'
import { apiKeyStorage } from '@/lib/ai/storage'
import { useToast } from '@/lib/hooks/useToast'
import { parseError } from '@/lib/utils/errors'
import type { AppSettings, AppStore } from '@/types'
import { cn } from '@/lib/utils'

interface CliDevice {
  id: string
  device_label: string
  last_used_at: string | null
  created_at: string
}

function formatDeviceTime(iso: string | null, fallback: string): string {
  if (!iso) return fallback
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true })
  } catch {
    return fallback
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({ theme: 'dark', userName: 'Alain' })
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [keySaved, setKeySaved] = useState(false)
  const [cliDevices, setCliDevices] = useState<CliDevice[]>([])
  const [cliLoading, setCliLoading] = useState(true)
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const toast = useToast()

  const loadCliDevices = async () => {
    setCliLoading(true)
    try {
      const res = await fetch('/api/cli/status')
      const data = await res.json() as { devices?: CliDevice[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to load devices')
      setCliDevices(data.devices ?? [])
    } catch (err) {
      toast.error('Failed to load devices', parseError(err))
    } finally {
      setCliLoading(false)
    }
  }

  useEffect(() => {
    settingsStorage.get()
      .then(setSettings)
      .catch((err) => toast.error('Failed to load settings', parseError(err)))
    setApiKey(apiKeyStorage.get())
    loadCliDevices().catch(() => {})
  }, [])

  const saveApiKey = () => {
    apiKeyStorage.set(apiKey)
    setKeySaved(true)
    toast.success('API key saved')
    setTimeout(() => setKeySaved(false), 2000)
  }

  const clearApiKey = () => {
    apiKeyStorage.clear()
    setApiKey('')
    toast.info('API key cleared')
  }

  const updateSettings = async (patch: Partial<AppSettings>) => {
    const updated = { ...settings, ...patch }
    setSettings(updated)
    try {
      await settingsStorage.save(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      toast.error('Failed to save settings', parseError(err))
    }
  }

  const handleExport = async () => {
    try {
      const data = await exportAll()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `aos-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Data exported')
    } catch (err) {
      toast.error('Export failed', parseError(err))
    }
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as AppStore
        await importAll(data)
        toast.success('Data imported successfully')
      } catch (err) {
        toast.error('Import failed', parseError(err))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleReset = async () => {
    if (!confirm('Reset all data? This cannot be undone.')) return
    try {
      await resetAll()
      window.location.reload()
    } catch (err) {
      toast.error('Reset failed', parseError(err))
    }
  }

  const startEditDevice = (device: CliDevice) => {
    setEditingDeviceId(device.id)
    setEditLabel(device.device_label)
  }

  const cancelEditDevice = () => {
    setEditingDeviceId(null)
    setEditLabel('')
  }

  const saveDeviceLabel = async (id: string) => {
    const label = editLabel.trim()
    if (!label) {
      toast.error('Device name cannot be empty')
      return
    }
    try {
      const res = await fetch(`/api/cli/tokens/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceLabel: label }),
      })
      const body = await res.json() as { device?: CliDevice; error?: string }
      if (!res.ok) throw new Error(body.error ?? 'Rename failed')
      setCliDevices((prev) => prev.map((d) => (d.id === id ? { ...d, ...body.device! } : d)))
      cancelEditDevice()
      toast.success('Device renamed')
    } catch (err) {
      toast.error('Rename failed', parseError(err))
    }
  }

  const revokeDevice = async (device: CliDevice) => {
    const confirmed = confirm(
      `Revoke access for "${device.device_label}"?\n\nThat device will stop syncing immediately. Re-run npm run aos:install on it to reconnect.`
    )
    if (!confirmed) return

    setRevokingId(device.id)
    try {
      const res = await fetch(`/api/cli/tokens/${device.id}`, { method: 'DELETE' })
      const body = await res.json() as { error?: string }
      if (!res.ok) throw new Error(body.error ?? 'Revoke failed')
      setCliDevices((prev) => prev.filter((d) => d.id !== device.id))
      if (editingDeviceId === device.id) cancelEditDevice()
      toast.success('Device access revoked')
    } catch (err) {
      toast.error('Revoke failed', parseError(err))
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure your operating system"
      />

      <div className="max-w-xl space-y-6">
        {/* AI */}
        <section className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Brain className="h-4 w-4 text-indigo-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-400/70">
              AI Coach
            </h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#6b6b88]">
                Anthropic API Key
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    className="w-full rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-2 pr-9 text-sm font-mono text-[#e8e8f0] placeholder-[#3a3a55] outline-none focus:border-indigo-500/50"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#4a4a60] hover:text-[#8080a0] transition-colors"
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <button
                  onClick={saveApiKey}
                  disabled={!apiKey.startsWith('sk-ant-')}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-all',
                    keySaved
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 ring-1 ring-indigo-500/20 disabled:opacity-40'
                  )}
                >
                  {keySaved ? '✓' : 'Save'}
                </button>
                {apiKey && (
                  <button
                    onClick={clearApiKey}
                    className="rounded-lg border border-[#1e1e2a] px-3 py-2 text-sm text-[#5a5a75] hover:text-red-400 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-[10px] text-[#3a3a50]">
                Stored in your browser only. Used for AI Coach, insights, and decision analysis.
              </p>
            </div>
          </div>
        </section>

        {/* Terminal & sync */}
        <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-400/70">
              Terminal &amp; Claude Code
            </h2>
          </div>
          <p className="mb-3 text-xs text-[#6b6b88]">
            One command connects this Mac, syncs your vault, and keeps it updated in the background.
          </p>
          <div className="mb-4 rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-4 py-3 font-mono text-xs text-[#8080a0]">
            npm run aos:install
          </div>
          <p className="text-xs text-[#5a5a75]">
            Authorizes your machine, syncs <code className="text-[#8080a0]">~/vault/aos/</code>, and installs
            background sync (every 15 min). Check with{' '}
            <code className="text-[#8080a0]">npm run aos:status</code>.
          </p>

          <div className="mt-4 border-t border-[#1e1e2a] pt-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#4a4a60]">
              Authorized devices
            </p>

            {cliLoading ? (
              <p className="text-xs text-[#5a5a75]">Loading devices…</p>
            ) : cliDevices.length === 0 ? (
              <p className="text-xs text-[#5a5a75]">No devices connected yet.</p>
            ) : (
              <ul className="space-y-2">
                {cliDevices.map((device) => (
                  <li
                    key={device.id}
                    className="rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      {editingDeviceId === device.id ? (
                        <div className="flex min-w-0 flex-1 items-center gap-1.5">
                          <input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            maxLength={64}
                            className="min-w-0 flex-1 rounded border border-[#1e1e2a] bg-[#111116] px-2 py-1 text-xs text-[#e8e8f0] outline-none focus:border-emerald-500/50"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveDeviceLabel(device.id)
                              if (e.key === 'Escape') cancelEditDevice()
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => saveDeviceLabel(device.id)}
                            className="rounded p-1 text-emerald-400 hover:bg-emerald-500/10"
                            aria-label="Save name"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={cancelEditDevice}
                            className="rounded p-1 text-[#5a5a75] hover:bg-[#1a1a22]"
                            aria-label="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[#e8e8f0]">{device.device_label}</p>
                          <p className="mt-0.5 text-[10px] text-[#5a5a75]">
                            Added {formatDeviceTime(device.created_at, 'unknown')}
                            {' · '}
                            Last active {formatDeviceTime(device.last_used_at, 'never')}
                          </p>
                        </div>
                      )}

                      {editingDeviceId !== device.id && (
                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            onClick={() => startEditDevice(device)}
                            className="rounded p-1.5 text-[#5a5a75] hover:bg-[#1a1a22] hover:text-[#8080a0] transition-colors"
                            aria-label={`Rename ${device.device_label}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => revokeDevice(device)}
                            disabled={revokingId === device.id}
                            className="rounded p-1.5 text-[#5a5a75] hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-40"
                            aria-label={`Revoke ${device.device_label}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex gap-2 rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-3 py-2.5">
              <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400/80" />
              <div className="text-[10px] leading-relaxed text-[#6b6b88]">
                <p className="font-medium text-emerald-400/90">Security</p>
                <p className="mt-1">
                  Each device holds a private token in <code className="text-[#8080a0]">~/.config/aos/</code>.
                  Revoke any device you no longer use or if a machine is lost. MCP runs locally only — never expose
                  tokens to cloud connectors. See <code className="text-[#8080a0]">SECURITY.md</code> for the full checklist.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Profile */}
        <section className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#4a4a60]">
            Profile
          </h2>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#6b6b88]">Name</label>
            <input
              value={settings.userName}
              onChange={(e) => updateSettings({ userName: e.target.value })}
              className="w-full rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#e8e8f0] outline-none focus:border-indigo-500/50"
            />
          </div>
          {saved && (
            <p className="mt-2 text-xs text-emerald-400">Saved.</p>
          )}
        </section>

        {/* Data management */}
        <section className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#4a4a60]">
            Data
          </h2>
          <div className="space-y-3">
            {/* Export */}
            <div className="flex items-center justify-between rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[#e8e8f0]">Export Data</p>
                <p className="text-xs text-[#5a5a75]">Download all your data as JSON</p>
              </div>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-500/15 px-3 py-1.5 text-xs font-medium text-indigo-400 hover:bg-indigo-500/25 transition-colors ring-1 ring-indigo-500/20"
              >
                <Download className="h-3.5 w-3.5" /> Export
              </button>
            </div>

            {/* Import */}
            <div className="flex items-center justify-between rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[#e8e8f0]">Import Data</p>
                <p className="text-xs text-[#5a5a75]">Restore from a JSON backup</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg bg-[#1a1a22] px-3 py-1.5 text-xs font-medium text-[#8080a0] hover:text-[#c0c0d8] transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" /> Import
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </div>
            </div>

            {/* Reset */}
            <div className="flex items-center justify-between rounded-lg border border-red-500/10 bg-red-500/5 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[#e8e8f0]">Reset All Data</p>
                <p className="text-xs text-[#5a5a75]">Permanently delete everything. Cannot be undone.</p>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/25 transition-colors ring-1 ring-red-500/20"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#4a4a60]">About</h2>
          <div className="space-y-1 text-xs text-[#5a5a75]">
            <p>AOS — Alain Operating System</p>
            <p>Version 1.0.0</p>
            <p>Data stored in Supabase with row-level security. AI API key stored in your browser only.</p>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-[#4a4a60]">V2 Roadmap</p>
            <ul className="space-y-1 text-xs text-[#4a4a60]">
              {[
                'AI Coach (pattern detection + weekly coaching)',
                'AI Review Engine (automated daily analysis)',
                'Personal CRM (relationship tracking)',
                'Knowledge Vault (notes + reading system)',
                'Learning System (structured skill building)',
                'Wealth Tracker (income, expenses, net worth)',
                'Mobile app (iOS/Android)',
                'Supabase sync (multi-device)',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-[#3a3a50]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}
