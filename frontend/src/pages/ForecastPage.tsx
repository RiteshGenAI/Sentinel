import { useEffect, useState } from 'react'
import api from '../lib/api'
import type { Forecast } from '../types'

export default function ForecastPage() {
  const [forecast, setForecast] = useState<Forecast | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get<Forecast>('/forecast/')
        setForecast(data)
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Failed to load forecast')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-8 py-12">
        <div className="flex flex-col items-center justify-center space-y-4 py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-650" />
          <p className="text-sm font-medium text-slate-500">Loading cost forecasting model...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-10 space-y-8 bg-slate-50">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Cost Forecast</h2>
        <p className="text-sm text-slate-500">Predictive spending analytics based on historical data.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 font-medium">
          {error}
        </div>
      )}

      {forecast && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Average Daily Cost */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 relative overflow-hidden group hover:border-slate-350 transition duration-300 shadow-sm">
            <div className="absolute top-0 right-0 h-24 w-24 -mr-8 -mt-8 rounded-full bg-cyan-100/40 blur-2xl" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-450">Avg Daily Cost</p>
            <p className="mt-4 text-3xl font-black text-slate-900 tracking-tight">${forecast.avg_daily_cost.toFixed(4)}</p>
            <div className="mt-2 text-xs font-medium text-slate-500">Based on past {forecast.days_of_data} days</div>
          </div>

          {/* Projected Monthly */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 relative overflow-hidden group hover:border-slate-350 transition duration-300 shadow-sm">
            <div className="absolute top-0 right-0 h-24 w-24 -mr-8 -mt-8 rounded-full bg-indigo-100/40 blur-2xl" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-450">Projected Monthly Cost</p>
            <p className="mt-4 text-3xl font-black text-slate-900 tracking-tight">${forecast.projected_monthly_cost.toFixed(4)}</p>
            <div className="mt-2 text-xs font-medium text-slate-500">Estimated monthly run rate</div>
          </div>

          {/* Budget Limit */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 relative overflow-hidden group hover:border-slate-350 transition duration-300 shadow-sm">
            <div className="absolute top-0 right-0 h-24 w-24 -mr-8 -mt-8 rounded-full bg-emerald-100/40 blur-2xl" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-450">Total Budget Limit</p>
            <p className="mt-4 text-3xl font-black text-slate-900 tracking-tight">${forecast.total_budget_limit.toFixed(2)}</p>
            <div className="mt-2 text-xs font-medium text-slate-500">Configured ceiling limit</div>
          </div>

          {/* Risk Level */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 relative overflow-hidden group hover:border-slate-350 transition duration-300 shadow-sm">
            <div className="absolute top-0 right-0 h-24 w-24 -mr-8 -mt-8 rounded-full bg-rose-100/40 blur-2xl" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-450">Risk Assessment</p>
            <div className="mt-4 flex items-center gap-3">
              <span className={`text-3xl font-black tracking-tight capitalize ${
                forecast.risk_level === 'high'
                  ? 'text-rose-600'
                  : forecast.risk_level === 'medium'
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}>
                {forecast.risk_level}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-3xs font-extrabold uppercase tracking-wider border ${
                forecast.risk_level === 'high'
                  ? 'bg-rose-50 border-rose-100 text-rose-600'
                  : forecast.risk_level === 'medium'
                  ? 'bg-amber-50 border-amber-100 text-amber-600'
                  : 'bg-emerald-50 border-emerald-100 text-emerald-600'
              }`}>
                Status
              </span>
            </div>
            <div className="mt-2 text-xs font-medium text-slate-500">Projected budget overrun risk</div>
          </div>

          {/* Dataset Details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 md:col-span-2 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Model Confidence & Details</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Forecasting models are currently running linear regressions over a sliding historical window of <span className="font-semibold text-slate-700">{forecast.days_of_data} days</span> of aggregated token costing telemetry. Risk level computes probability of hitting the configured budget limits within the remaining calendar billing cycle.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
