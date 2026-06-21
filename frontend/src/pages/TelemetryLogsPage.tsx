import { useEffect, useState } from 'react'
import api from '../lib/api'
import type { Project } from '../types'
import { formatCost } from './DashboardPage'

interface TelemetryCall {
  id: number
  provider: string
  model: string
  prompt_tokens: number
  completion_tokens: number
  cost_usd: number
  latency_ms: number
  created_at: string
  project_id: number | null
  project_name: string
}

export default function TelemetryLogsPage() {
  const [calls, setCalls] = useState<TelemetryCall[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [search, setSearch] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCall, setSelectedCall] = useState<TelemetryCall | null>(null)

  const fetchFilters = async () => {
    try {
      const projRes = await api.get<Project[]>('/projects/')
      setProjects(projRes.data)
    } catch (err: any) {
      console.error('Failed to load projects for filtering', err)
    }
  }

  const fetchLogs = async () => {
    setLoading(true)
    setError('')
    try {
      let url = `/telemetry/calls?page=${page}&size=15`
      if (search) url += `&search=${encodeURIComponent(search)}`
      if (selectedProjectId) url += `&project_id=${selectedProjectId}`

      const res = await api.get<{
        items: TelemetryCall[]
        total: number
        page: number
        size: number
        pages: number
      }>(url)

      setCalls(res.data.items)
      setTotalPages(res.data.pages)
      setTotalItems(res.data.total)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to fetch telemetry logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchFilters()
  }, [])

  useEffect(() => {
    void fetchLogs()
  }, [page, selectedProjectId])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    void fetchLogs()
  }

  const formatDate = (isoStr: string) => {
    if (!isoStr) return ''
    const d = new Date(isoStr)
    return d.toLocaleString()
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-10 space-y-8 bg-slate-50 min-h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Telemetry Logs</h1>
          <p className="text-sm text-slate-500">Real-time LLM Gateway transaction logs and latencies.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { void fetchLogs() }}
            className="rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-sm"
          >
            ↻ Refresh Logs
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by model, provider, or project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-500 outline-none transition"
            />
          </div>
          <div className="min-w-[200px]">
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value)
                setPage(1)
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-cyan-500 outline-none transition"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-650 px-5 py-2.5 text-xs font-semibold text-white hover:brightness-105 shadow-md shadow-cyan-600/10 transition"
          >
            Apply Filters
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700">
          {error}
        </div>
      )}

      {/* Logs Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-500">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Project</th>
                <th className="px-6 py-4">Provider</th>
                <th className="px-6 py-4">Model</th>
                <th className="px-6 py-4 text-right">Tokens (P / C)</th>
                <th className="px-6 py-4 text-right">Latency</th>
                <th className="px-6 py-4 text-right">Cost (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
                      <span>Loading transaction logs...</span>
                    </div>
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                    No LLM proxy transactions found matching the filters.
                  </td>
                </tr>
              ) : (
                calls.map((c) => (
                  <tr 
                    key={c.id} 
                    onClick={() => setSelectedCall(c)}
                    className="hover:bg-slate-50 cursor-pointer transition"
                  >
                    <td className="px-6 py-4 text-xs font-medium text-slate-900 whitespace-nowrap">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-800">{c.project_name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 capitalize">
                        {c.provider}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-slate-600">{c.model}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs">
                      <span className="text-slate-900 font-bold">{c.prompt_tokens + c.completion_tokens}</span>
                      <span className="text-slate-400"> ({c.prompt_tokens} / {c.completion_tokens})</span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <span className="font-medium text-slate-800">
                        {c.latency_ms > 0 ? `${(c.latency_ms / 1000).toFixed(2)}s` : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatCost(c.cost_usd)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
            <p className="text-xs text-slate-500">
              Showing page <span className="font-bold text-slate-800">{page}</span> of <span className="font-bold text-slate-800">{totalPages}</span> ({totalItems} total logs)
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Diagnostics Modal */}
      {selectedCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div>
                <span className="rounded-lg bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-3xs font-extrabold uppercase tracking-wider text-indigo-650">
                  Call ID #{selectedCall.id}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">Transaction Details</h3>
              </div>
              <button
                onClick={() => setSelectedCall(null)}
                className="rounded-full bg-slate-100 hover:bg-slate-200 p-2 text-slate-400 hover:text-slate-700 transition"
              >
                ✕
              </button>
            </div>

            {/* Diagnostic Details Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">Timestamp</span>
                <p className="mt-1 text-sm font-semibold text-slate-850">{formatDate(selectedCall.created_at)}</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">Project Scope</span>
                <p className="mt-1 text-sm font-semibold text-slate-850">{selectedCall.project_name}</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">Provider</span>
                <p className="mt-1 text-sm font-semibold text-slate-850 capitalize">{selectedCall.provider}</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">Model Requested</span>
                <p className="mt-1 text-xs font-mono font-semibold text-slate-850">{selectedCall.model}</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">Latency / Response Speed</span>
                <p className="mt-1 text-sm font-semibold text-slate-850">
                  {selectedCall.latency_ms > 0 ? `${(selectedCall.latency_ms / 1000).toFixed(3)}s` : 'N/A'}
                  {selectedCall.latency_ms > 0 && (
                    <span className="text-2xs text-slate-450 ml-1">({selectedCall.latency_ms.toLocaleString()} ms)</span>
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">Cost Incurred</span>
                <p className="mt-1 text-sm font-black text-cyan-600">{formatCost(selectedCall.cost_usd)}</p>
              </div>
            </div>

            {/* Token Distribution Card */}
            <div className="rounded-2xl border border-slate-150 bg-slate-50/50 p-5 space-y-3">
              <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">Token Volume Allocation</span>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-indigo-600">Prompt / Input: {selectedCall.prompt_tokens.toLocaleString()}</span>
                <span className="text-purple-600">Completion / Output: {selectedCall.completion_tokens.toLocaleString()}</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden flex">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${(selectedCall.prompt_tokens / (selectedCall.prompt_tokens + selectedCall.completion_tokens || 1)) * 100}%` }}
                />
                <div 
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${(selectedCall.completion_tokens / (selectedCall.prompt_tokens + selectedCall.completion_tokens || 1)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-2xs text-slate-500 pt-1">
                <span>Total Tokens Processed</span>
                <span className="font-bold text-slate-750">{(selectedCall.prompt_tokens + selectedCall.completion_tokens).toLocaleString()}</span>
              </div>
            </div>

            {/* Modal Footer / Actions */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedCall(null)}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 px-6 py-2.5 text-xs font-semibold text-white transition active:scale-[0.98]"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
