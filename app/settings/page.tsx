'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Upload, RotateCcw, Brain, Eye, EyeOff } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { settingsStorage, exportAll, importAll, resetAll } from '@/lib/storage'
import { apiKeyStorage } from '@/lib/ai/storage'
import type { AppSettings, AppStore } from '@/types'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({ theme: 'dark', userName: 'Alain' })
  const [saved, setSaved] = useState(false)
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const fileRef = useRef<HTMLInputElement>(null)
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [keySaved, setKeySaved] = useState(false)

  useEffect(() => {
    settingsStorage.get().then(setSettings)
    setApiKey(apiKeyStorage.get())
  }, [])

  const saveApiKey = () => {
    apiKeyStorage.set(apiKey)
    setKeySaved(true)
    setTimeout(() => setKeySaved(false), 2000)
  }

  const clearApiKey = () => {
    apiKeyStorage.clear()
    setApiKey('')
  }

  const updateSettings = async (patch: Partial<AppSettings>) => {
    const updated = { ...settings, ...patch }
    setSettings(updated)
    await settingsStorage.save(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const handleExport = async () => {
    const data = await exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aos-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as AppStore
        await importAll(data)
        setImportStatus('success')
        setTimeout(() => setImportStatus('idle'), 3000)
      } catch {
        setImportStatus('error')
        setTimeout(() => setImportStatus('idle'), 3000)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleReset = async () => {
    if (!confirm('Reset all data? This cannot be undone.')) return
    await resetAll()
    window.location.reload()
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
                {importStatus === 'success' && (
                  <span className="text-xs text-emerald-400">Imported ✓</span>
                )}
                {importStatus === 'error' && (
                  <span className="text-xs text-red-400">Invalid file</span>
                )}
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
            <p>Version 1.0.0 — MVP</p>
            <p>All data stored locally in your browser. No servers. No tracking.</p>
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
