import { useEffect, useState } from 'react'
import api from '../lib/api'
import type { User } from '../types'

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // New Provider Form states
  const [showNewProviderForm, setShowNewProviderForm] = useState(false)
  const [provName, setProvName] = useState('')
  const [provDisplayName, setProvDisplayName] = useState('')
  const [provBaseUrl, setProvBaseUrl] = useState('')
  const [provApiKeyHeader, setProvApiKeyHeader] = useState('Authorization')
  const [provRpm, setProvRpm] = useState(60)
  const [provTpm, setProvTpm] = useState(100000)
  const [provModels, setProvModels] = useState('[]')
  const [provError, setProvError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [uRes, pRes] = await Promise.all([
        api.get<User[]>('/admin/users'),
        api.get<any[]>('/providers/')
      ])
      setUsers(uRes.data)
      setProviders(pRes.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load administration data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const handleCreateProvider = async (e: React.FormEvent) => {
    e.preventDefault()
    setProvError('')
    if (!provName.trim() || !provDisplayName.trim() || !provBaseUrl.trim()) {
      setProvError('Name, Display Name, and Base URL are required')
      return
    }
    try {
      await api.post('/providers/', {
        name: provName.trim(),
        display_name: provDisplayName.trim(),
        base_url: provBaseUrl.trim(),
        api_key_header: provApiKeyHeader.trim(),
        rate_limit_rpm: Number(provRpm),
        rate_limit_tpm: Number(provTpm),
        models_json: provModels.trim()
      })
      setProvName('')
      setProvDisplayName('')
      setProvBaseUrl('')
      setProvApiKeyHeader('Authorization')
      setProvRpm(60)
      setProvTpm(100000)
      setProvModels('[]')
      setShowNewProviderForm(false)
      await load()
    } catch (err: any) {
      setProvError(err?.response?.data?.detail || 'Failed to create provider')
    }
  }

  const changeRole = async (userId: number, newRole: string) => {
    try {
      await api.put(`/admin/users/${userId}/role?new_role=${newRole}`)
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to change role')
    }
  }

  const deactivate = async (userId: number) => {
    if (!confirm('Deactivate this user?')) return
    try {
      await api.delete(`/admin/users/${userId}`)
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to deactivate user')
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-8 py-12">
        <div className="flex flex-col items-center justify-center space-y-4 py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-600" />
          <p className="text-sm font-medium text-slate-500">Loading user administration tables...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-10 space-y-8 bg-slate-50">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Admin Panel</h1>
          <p className="text-sm text-slate-500">Manage user accounts, roles, access states, and system authorizations.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 font-medium">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 overflow-x-auto shadow-sm">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <th className="pb-4 pr-4">ID</th>
              <th className="pb-4 pr-4">Name</th>
              <th className="pb-4 pr-4">Email</th>
              <th className="pb-4 pr-4">Role</th>
              <th className="pb-4 pr-4">Active</th>
              <th className="pb-4 pr-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/50 transition">
                <td className="py-4 pr-4 font-mono text-xs text-slate-450">#{u.id}</td>
                <td className="py-4 pr-4 font-semibold text-slate-800">{u.full_name}</td>
                <td className="py-4 pr-4 text-slate-600">{u.email}</td>
                <td className="py-4 pr-4">
                  <span className={`rounded-lg px-2 py-0.5 text-2xs font-extrabold uppercase border ${
                    u.role === 'admin'
                      ? 'bg-amber-50 border-amber-100 text-amber-600'
                      : u.role === 'manager'
                      ? 'bg-cyan-50 border-cyan-100 text-cyan-600'
                      : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="py-4 pr-4">
                  <span className={`inline-flex items-center gap-1 text-xs ${u.is_active ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${u.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-450'}`} />
                    {u.is_active ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="py-4 pr-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <select
                      className="rounded-xl border border-slate-350 bg-white px-3 py-1.5 text-xs text-slate-850 focus:border-cyan-550 outline-none transition"
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    {u.is_active && (
                      <button
                        onClick={() => deactivate(u.id)}
                        className="rounded-xl bg-rose-50 border border-rose-100 text-rose-600 px-3.5 py-1.5 text-xs font-bold hover:bg-rose-500 hover:text-white transition duration-200"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {users.length === 0 && (
          <p className="text-sm text-slate-400 mt-6 text-center py-4">No users registered in the system database.</p>
        )}
      </div>

      {/* Provider Management Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Providers Directory</h3>
            <p className="text-xs text-slate-500">Manage LLM and telemetry providers globally.</p>
          </div>
          <button
            onClick={() => setShowNewProviderForm(!showNewProviderForm)}
            className="rounded-xl bg-cyan-600 hover:bg-cyan-650 px-4 py-2.5 text-xs font-semibold text-white transition active:scale-[0.98]"
          >
            {showNewProviderForm ? 'Cancel' : '+ Add Custom Provider'}
          </button>
        </div>

        {showNewProviderForm && (
          <form onSubmit={handleCreateProvider} className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
            <h4 className="text-sm font-bold text-slate-800">Add New Provider</h4>
            {provError && (
              <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-lg">{provError}</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Provider Name (e.g. togetherai)"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-cyan-500 outline-none transition"
                value={provName}
                onChange={(e) => setProvName(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Display Name (e.g. Together AI)"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-cyan-500 outline-none transition"
                value={provDisplayName}
                onChange={(e) => setProvDisplayName(e.target.value)}
                required
              />
            </div>
            <input
              type="url"
              placeholder="Base API URL (e.g. https://api.together.xyz/v1)"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-cyan-500 outline-none transition"
              value={provBaseUrl}
              onChange={(e) => setProvBaseUrl(e.target.value)}
              required
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <input
                type="text"
                placeholder="API Key Header (e.g. Authorization)"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-cyan-500 outline-none transition"
                value={provApiKeyHeader}
                onChange={(e) => setProvApiKeyHeader(e.target.value)}
                required
              />
              <div className="flex flex-col gap-1">
                <label className="text-3xs font-bold uppercase tracking-wider text-slate-500 px-1">RPM Limit</label>
                <input
                  type="number"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 focus:border-cyan-500 outline-none transition"
                  value={provRpm}
                  onChange={(e) => setProvRpm(Number(e.target.value))}
                  min={1}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-3xs font-bold uppercase tracking-wider text-slate-500 px-1">TPM Limit</label>
                <input
                  type="number"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 focus:border-cyan-500 outline-none transition"
                  value={provTpm}
                  onChange={(e) => setProvTpm(Number(e.target.value))}
                  min={1}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-3xs font-bold uppercase tracking-wider text-slate-500 px-1">Supported Models (JSON Array)</label>
              <textarea
                placeholder='["model-1", "model-2"]'
                className="w-full h-16 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-mono text-slate-800 focus:border-cyan-500 outline-none transition"
                value={provModels}
                onChange={(e) => setProvModels(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-650 py-3 text-xs font-semibold text-white shadow-md shadow-cyan-600/10 hover:brightness-105 active:scale-[0.99] transition duration-200"
            >
              Create Global Provider
            </button>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="pb-4 pr-4">Provider</th>
                <th className="pb-4 pr-4">Base URL</th>
                <th className="pb-4 pr-4">Header</th>
                <th className="pb-4 pr-4">RPM</th>
                <th className="pb-4 pr-4">TPM</th>
                <th className="pb-4 pr-4">Models</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {providers.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-4 pr-4 font-semibold text-slate-800">{p.display_name}</td>
                  <td className="py-4 pr-4 font-mono text-xs text-slate-500 truncate max-w-[200px]" title={p.base_url}>{p.base_url}</td>
                  <td className="py-4 pr-4 text-xs font-mono text-slate-650">{p.api_key_header}</td>
                  <td className="py-4 pr-4 font-mono text-xs">{p.rate_limit_rpm}</td>
                  <td className="py-4 pr-4 font-mono text-xs">{p.rate_limit_tpm.toLocaleString()}</td>
                  <td className="py-4 pr-4 text-xs text-slate-500 max-w-[150px] truncate" title={p.models_json}>{p.models_json || '[]'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {providers.length === 0 && (
            <p className="text-sm text-slate-400 mt-6 text-center py-4">No providers loaded.</p>
          )}
        </div>
      </div>
    </div>
  )
}
