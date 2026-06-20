import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AdminPage from './pages/AdminPage'
import ForecastPage from './pages/ForecastPage'
import ProviderKeysPage from './pages/ProviderKeysPage'
import api, { setToken } from './lib/api'
import type { TokenResponse, User } from './types'

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
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage onLogin={handleLogin} />} />
        <Route path="/dashboard" element={user ? <DashboardPage user={user} /> : <Navigate to="/login" />} />
        <Route path="/admin" element={user?.role === 'admin' ? <AdminPage /> : <Navigate to="/dashboard" />} />
        <Route path="/forecast" element={user ? <ForecastPage /> : <Navigate to="/login" />} />
        <Route path="/providers" element={user ? <ProviderKeysPage /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} />} />
      </Routes>
    </div>
  )
}

export default App
