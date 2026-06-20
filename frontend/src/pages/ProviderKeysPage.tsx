import { useState, useEffect } from 'react'
import api from '../lib/api'
import type { ProviderOut, MasterKeyOut, ChildKeyWithSecret, ChildKeySummary, Project } from '../types'

export default function ProviderKeysPage() {
  const [providers, setProviders] = useState<ProviderOut[]>([])
  const [masterKeys, setMasterKeys] = useState<MasterKeyOut[]>([])
  const [childKeys, setChildKeys] = useState<ChildKeyWithSecret[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [summaries, setSummaries] = useState<Record<number, ChildKeySummary>>({})
  
  // Form states
  const [selectedProvider, setSelectedProvider] = useState<number | ''>('')
  const [masterKeyValue, setMasterKeyValue] = useState('')
  const [masterKeyName, setMasterKeyName] = useState('')
  
  const [childProvider, setChildProvider] = useState<number | ''>('')
  const [childName, setChildName] = useState('')
  const [childLimit, setChildLimit] = useState(20)
  const [childExpires, setChildExpires] = useState('')
  const [childProjectId, setChildProjectId] = useState<number | ''>('')
  
  const [secretKey, setSecretKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [p, m, c, proj] = await Promise.all([
        api.get<ProviderOut[]>('/providers/'),
        api.get<MasterKeyOut[]>('/master-keys/'),
        api.get<ChildKeyWithSecret[]>('/child-keys/'),
        api.get<Project[]>('/projects/'),
      ])
      setProviders(p.data)
      setMasterKeys(m.data)
      setChildKeys(c.data)
      setProjects(proj.data)
      
      // Load summaries
      const sumMap: Record<number, ChildKeySummary> = {}
      await Promise.all(
        c.data.map(async (k) => {
          try {
            const r = await api.get(`/child-keys/${k.id}/summary`)
            sumMap[k.id] = r.data
          } catch { /* ignore */ }
        })
      )
      setSummaries(sumMap)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

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
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to add master key')
    }
  }

  const generateChildKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSecretKey('')
    setCopySuccess(false)
    try {
      const payload: any = {
        provider_id: Number(childProvider),
        name: childName,
        cost_limit_usd: childLimit,
      }
      if (childExpires) payload.expires_days = parseInt(childExpires)
      if (childProjectId) payload.project_id = Number(childProjectId)

      const { data } = await api.post<ChildKeyWithSecret>('/child-keys/', payload)
      setSecretKey(data.secret_key)
      setChildName('')
      setChildLimit(20)
      setChildExpires('')
      setChildProvider('')
      setChildProjectId('')
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to generate child key')
    }
  }

  const revokeMaster = async (id: number) => {
    if (!confirm('Revoke this master key?')) return
    try {
      await api.delete(`/master-keys/${id}`)
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to revoke')
    }
  }

  const revokeChild = async (id: number) => {
    if (!confirm('Revoke this child key?')) return
    try {
      await api.delete(`/child-keys/${id}`)
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to revoke')
    }
  }

  const getProviderName = (id: number) => {
    const p = providers.find((pr) => pr.id === id)
    return p ? p.display_name : 'Unknown'
  }

  const getProjectName = (id: number | null) => {
    if (id === null) return 'No Project'
    const proj = projects.find((pr) => pr.id === id)
    return proj ? proj.name : 'Unknown'
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(secretKey)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      /* ignore */
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col items-center justify-center space-y-4 py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-600" />
          <p className="text-sm font-medium text-slate-500">Loading keys and providers telemetry...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-8 bg-slate-55">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Provider & Key Management</h2>
        <p className="text-sm text-slate-500">
          Add real provider API credentials (master keys), then generate scoped child keys for projects and teams.
        </p>
      </div>

      {/* Secret Key Alert Banner */}
      {secretKey && (
        <div className="rounded-2xl border border-emerald-250 bg-emerald-50 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <p className="font-bold text-emerald-700 text-sm">New Child Secret Key Generated successfully:</p>
          </div>
          <p className="text-xs text-emerald-600/90 font-medium">
            Copy the key below immediately. For security reasons, you will not be able to view this key again.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2">
            <code className="flex-1 break-all rounded-xl bg-white px-4 py-3 text-xs text-emerald-750 font-mono border border-emerald-200">
              {secretKey}
            </code>
            <button
              onClick={handleCopy}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-xs font-semibold text-white hover:bg-emerald-550 active:scale-[0.98] transition shadow-md shadow-emerald-500/10"
            >
              {copySuccess ? 'Copied!' : 'Copy Key'}
            </button>
            <button
              onClick={() => setSecretKey('')}
              className="rounded-xl bg-white border border-slate-200 text-slate-600 px-5 py-3 text-xs font-semibold hover:text-slate-900 transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 font-medium">
          {error}
        </div>
      )}

      {/* Providers Grid */}
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

      {/* Forms Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Add Master Key Form */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Add Provider Master Key</h3>
          <p className="text-xs text-slate-500 mb-4">
            Upload your provider credential. Keys are Fernet-encrypted at rest.
          </p>
          <form onSubmit={addMasterKey} className="space-y-4">
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:border-cyan-500 outline-none transition"
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

        {/* Generate Child Key Form */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Generate Scoped Child Key</h3>
          <p className="text-xs text-slate-500 mb-4">
            Create limited-access tokens routing requests securely through master credentials.
          </p>
          <form onSubmit={generateChildKey} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <select
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:border-cyan-500 outline-none transition"
                value={childProvider}
                onChange={(e) => setChildProvider(e.target.value ? Number(e.target.value) : '')}
                required
              >
                <option value="">Select Provider</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.display_name}</option>
                ))}
              </select>
              
              <select
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:border-cyan-500 outline-none transition"
                value={childProjectId}
                onChange={(e) => setChildProjectId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Associate Project (Optional)</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>{proj.name}</option>
                ))}
              </select>
            </div>

            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-450 focus:border-cyan-500 outline-none transition"
              placeholder="Key label (e.g. dev-internal-testing)"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              required
            />
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-3xs font-bold uppercase tracking-wider text-slate-500 px-1">Cost Limit ($)</label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-cyan-500 outline-none transition"
                  value={childLimit}
                  onChange={(e) => setChildLimit(Number(e.target.value))}
                  min={0.01}
                  step={0.01}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-3xs font-bold uppercase tracking-wider text-slate-500 px-1">Expires in days (Optional)</label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-cyan-500 outline-none transition"
                  placeholder="Never expires"
                  value={childExpires}
                  onChange={(e) => setChildExpires(e.target.value)}
                  min={1}
                />
              </div>
            </div>

            <button className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-650 py-3 text-xs font-semibold text-white shadow-lg shadow-cyan-600/10 hover:brightness-105 active:scale-[0.99] transition duration-200">
              Generate Child Key
            </button>
          </form>
        </section>
      </div>

      {/* Master Keys List */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Configured Master Credentials</h3>
        <div className="space-y-3">
          {masterKeys.map((k) => (
            <div key={k.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 hover:border-slate-350 transition">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800">{k.name}</p>
                    <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-3xs font-bold text-indigo-600">
                      {getProviderName(k.provider_id)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-550">
                    <span className="font-mono bg-white border border-slate-250 px-2 py-0.5 rounded text-2xs text-slate-600">{k.key_prefix}...</span>
                    <span>•</span>
                    <span>{k.total_requests.toLocaleString()} requests</span>
                    <span>•</span>
                    <span className="text-cyan-600 font-bold">${k.total_cost_usd.toFixed(4)} spent</span>
                    <span>•</span>
                    <span>{k.total_tokens.toLocaleString()} tokens</span>
                  </div>
                </div>
                <button
                  onClick={() => revokeMaster(k.id)}
                  className="rounded-lg bg-rose-50 border border-rose-100 text-rose-600 px-3.5 py-1.5 text-xs font-bold hover:bg-rose-500 hover:text-white transition duration-200"
                >
                  Revoke
                </button>
              </div>
            </div>
          ))}
          {masterKeys.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">No master provider credentials configured.</p>
          )}
        </div>
      </section>

      {/* Child Keys List */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Issued Scoped Child Keys</h3>
        <div className="space-y-4">
          {childKeys.map((k) => {
            const s = summaries[k.id]
            const totalCost = s ? s.total_cost_usd : k.total_cost_usd
            const totalRequests = s ? s.total_requests : k.total_requests
            const totalTokens = s ? s.total_tokens : k.total_tokens
            const remaining = s ? s.remaining_usd : k.cost_limit_usd - totalCost
            const ratio = k.cost_limit_usd > 0 ? totalCost / k.cost_limit_usd : 0
            
            return (
              <div key={k.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 hover:border-slate-350 transition">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-800">{k.name}</p>
                      <span className="rounded-full bg-cyan-50 border border-cyan-100 px-2.5 py-0.5 text-3xs font-bold text-cyan-600">
                        {getProviderName(k.provider_id)}
                      </span>
                      {k.project_id && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-3xs font-bold text-slate-600">
                          {getProjectName(k.project_id)}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-550">
                      <span className="font-mono bg-white border border-slate-250 px-2 py-0.5 rounded text-2xs text-slate-600">{k.key_prefix}...</span>
                      <span>•</span>
                      <span>{totalRequests.toLocaleString()} requests</span>
                      <span>•</span>
                      <span>{totalTokens.toLocaleString()} tokens</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className={`rounded-lg px-2 py-0.5 text-2xs font-extrabold uppercase border ${
                      k.is_active
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                        : 'bg-slate-100 border-slate-200 text-slate-450'
                    }`}>
                      {k.is_active ? 'Active' : 'Revoked'}
                    </span>
                    {k.is_active && (
                      <button
                        onClick={() => revokeChild(k.id)}
                        className="rounded-lg bg-rose-50 border border-rose-100 text-rose-600 px-3 py-1.5 text-xs font-bold hover:bg-rose-500 hover:text-white transition duration-200"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-slate-550 font-medium">Spent: <span className="text-slate-900 font-bold">${totalCost.toFixed(4)}</span> / ${k.cost_limit_usd.toFixed(2)}</span>
                    <span className={ratio >= 0.9 ? 'text-rose-600' : ratio >= 0.7 ? 'text-amber-600' : 'text-emerald-600'}>
                      {remaining > 0 ? `$${remaining.toFixed(2)} remaining` : 'Limit reached'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        ratio >= 0.9 ? 'bg-rose-500' : ratio >= 0.7 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
          {childKeys.length === 0 && (
            <p className="text-sm text-slate-450 text-center py-6">No child keys generated yet.</p>
          )}
        </div>
      </section>

      {/* Usage Example */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-2 text-base font-bold text-slate-900">Proxy Access Integration</h3>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          Route your requests to standard endpoints using your generated child credentials. Cost and rate limits will be applied automatically.
        </p>
        <pre className="overflow-x-auto rounded-xl bg-slate-900 border border-slate-800 p-4 text-xs font-mono text-slate-200 leading-relaxed">
{`curl -X POST http://localhost:8000/api/v1/proxy/chat/completions \\
  -H "X-API-Key: sk_child_xxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4.1",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 1000
  }'`}
        </pre>
      </div>
    </div>
  )
}
