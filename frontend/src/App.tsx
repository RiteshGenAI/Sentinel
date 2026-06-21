import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import api, { setToken } from './lib/api'
import type { TokenResponse, User } from './types'

// Lazy loaded page components for bundle size optimization
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const ForecastPage = lazy(() => import('./pages/ForecastPage'))
const ProvidersOverviewPage = lazy(() => import('./pages/providers/ProvidersOverviewPage'))
const MasterKeysPage = lazy(() => import('./pages/providers/MasterKeysPage'))
const ChildKeysPage = lazy(() => import('./pages/providers/ChildKeysPage'))
const TelemetryLogsPage = lazy(() => import('./pages/TelemetryLogsPage'))

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    navigate('/login')
  }, [navigate])

  useEffect(() => {
    const savedSession = localStorage.getItem('session')
    if (savedSession) {
      try {
        const parsed: TokenResponse = JSON.parse(savedSession)
        setToken(parsed.access_token)
        setUser(parsed.user)
      } catch {
        setToken(null)
        localStorage.removeItem('session')
      }
    }
    setLoading(false)
  }, [])

  const handleLogin = (data: TokenResponse) => {
    setToken(data.access_token)
    setUser(data.user)
    localStorage.setItem('session', JSON.stringify(data))
    navigate('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {user && <Sidebar user={user} onLogout={logout} />}
      <div className={`flex-1 min-w-0 ${user ? 'pt-16 lg:pt-0 lg:pl-64' : ''}`}>
        <Suspense fallback={
          <div className="mx-auto w-full max-w-[1440px] px-8 py-20 flex flex-col items-center justify-center space-y-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-600" />
            <p className="text-sm font-medium text-slate-500">Loading page...</p>
          </div>
        }>
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage onLogin={handleLogin} />} />
            <Route path="/dashboard" element={user ? <DashboardPage user={user} /> : <Navigate to="/login" />} />
            <Route path="/admin" element={user?.role === 'admin' ? <AdminPage /> : <Navigate to="/dashboard" />} />
            <Route path="/forecast" element={user ? <ForecastPage /> : <Navigate to="/login" />} />
            
            {/* Split Provider Routes */}
            <Route path="/providers" element={user ? <ProvidersOverviewPage /> : <Navigate to="/login" />} />
            <Route path="/providers/master-keys" element={user ? <MasterKeysPage /> : <Navigate to="/login" />} />
            <Route path="/providers/child-keys" element={user ? <ChildKeysPage /> : <Navigate to="/login" />} />
            
            <Route path="/logs" element={user ? <TelemetryLogsPage /> : <Navigate to="/login" />} />
            <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  )
}

export default App

