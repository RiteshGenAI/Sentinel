import { useState, useEffect } from 'react'
import api from '../../lib/api'
import type { ProviderOut, ChildKeyWithSecret, ChildKeySummary, Project } from '../../types'
import { formatCost } from '../DashboardPage'

export default function ChildKeysPage() {
  const [providers, setProviders] = useState<ProviderOut[]>([])
  const [childKeys, setChildKeys] = useState<ChildKeyWithSecret[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [summaries, setSummaries] = useState<Record<number, ChildKeySummary>>({})
  
  // Form states
  const [childProvider, setChildProvider] = useState<number | ''>('')
  const [childName, setChildName] = useState('')
  const [childLimit, setChildLimit] = useState(20)
  const [childExpires, setChildExpires] = useState('')
  const [childProjectId, setChildProjectId] = useState<number | ''>('')
  const [childUserEmail, setChildUserEmail] = useState('')
  
  // Project creation inline form states
  const [showNewProjectForm, setShowNewProjectForm] = useState(false)
  const [newProjName, setNewProjName] = useState('')
  const [newProjDesc, setNewProjDesc] = useState('')
  const [projError, setProjError] = useState('')
  
  const [secretKey, setSecretKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)
  const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [p, c, proj] = await Promise.all([
        api.get<ProviderOut[]>('/providers/'),
        api.get<ChildKeyWithSecret[]>('/child-keys/'),
        api.get<Project[]>('/projects/'),
      ])
      setProviders(p.data)
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
      setError(err?.response?.data?.detail || 'Failed to load scoped child keys')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadData() }, [])

  const handleCreateProject = async () => {
    setProjError('')
    if (!newProjName.trim()) {
      setProjError('Project name is required')
      return
    }
    try {
      const { data } = await api.post<Project>('/projects/', {
        name: newProjName.trim(),
        description: newProjDesc.trim()
      })
      // Refresh projects list
      const proj = await api.get<Project[]>('/projects/')
      setProjects(proj.data)
      // Select the new project
      setChildProjectId(data.id)
      // Reset form states
      setNewProjName('')
      setNewProjDesc('')
      setShowNewProjectForm(false)
    } catch (err: any) {
      setProjError(err?.response?.data?.detail || 'Failed to create project')
    }
  }

  const generateChildKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSecretKey('')
    setCopySuccess(false)
    setCopiedKeyId(null)
    try {
      const payload: any = {
        provider_id: Number(childProvider),
        name: childName,
        cost_limit_usd: childLimit,
      }
      if (childExpires) payload.expires_days = parseInt(childExpires)
      if (childProjectId) payload.project_id = Number(childProjectId)
      if (childUserEmail) payload.user_email = childUserEmail.trim()

      const { data } = await api.post<ChildKeyWithSecret>('/child-keys/', payload)
      setSecretKey(data.secret_key)
      setCopiedKeyId(data.id) // Auto-set as copied for the new key
      setChildName('')
      setChildLimit(20)
      setChildExpires('')
      setChildProvider('')
      setChildProjectId('')
      setChildUserEmail('')
      await loadData()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to generate child key')
    }
  }

  const revokeChild = async (id: number) => {
    if (!confirm('Revoke this child key?')) return
    try {
      await api.delete(`/child-keys/${id}`)
      await loadData()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to revoke')
    }
  }

  const regenerateChild = async (id: number) => {
    if (!confirm('Regenerate this child key? This will deactivate the current key and create a new one with the same configuration.')) return
    try {
      setError('')
      setSecretKey('')
      setCopySuccess(false)
      setCopiedKeyId(null)
      const { data } = await api.post<ChildKeyWithSecret>(`/child-keys/${id}/regenerate`)
      setSecretKey(data.secret_key)
      setCopiedKeyId(id) // Auto-set as copied for the new key
      await loadData()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to regenerate key')
    }
  }

  const getProjectName = (id: number | null) => {
    if (id === null) return 'No Project'
    const proj = projects.find((pr) => pr.id === id)
    return proj ? proj.name : 'Unknown'
  }

  const handleCopyKey = async (keyId: number, keyPrefix: string) => {
    // Copy the key prefix that's displayed
    const currentKeyData = childKeys.find(k => k.id === keyId)
    if (currentKeyData) {
      try {
        await navigator.clipboard.writeText(currentKeyData.key_prefix + "...")
        setCopiedKeyId(keyId)
        setTimeout(() => setCopiedKeyId(null), 2000)
      } catch (err) {
        /* ignore */
      }
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-8 py-12">
        <div className="flex flex-col items-center justify-center space-y-4 py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-600" />
          <p className="text-sm font-medium text-slate-500">Loading child keys...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-10 space-y-8 bg-slate-50">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Scoped Child Keys</h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate cost-capped, scoped tokens routed securely through your master provider credentials.
          </p>
        </div>
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
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(secretKey)
                    setCopySuccess(true)
                    setTimeout(() => setCopySuccess(false), 2000)
                  } catch (err) {
                    /* ignore */
                  }
                }}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-xs font-semibold text-white hover:bg-emerald-550 active:scale-[0.98] transition shadow-md shadow-emerald-500/10 flex items-center gap-2"
              >
                {copySuccess ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Key
                  </>
                )}
              </button>
              <button
                onClick={() => setSecretKey('')}
                className="rounded-xl bg-white border border-slate-200 text-slate-600 px-5 py-3 text-xs font-semibold hover:text-slate-900 transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 font-medium">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form Column */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm h-fit">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Generate Scoped Key</h3>
          <p className="text-xs text-slate-500 mb-4">
            Create limited-access tokens routing requests securely through master credentials.
          </p>
          <form onSubmit={generateChildKey} className="space-y-4">
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-cyan-500 outline-none transition"
              value={childProvider}
              onChange={(e) => setChildProvider(e.target.value ? Number(e.target.value) : '')}
              required
            >
              <option value="">Select Provider</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.display_name}</option>
              ))}
            </select>
            
            <div className="space-y-2">
              <select
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-cyan-500 outline-none transition"
                value={childProjectId}
                onChange={(e) => setChildProjectId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Associate Project (Optional)</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>{proj.name}</option>
                ))}
              </select>

              {showNewProjectForm ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 transition duration-200">
                  <div className="flex justify-between items-center">
                    <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">New Project Details</span>
                    <button 
                      type="button" 
                      onClick={() => { setShowNewProjectForm(false); setProjError(''); }}
                      className="text-2xs text-slate-400 hover:text-slate-600 font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-cyan-500 outline-none transition"
                    placeholder="Project Name"
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                  />
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-cyan-500 outline-none transition"
                    placeholder="Description (Optional)"
                    value={newProjDesc}
                    onChange={(e) => setNewProjDesc(e.target.value)}
                  />
                  {projError && <p className="text-2xs text-rose-500 font-medium">{projError}</p>}
                  <button
                    type="button"
                    onClick={handleCreateProject}
                    className="w-full rounded-lg bg-cyan-600 hover:bg-cyan-650 py-2 text-xs font-semibold text-white hover:brightness-105 active:scale-[0.98] transition duration-200"
                  >
                    Create & Select Project
                  </button>
                </div>
              ) : (
                <div className="flex justify-start px-1">
                  <button
                    type="button"
                    onClick={() => setShowNewProjectForm(true)}
                    className="text-xs font-semibold text-cyan-600 hover:text-indigo-650 transition flex items-center gap-1 active:scale-[0.98]"
                  >
                    + Create New Project
                  </button>
                </div>
              )}
            </div>

            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-500 outline-none transition"
              placeholder="Key label (e.g. dev-internal-testing)"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              required
            />

            <input
              type="email"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-500 outline-none transition"
              placeholder="Assigned Member Email (Optional)"
              value={childUserEmail}
              onChange={(e) => setChildUserEmail(e.target.value)}
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
                <label className="text-3xs font-bold uppercase tracking-wider text-slate-500 px-1">Expires (Days)</label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-cyan-500 outline-none transition"
                  placeholder="Never"
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

        {/* List Column */}
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Active Child Keys</h3>
            <div className="space-y-6">
              {providers.map((p) => {
                const pChildKeys = childKeys.filter(k => k.provider_id === p.id)
                if (pChildKeys.length === 0) return null

                return (
                  <div key={p.id} className="border-b border-slate-100 last:border-0 pb-6 last:pb-0">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-sm text-slate-800 uppercase tracking-wide">{p.display_name} Workspace</span>
                      <span className="rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-3xs font-bold text-slate-500">
                        {pChildKeys.length} active
                      </span>
                    </div>
                    <div className="space-y-4">
                      {pChildKeys.map((k) => {
                        const s = summaries[k.id]
                        const totalCost = s ? s.total_cost_usd : k.total_cost_usd
                        const totalRequests = s ? s.total_requests : k.total_requests
                        const totalTokens = s ? s.total_tokens : k.total_tokens
                        const remaining = s ? s.remaining_usd : k.cost_limit_usd - totalCost
                        const ratio = k.cost_limit_usd > 0 ? totalCost / k.cost_limit_usd : 0

                        return (
                          <div key={k.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 hover:border-slate-300 transition">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200/60">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-slate-800 text-sm">{k.name}</p>
                                  {k.project_id && (
                                    <span className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-3xs font-bold text-slate-600">
                                      {getProjectName(k.project_id)}
                                    </span>
                                  )}
                                  {k.user_email && (
                                    <span className="rounded bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 text-3xs font-bold text-indigo-600 truncate max-w-[150px]" title={`Assigned to: ${k.user_name || k.user_email}`}>
                                      👤 {k.user_name || k.user_email}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-slate-500">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono bg-white border border-slate-200 px-2 py-1 rounded text-slate-600 flex items-center gap-2">
                                      <span>{k.key_prefix}...</span>
                                      <button
                                        onClick={() => handleCopyKey(k.id, k.key_prefix)}
                                        className="text-slate-400 hover:text-slate-600 transition-colors"
                                        title="Copy key"
                                      >
                                        {copiedKeyId === k.id ? (
                                          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                        ) : (
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                          </svg>
                                        )}
                                      </button>
                                    </span>
                                  </div>
                                  <span>•</span>
                                  <span>{totalRequests.toLocaleString()} reqs</span>
                                  <span>•</span>
                                  <span>{totalTokens.toLocaleString()} tokens</span>
                                </div>
                              </div>
                              <span className={`rounded px-1.5 py-0.5 text-3xs font-bold uppercase border ${
                                k.is_active
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                  : 'bg-slate-100 border-slate-200 text-slate-455'
                              }`}>
                                {k.is_active ? 'Active' : 'Revoked'}
                              </span>
                            </div>

                            <div className="mt-3">
                              <div className="flex justify-between text-2xs font-semibold mb-1.5">
                                <span className="text-slate-550">Spent: <span className="text-slate-900 font-bold">{formatCost(totalCost)}</span> / ${k.cost_limit_usd.toFixed(2)}</span>
                                <span className={ratio >= 0.9 ? 'text-rose-600' : ratio >= 0.7 ? 'text-amber-600' : 'text-emerald-600'}>
                                  {remaining > 0 ? `${formatCost(remaining)} left` : 'Limit reached'}
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

                            {k.is_active && (
                              <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-200/60">
                                <button
                                  onClick={() => regenerateChild(k.id)}
                                  className="flex-1 rounded-lg bg-cyan-50 border border-cyan-100 text-cyan-600 px-3 py-2 text-xs font-bold hover:bg-cyan-500 hover:text-white transition duration-200"
                                  title="Regenerate key with same configuration"
                                >
                                  Regenerate
                                </button>
                                <button
                                  onClick={() => revokeChild(k.id)}
                                  className="flex-1 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 px-3 py-2 text-xs font-bold hover:bg-rose-500 hover:text-white transition duration-200"
                                >
                                  Revoke
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {childKeys.length === 0 && (
                <p className="text-xs text-slate-400 py-8 text-center border border-dashed border-slate-200 rounded-xl">
                  No scoped child keys configured yet.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

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
