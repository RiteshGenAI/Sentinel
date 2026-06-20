import { useEffect, useState } from 'react'
import api from '../lib/api'
import type { User } from '../types'

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get<User[]>('/admin/users')
      setUsers(data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

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
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Admin Panel</h2>
        <p className="text-sm text-slate-500">Manage user accounts, roles, access states, and system authorizations.</p>
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
    </div>
  )
}
