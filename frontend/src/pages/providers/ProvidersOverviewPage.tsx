import { useState, useEffect } from 'react'
import api from '../../lib/api'
import type { ProviderOut, MasterKeyOut } from '../../types'

export default function ProvidersOverviewPage() {
  const [providers, setProviders] = useState<ProviderOut[]>([])
  const [masterKeys, setMasterKeys] = useState<MasterKeyOut[]>([])
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
      setError(err?.response?.data?.detail || 'Failed to load providers data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadData() }, [])

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-8 py-12">
        <div className="flex flex-col items-center justify-center space-y-4 py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-600" />
          <p className="text-sm font-medium text-slate-500">Loading providers telemetry...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-10 space-y-8 bg-slate-50">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Providers Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor your configured LLM and cloud providers, rate limits, and credentials status.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 font-medium">
          {error}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        {providers.map((p) => {
          const mkCount = masterKeys.filter((k) => k.provider_id === p.id).length
          return (
            <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5 relative overflow-hidden group hover:border-slate-350 transition duration-300 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-slate-900 text-base">{p.display_name}</p>
                  <p className="text-2xs font-mono text-slate-500 mt-0.5 max-w-[200px] truncate">{p.base_url}</p>
                </div>
                <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-3xs font-extrabold uppercase text-slate-650 tracking-wider">
                  Active
                </span>
              </div>
              <div className="mt-4 flex gap-2 text-3xs font-bold">
                <span className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1 text-slate-600">RPM: {p.rate_limit_rpm}</span>
                <span className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1 text-slate-600">TPM: {p.rate_limit_tpm.toLocaleString()}</span>
              </div>
              <p className="mt-4 text-xs font-bold text-indigo-600">
                {mkCount} master key{mkCount !== 1 ? 's' : ''} configured
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
