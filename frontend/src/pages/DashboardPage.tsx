import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import type { Project, BudgetStatus, User } from '../types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'

type Props = { user: User }

type ProjectWithCost = Project & { total_cost_usd?: number }

export default function DashboardPage({ user }: Props) {
  const [projects, setProjects] = useState<ProjectWithCost[]>([])
  const [statuses, setStatuses] = useState<BudgetStatus[]>([])
  const [totalSpent, setTotalSpent] = useState(0.0)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<any[]>([])

  const loadData = async (isBackground = false) => {
    if (!isBackground) setLoading(true)
    try {
      const [p, s, t] = await Promise.all([
        api.get<Project[]>('/projects/'),
        api.get<BudgetStatus[]>('/budgets/status'),
        api.get<{ total_spent_usd: number }>('/budgets/total-spent')
      ])

      const projs = p.data
      const projectsWithCosts = await Promise.all(
        projs.map(async (proj) => {
          try {
            const costRes = await api.get<{ total_cost_usd: number }>(`/projects/${proj.id}/costs`)
            return { ...proj, total_cost_usd: costRes.data.total_cost_usd }
          } catch {
            return { ...proj, total_cost_usd: 0.0 }
          }
        })
      )

      setProjects(projectsWithCosts)
      setStatuses(s.data)
      setTotalSpent(t.data.total_spent_usd)

      // Build chart data: Cost vs Limit if budgets exist, otherwise show Project Costs
      if (s.data.length > 0) {
        const data = s.data.map((st) => ({
          name: `Budget #${st.budget_id}`,
          cost: st.total_cost_usd,
          limit: st.limit_usd,
          ratio: st.ratio,
        }))
        setChartData(data)
      } else {
        const data = projectsWithCosts.map((proj) => ({
          name: proj.name,
          cost: proj.total_cost_usd || 0.0,
          limit: 0.0,
        }))
        setChartData(data)
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load data')
    } finally {
      if (!isBackground) setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()

    // 10 second background refresh interval for real-time updates
    const interval = setInterval(() => {
      void loadData(true)
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/projects/', { name, description })
      setName('')
      setDescription('')
      await loadData()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create project')
    }
  }

  const canCreateProject = user.role === 'admin' || user.role === 'manager'
  const totalBudgeted = statuses.reduce((acc, curr) => acc + curr.limit_usd, 0)
  const criticalBudgets = statuses.filter(s => s.level === 'critical').length

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col items-center justify-center space-y-4 py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-600" />
          <p className="text-sm font-medium text-slate-500">Loading your intelligence dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-8 bg-slate-50">
      {/* Header Section */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Real-time cost intelligence and resource budgets.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { void loadData() }}
            className="rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-105 active:scale-[0.98] transition duration-200 shadow-sm"
          >
            Refresh Data
          </button>
          <Link to="/forecast" className="rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition duration-200 shadow-sm">
            View Forecast
          </Link>
          {user.role === 'admin' && (
            <Link to="/admin" className="rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 px-4 py-2.5 text-xs font-semibold text-white hover:brightness-105 shadow-md shadow-amber-600/10 active:scale-[0.98] transition duration-200">
              Admin Panel
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Spent */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 relative overflow-hidden group hover:border-slate-350 transition duration-300 shadow-sm">
          <div className="absolute top-0 right-0 h-24 w-24 -mr-8 -mt-8 rounded-full bg-cyan-100/40 blur-2xl group-hover:bg-cyan-100/60 transition duration-300" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-450">Total spent</p>
          <p className="mt-4 text-3xl font-black text-slate-900 tracking-tight">${totalSpent.toFixed(4)}</p>
          <div className="mt-2 text-xs font-medium text-slate-500">Across all projects</div>
        </div>

        {/* Total Budgets */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 relative overflow-hidden group hover:border-slate-350 transition duration-300 shadow-sm">
          <div className="absolute top-0 right-0 h-24 w-24 -mr-8 -mt-8 rounded-full bg-indigo-100/40 blur-2xl group-hover:bg-indigo-100/60 transition duration-300" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-450">Total budgeted</p>
          <p className="mt-4 text-3xl font-black text-slate-900 tracking-tight">${totalBudgeted.toFixed(2)}</p>
          <div className="mt-2 text-xs font-medium text-slate-500">Limit ceiling</div>
        </div>

        {/* Projects */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 relative overflow-hidden group hover:border-slate-350 transition duration-300 shadow-sm">
          <div className="absolute top-0 right-0 h-24 w-24 -mr-8 -mt-8 rounded-full bg-violet-100/40 blur-2xl group-hover:bg-violet-100/60 transition duration-300" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-450">Active Projects</p>
          <p className="mt-4 text-3xl font-black text-slate-900 tracking-tight">{projects.length}</p>
          <div className="mt-2 text-xs font-medium text-slate-500">Configured groups</div>
        </div>

        {/* Critical Limits */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 relative overflow-hidden group hover:border-slate-350 transition duration-300 shadow-sm">
          <div className="absolute top-0 right-0 h-24 w-24 -mr-8 -mt-8 rounded-full bg-rose-100/40 blur-2xl group-hover:bg-rose-100/60 transition duration-300" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-450">Alert Status</p>
          <p className={`mt-4 text-3xl font-black tracking-tight ${criticalBudgets > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {criticalBudgets > 0 ? `${criticalBudgets} Critical` : 'Healthy'}
          </p>
          <div className="mt-2 text-xs font-medium text-slate-500">Over-budget count</div>
        </div>
      </div>

      {/* Chart Section */}
      {chartData.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-6 text-lg font-bold text-slate-900">
            {statuses.length > 0 ? 'Cost vs Budget Limits' : 'Project Spending Analysis'}
          </h3>
          <div className="w-full">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.15}/>
                  </linearGradient>
                  {statuses.length > 0 && (
                    <linearGradient id="colorLimit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.15}/>
                    </linearGradient>
                  )}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                  labelClassName="text-slate-800 text-xs font-bold"
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: 15 }} />
                <Bar name={statuses.length > 0 ? 'Actual Cost ($)' : 'Total Cost ($)'} dataKey="cost" fill="url(#colorCost)" radius={[4, 4, 0, 0]} />
                {statuses.length > 0 && (
                  <Bar name="Limit Budget ($)" dataKey="limit" fill="url(#colorLimit)" radius={[4, 4, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Projects Section */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Projects</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-650">
              {projects.length} Total
            </span>
          </div>
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {projects.map((p) => (
              <div key={p.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 hover:border-slate-350 transition">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-850">{p.name}</p>
                  <span className="text-xs text-slate-500 font-mono">Cost: ${(p.total_cost_usd || 0).toFixed(4)}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">{p.description || 'No description provided.'}</p>
              </div>
            ))}
            {projects.length === 0 && (
              <p className="text-sm text-slate-400 py-4 text-center">No projects configured.</p>
            )}
          </div>
        </section>

        {/* Budget Status Section */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Budget Status</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-655">
              Active Budgets
            </span>
          </div>
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {statuses.map((s) => {
              const fillRatio = Math.min(s.ratio, 1)
              return (
                <div key={s.budget_id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 hover:border-slate-350 transition">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-slate-850">Budget #{s.budget_id}</p>
                    <span className={`rounded-lg px-2 py-0.5 text-2xs font-extrabold uppercase tracking-wide border ${
                      s.level === 'critical'
                        ? 'bg-rose-50 border-rose-100 text-rose-600'
                        : s.level === 'warning'
                        ? 'bg-amber-50 border-amber-100 text-amber-600'
                        : 'bg-emerald-50 border-emerald-100 text-emerald-650'
                    }`}>
                      {s.level}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-medium">
                    <span>${s.total_cost_usd.toFixed(4)} spent</span>
                    <span>Limit: ${s.limit_usd.toFixed(2)}</span>
                  </div>

                  <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        s.level === 'critical' ? 'bg-rose-500' : s.level === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${fillRatio * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
            {statuses.length === 0 && (
              <p className="text-sm text-slate-400 py-4 text-center">No budgets configured yet.</p>
            )}
          </div>
        </section>
      </div>

      {/* Create Project Form (Admins / Managers) */}
      {canCreateProject && (
        <form onSubmit={createProject} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-slate-900">Configure New Project</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <input
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-500 outline-none transition"
                placeholder="Project name (e.g. Sentinel-AI)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <input
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-500 outline-none transition"
                placeholder="Brief description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="mt-3 text-xs text-rose-600 font-medium">{error}</p>}
          <div className="mt-4 flex justify-end">
            <button className="rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-650 px-5 py-2.5 text-xs font-semibold text-white hover:brightness-105 shadow-md shadow-cyan-600/10 active:scale-[0.98] transition duration-200">
              Create Project
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
