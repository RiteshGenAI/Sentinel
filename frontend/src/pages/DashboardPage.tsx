import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import type { BudgetStatus, User } from '../types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts'

type Props = { user: User }

export function formatCost(value: number): string {
  if (value === 0) return '$0.00'
  if (value < 0.01) {
    return '$' + value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    })
  }
  return '$' + value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  })
}

// Shorten date label for chart axis
function shortDay(dayStr: string): string {
  if (!dayStr) return ''
  try {
    const d = new Date(dayStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return dayStr.slice(5) // fallback: "06-21"
  }
}

const PIE_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function DashboardPage({ user }: Props) {
  const [statuses, setStatuses] = useState<BudgetStatus[]>([])
  const [totalSpent, setTotalSpent] = useState(0.0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)

  const loadData = async (isBackground = false) => {
    if (!isBackground) setLoading(true)
    setError('')
    try {
      const [s, t, a] = await Promise.all([
        api.get<BudgetStatus[]>('/budgets/status'),
        api.get<{ total_spent_usd: number }>('/budgets/total-spent'),
        api.get<any>('/analytics/dashboard')
      ])

      setStatuses(s.data)
      setTotalSpent(t.data.total_spent_usd)
      setAnalytics(a.data)

      // Build chart data: Cost vs Limit if budgets exist, else project spending
      if (s.data.length > 0) {
        const data = s.data.map((st) => ({
          name: `Budget #${st.budget_id}`,
          cost: st.total_cost_usd,
          limit: st.limit_usd,
          ratio: st.ratio,
        }))
        setChartData(data)
      } else if (a.data?.project_costs?.length > 0) {
        const data = a.data.project_costs.map((pc: any) => ({
          name: pc.name,
          cost: pc.total_cost,
        }))
        setChartData(data)
      } else {
        setChartData([])
      }
    } catch (err: any) {
      if (!isBackground) setError(err?.response?.data?.detail || 'Failed to load data')
    } finally {
      if (!isBackground) setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()

    // 15 second background refresh interval for real-time updates
    const interval = setInterval(() => {
      void loadData(true)
    }, 15000)

    return () => clearInterval(interval)
  }, [])

  const totalBudgeted = statuses.reduce((acc, curr) => acc + curr.limit_usd, 0)
  const criticalBudgets = statuses.filter(s => s.level === 'critical').length

  // Format timeline to shorter labels
  const formattedTimeline = analytics?.timeline?.map((t: any) => ({
    ...t,
    label: shortDay(t.day),
  })) || []

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-8 py-12">
        <div className="flex flex-col items-center justify-center space-y-4 py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-600" />
          <p className="text-sm font-medium text-slate-500">Loading your intelligence dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-10 space-y-8 bg-slate-50">
      {/* Header Section */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Real-time cost intelligence and resource budgets.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { void loadData() }}
            className="rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition duration-200 shadow-sm"
          >
            ↻ Refresh
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

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 font-medium animate-in fade-in duration-200">
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Spent */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 relative overflow-hidden group hover:border-cyan-200 transition duration-300 shadow-sm">
          <div className="absolute top-0 right-0 h-24 w-24 -mr-8 -mt-8 rounded-full bg-cyan-100/40 blur-2xl group-hover:bg-cyan-100/70 transition duration-300" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Spent</p>
          <p className="mt-4 text-3xl font-black text-slate-900 tracking-tight">{formatCost(totalSpent)}</p>
          <div className="mt-2 text-xs font-medium text-slate-500">Across all projects</div>
        </div>

        {/* Total Budgets */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 relative overflow-hidden group hover:border-indigo-200 transition duration-300 shadow-sm">
          <div className="absolute top-0 right-0 h-24 w-24 -mr-8 -mt-8 rounded-full bg-indigo-100/40 blur-2xl group-hover:bg-indigo-100/70 transition duration-300" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Budgeted</p>
          <p className="mt-4 text-3xl font-black text-slate-900 tracking-tight">${totalBudgeted.toFixed(2)}</p>
          <div className="mt-2 text-xs font-medium text-slate-500">Limit ceiling</div>
        </div>

        {/* Total Tokens */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 relative overflow-hidden group hover:border-violet-200 transition duration-300 shadow-sm">
          <div className="absolute top-0 right-0 h-24 w-24 -mr-8 -mt-8 rounded-full bg-violet-100/40 blur-2xl group-hover:bg-violet-100/70 transition duration-300" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Tokens</p>
          <p className="mt-4 text-3xl font-black text-slate-900 tracking-tight">{(analytics?.token_stats?.total_tokens || 0).toLocaleString()}</p>
          <div className="mt-2 text-xs font-medium text-slate-500">Processed volume</div>
        </div>

        {/* Alert Status */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 relative overflow-hidden group hover:border-rose-200 transition duration-300 shadow-sm">
          <div className="absolute top-0 right-0 h-24 w-24 -mr-8 -mt-8 rounded-full bg-rose-100/40 blur-2xl group-hover:bg-rose-100/70 transition duration-300" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Alert Status</p>
          <p className={`mt-4 text-3xl font-black tracking-tight ${criticalBudgets > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {criticalBudgets > 0 ? `${criticalBudgets} Critical` : 'Healthy'}
          </p>
          <div className="mt-2 text-xs font-medium text-slate-500">Budget alert count</div>
        </div>
      </div>

      {/* Forecast Status Widget */}
      {analytics?.forecast && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Monthly Spending Forecast</h3>
            <p className="text-xs text-slate-500 mt-1">Based on telemetry patterns over the past {analytics.forecast.days_of_data} days.</p>
          </div>
          <div className="flex flex-wrap gap-6">
            <div className="min-w-[120px]">
              <span className="text-xs text-slate-400 font-semibold block uppercase">Avg Daily Cost</span>
              <span className="text-lg font-bold text-slate-800">{formatCost(analytics.forecast.avg_daily_cost)}</span>
            </div>
            <div className="min-w-[120px]">
              <span className="text-xs text-slate-400 font-semibold block uppercase">Projected Monthly</span>
              <span className="text-lg font-bold text-slate-800">{formatCost(analytics.forecast.projected_monthly_cost)}</span>
            </div>
            <div className="min-w-[120px]">
              <span className="text-xs text-slate-400 font-semibold block uppercase">Total Budget Limit</span>
              <span className="text-lg font-bold text-slate-800">${analytics.forecast.total_budget_limit.toFixed(2)}</span>
            </div>
            <div className="min-w-[120px]">
              <span className="text-xs text-slate-400 font-semibold block uppercase">Risk Profile</span>
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide border ${
                analytics.forecast.risk_level === 'high'
                  ? 'bg-rose-50 border-rose-100 text-rose-600'
                  : analytics.forecast.risk_level === 'medium'
                  ? 'bg-amber-50 border-amber-100 text-amber-600'
                  : 'bg-emerald-50 border-emerald-100 text-emerald-600'
              }`}>
                {analytics.forecast.risk_level} Risk
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Row 1: Cost vs Budget + Project Cost Breakdown ── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Chart: Cost vs Budget Limits */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-1 text-base font-bold text-slate-900">
            {statuses.length > 0 ? 'Cost vs Budget Limits' : 'Project Spending Analysis'}
          </h3>
          <p className="text-xs text-slate-500 mb-5">
            {statuses.length > 0 ? 'Actual cost compared to configured budget limits.' : 'Cumulative LLM + CI costs per project.'}
          </p>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                  </linearGradient>
                  <linearGradient id="colorLimit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.3}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                  formatter={(v: any) => [formatCost(Number(v)), '']}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: 10, fontSize: 11 }} />
                <Bar name={statuses.length > 0 ? 'Actual Cost' : 'Total Cost'} dataKey="cost" fill="url(#colorCost)" radius={[4, 4, 0, 0]} />
                {statuses.length > 0 && (
                  <Bar name="Budget Limit" dataKey="limit" fill="url(#colorLimit)" radius={[4, 4, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[240px] items-center justify-center text-sm text-slate-400">
              No spending data available yet. <Link to="/logs" className="ml-1 text-cyan-600 hover:underline">View Logs</Link>
            </div>
          )}
        </div>

        {/* Chart: Model Cost Breakdown (Pie) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-1 text-base font-bold text-slate-900">Cost by Model</h3>
          <p className="text-xs text-slate-500 mb-5">Proportional cost share per LLM model used.</p>
          {analytics?.model_costs && analytics.model_costs.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie
                    data={analytics.model_costs}
                    dataKey="total_cost_usd"
                    nameKey="model"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={48}
                    strokeWidth={2}
                  >
                    {analytics.model_costs.map((_: any, index: number) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: 11 }}
                    formatter={(v: any) => [formatCost(Number(v)), 'Cost']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {analytics.model_costs.slice(0, 6).map((m: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs text-slate-600 truncate font-mono">{m.model}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-800 shrink-0">{formatCost(m.total_cost_usd)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">No model usage data yet.</div>
          )}
        </div>
      </div>

      {/* ── Row 2: Token Timeline + Error/Rate Limit Timeline ── */}
      {analytics && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Chart: Token Usage Timeline */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">Token Volume Timeline</h3>
            <p className="text-xs text-slate-500 mb-4">Daily prompt & completion tokens over 30 days.</p>
            <div className="h-[220px] w-full">
              {formattedTimeline.some((t: any) => t.prompt_tokens > 0 || t.completion_tokens > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formattedTimeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPrompt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05}/>
                      </linearGradient>
                      <linearGradient id="colorCompletion" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={9} tickLine={false} interval="preserveStartEnd" />
                    <YAxis stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: 11 }}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                    <Area name="Prompt Input" type="monotone" dataKey="prompt_tokens" stroke="#6366f1" fillOpacity={1} fill="url(#colorPrompt)" />
                    <Area name="Completion Output" type="monotone" dataKey="completion_tokens" stroke="#a855f7" fillOpacity={1} fill="url(#colorCompletion)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">No token data in the last 30 days.</div>
              )}
            </div>
          </div>

          {/* Chart: API Health & Rate Limits */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">API Health & Rate Limits</h3>
            <p className="text-xs text-slate-500 mb-4">Rate limits (HTTP 429) vs other client/provider errors.</p>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={9} tickLine={false} interval="preserveStartEnd" />
                  <YAxis stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: 11 }}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                  <Bar name="Rate Limits (429)" dataKey="rate_limits" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar name="Other Errors" dataKey="other_errors" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart: Horizontal Bar - Cost by Model */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">Total Cost by Model</h3>
            <p className="text-xs text-slate-500 mb-4">Visual spend allocation per individual LLM model.</p>
            <div className="h-[220px] w-full">
              {analytics.model_costs && analytics.model_costs.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.model_costs} layout="vertical" margin={{ top: 10, right: 10, left: 40, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" fontSize={9} tickLine={false} tickFormatter={(v) => `$${v}`} />
                    <YAxis dataKey="model" type="category" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: 11 }}
                      formatter={(v: any) => [formatCost(Number(v)), 'Cost']}
                    />
                    <Bar name="Total Cost" dataKey="total_cost_usd" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">No model usage data available.</div>
              )}
            </div>
          </div>

          {/* Chart: Average Tokens per Project */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">Avg Tokens per Project</h3>
            <p className="text-xs text-slate-500 mb-4">Comparative average token consumption per API call.</p>
            <div className="h-[220px] w-full">
              {analytics.project_averages && analytics.project_averages.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.project_averages} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: 11 }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                    <Bar name="Avg Prompt Tokens" dataKey="avg_prompt_tokens" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    <Bar name="Avg Completion Tokens" dataKey="avg_completion_tokens" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">No project usage data available.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Row 3: Budget Status + Team Spending ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Budget Status Section */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Budget Status</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {statuses.length} Active
            </span>
          </div>
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {statuses.map((s) => {
              const fillRatio = Math.min(s.ratio, 1)
              return (
                <div key={s.budget_id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 hover:border-slate-300 transition">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-slate-800">Budget #{s.budget_id}</p>
                    <span className={`rounded-lg px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide border ${
                      s.level === 'critical'
                        ? 'bg-rose-50 border-rose-100 text-rose-600'
                        : s.level === 'warning'
                        ? 'bg-amber-50 border-amber-100 text-amber-600'
                        : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                    }`}>
                      {s.level}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-medium">
                    <span>{formatCost(s.total_cost_usd)} spent</span>
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
              <div className="py-8 text-center">
                <p className="text-sm text-slate-400">No budgets configured yet.</p>
                <Link to="/admin" className="mt-2 inline-block text-xs text-cyan-600 hover:underline font-medium">
                  Set up budgets in Admin Panel →
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Team Member Spending Section */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Team Spending</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              By Member
            </span>
          </div>
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {analytics?.member_costs?.map((m: any) => (
              <div key={m.user_id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 hover:border-slate-300 transition flex items-center justify-between">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="font-semibold text-slate-800 truncate">{m.full_name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{m.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-indigo-600 font-mono">{formatCost(m.total_spent_usd)}</p>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100/50">{m.role}</span>
                </div>
              </div>
            ))}
            {(!analytics?.member_costs || analytics.member_costs.length === 0) && (
              <p className="text-sm text-slate-400 py-4 text-center">No member costs available.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
