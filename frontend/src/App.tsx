import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import api, { setToken } from './lib/api'
import type { TokenResponse, User } from './types'

// Lazy loaded page components for bundle size optimization
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const ForecastPage = lazy(() => import('./pages/ForecastPage'))
const ProviderKeysPage = lazy(() => import('./pages/ProviderKeysPage'))

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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar user={user} onLogout={logout} />
      <Suspense fallback={
        <div className="mx-auto max-w-6xl px-6 py-20 flex flex-col items-center justify-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-600" />
          <p className="text-sm font-medium text-slate-500">Loading page...</p>
        </div>
      }>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage onLogin={handleLogin} />} />
          <Route path="/dashboard" element={user ? <DashboardPage user={user} /> : <Navigate to="/login" />} />
          <Route path="/admin" element={user?.role === 'admin' ? <AdminPage /> : <Navigate to="/dashboard" />} />
          <Route path="/forecast" element={user ? <ForecastPage /> : <Navigate to="/login" />} />
          <Route path="/providers" element={user ? <ProviderKeysPage /> : <Navigate to="/login" />} />
          <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} />} />
        </Routes>
      </Suspense>
    </div>
  )
}

export default App
