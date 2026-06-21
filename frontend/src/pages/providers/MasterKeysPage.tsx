import { useState, useEffect } from 'react'
import api from '../../lib/api'
import type { ProviderOut, MasterKeyOut } from '../../types'
import { formatCost } from '../DashboardPage'

export default function MasterKeysPage() {
  const [providers, setProviders] = useState<ProviderOut[]>([])
  const [masterKeys, setMasterKeys] = useState<MasterKeyOut[]>([])
  const [selectedProvider, setSelectedProvider] = useState<number | ''>('')
  const [masterKeyValue, setMasterKeyValue] = useState('')
  const [masterKeyName, setMasterKeyName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [p, m] = await Promise.all([
        api.get<ProviderOut[]>('/providers/'),
        api.get<MasterKeyOut[]>('/master-keys/'),
      ])
      setProviders(p.data)
      setMasterKeys(m.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load master keys data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadData() }, [])

  const addMasterKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/master-keys/', {
        provider_id: Number(selectedProvider),
        raw_key: masterKeyValue,
        name: masterKeyName || 'Default',
      })
      setMasterKeyValue('')
      setMasterKeyName('')
      setSelectedProvider('')
      await loadData()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to add master key')
    }
  }

  const revokeMaster = async (id: number) => {
    if (!confirm('Revoke this master key?')) return
    try {
      await api.delete(`/master-keys/${id}`)
      await loadData()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to revoke')
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-8 py-12">
        <div className="flex flex-col items-center justify-center space-y-4 py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-600" />
          <p className="text-sm font-medium text-slate-500">Loading master credentials...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-10 space-y-8 bg-slate-50">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Master Credentials</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure real provider API keys. These keys are Fernet-encrypted at rest and never shown back.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 font-medium">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form Column */}
        <section className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm h-fit">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Add Master Key</h3>
          <p className="text-xs text-slate-500 mb-4">
            Upload a master credential for a provider.
          </p>
          <form onSubmit={addMasterKey} className="space-y-4">
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-cyan-500 outline-none transition"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value ? Number(e.target.value) : '')}
              required
            >
              <option value="">Select Provider</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.display_name}</option>
              ))}
            </select>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-500 outline-none transition"
              placeholder="API Key (e.g. sk-proj-...)"
              value={masterKeyValue}
              onChange={(e) => setMasterKeyValue(e.target.value)}
              type="password"
              required
            />
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-500 outline-none transition"
              placeholder="Key label (optional)"
              value={masterKeyName}
              onChange={(e) => setMasterKeyName(e.target.value)}
            />
            <button className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-650 py-3 text-xs font-semibold text-white shadow-md shadow-emerald-600/10 hover:brightness-105 active:scale-[0.99] transition duration-200">
              Configure Master Key
            </button>
          </form>
        </section>

        {/* List Column */}
        <section className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Configured Master Credentials</h3>
            <div className="space-y-4">
              {providers.map((p) => {
                const pMasterKeys = masterKeys.filter(k => k.provider_id === p.id)
                if (pMasterKeys.length === 0) return null

                return (
                  <div key={p.id} className="border-b border-slate-100 last:border-0 pb-6 last:pb-0">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-sm text-slate-800 uppercase tracking-wide">{p.display_name}</span>
                      <span className="rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-3xs font-bold text-slate-500">
                        {pMasterKeys.length} configured
                      </span>
                    </div>
                    <div className="space-y-2">
                      {pMasterKeys.map((k) => (
                        <div key={k.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 hover:border-slate-300 transition">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{k.name}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-slate-500">
                                <span className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">{k.key_prefix}...</span>
                                <span>•</span>
                                <span>{k.total_requests.toLocaleString()} reqs</span>
                                <span>•</span>
                                <span className="text-cyan-600 font-bold">{formatCost(k.total_cost_usd)} spent</span>
                              </div>
                            </div>
                            <button
                              onClick={() => revokeMaster(k.id)}
                              className="rounded-lg bg-rose-50 border border-rose-100 text-rose-600 px-3 py-1 text-xs font-bold hover:bg-rose-500 hover:text-white transition duration-200"
                            >
                              Revoke
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {masterKeys.length === 0 && (
                <p className="text-xs text-slate-400 py-8 text-center border border-dashed border-slate-200 rounded-xl">
                  No master credentials configured yet. Add a key using the form on the left.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
