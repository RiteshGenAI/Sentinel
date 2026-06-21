import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

type Props = { user?: { full_name: string; role: string } | null; onLogout: () => void }

export default function Sidebar({ user, onLogout }: Props) {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [providersExpanded, setProvidersExpanded] = useState(true)

  const isActive = (path: string) => location.pathname === path
  const isProvidersSubActive = (path: string) => location.pathname === path
  const isAnyProvidersActive = location.pathname.startsWith('/providers')

  const toggleMobile = () => setMobileOpen(!mobileOpen)

  const navItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
        </svg>
      )
    },
    {
      label: 'Forecast',
      path: '/forecast',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    }
  ]

  const providerSubItems = [
    {
      label: 'Overview',
      path: '/providers',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      )
    },
    {
      label: 'Master Keys',
      path: '/providers/master-keys',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    },
    {
      label: 'Scoped Keys',
      path: '/providers/child-keys',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      )
    }
  ]

  const content = (
    <div className="flex h-full flex-col justify-between p-6">
      {/* Brand & Menu */}
      <div className="space-y-8">
        {/* Shield Logo */}
        <Link to="/" className="flex flex-col gap-2 hover:opacity-90 transition px-2">
          <div className="flex items-center gap-3">
            <svg className="h-8 w-8 shrink-0" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="navPrimaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1"/>
                  <stop offset="100%" stopColor="#06b6d4"/>
                </linearGradient>
                <linearGradient id="navInnerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a78bfa"/>
                  <stop offset="100%" stopColor="#22d3ee"/>
                </linearGradient>
              </defs>
              <path d="M 120,20 L 205,65 L 205,140 C 205,185 120,220 120,220 C 120,220 35,185 35,140 L 35,65 Z" stroke="url(#navPrimaryGrad)" strokeWidth="12" strokeLinejoin="round" />
              <path d="M 55,120 C 75,85 100,70 120,70 C 140,70 165,85 185,120 C 165,155 140,170 120,170 C 100,170 75,155 55,120 Z" stroke="url(#navInnerGrad)" strokeWidth="6" strokeLinejoin="round" />
              <circle cx="120" cy="120" r="22" fill="url(#navPrimaryGrad)" />
              <circle cx="120" cy="120" r="8" fill="#1e1b4b" />
            </svg>
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-700 bg-clip-text text-transparent font-black text-2xl tracking-tight leading-none" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
              Sentinel
            </span>
          </div>
          <span className="text-[12px] font-black uppercase text-black mt-1 leading-none whitespace-nowrap" style={{ letterSpacing: '0.22em', marginRight: '-0.22em' }}>
            Cost Intelligence
          </span>
        </Link>

        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                isActive(item.path)
                  ? 'bg-indigo-50 text-indigo-600 border-l-4 border-indigo-600 pl-3'
                  : 'text-slate-650 hover:bg-slate-100/60 hover:text-slate-900'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}

          {/* Providers Item with Nested Links */}
          <div className="space-y-1">
            <button
              onClick={() => setProvidersExpanded(!providersExpanded)}
              className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition ${
                isAnyProvidersActive
                  ? 'bg-slate-50 text-indigo-600'
                  : 'text-slate-650 hover:bg-slate-100/60 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-3">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Providers
              </span>
              <svg
                className={`h-4 w-4 transition-transform duration-200 ${providersExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {providersExpanded && (
              <div className="pl-4 space-y-1 border-l border-slate-100 ml-6">
                {providerSubItems.map((sub) => (
                  <Link
                    key={sub.label}
                    to={sub.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      isProvidersSubActive(sub.path)
                        ? 'bg-indigo-50/70 text-indigo-600'
                        : 'text-slate-550 hover:bg-slate-100/40 hover:text-slate-900'
                    }`}
                  >
                    {sub.icon}
                    {sub.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/logs"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              isActive('/logs')
                ? 'bg-indigo-50 text-indigo-600 border-l-4 border-indigo-600 pl-3'
                : 'text-slate-650 hover:bg-slate-100/60 hover:text-slate-900'
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Logs
          </Link>

          {user?.role === 'admin' && (
            <Link
              to="/admin"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                isActive('/admin')
                  ? 'bg-indigo-50 text-indigo-600 border-l-4 border-indigo-600 pl-3'
                  : 'text-slate-655 hover:bg-slate-100/60 hover:text-slate-900'
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Admin Panel
            </Link>
          )}
        </nav>
      </div>

      {/* Footer Profile & Logout */}
      {user && (
        <div className="space-y-4 border-t border-slate-100 pt-6">
          <div className="flex items-center justify-between gap-2 px-2">
            <span className="text-sm font-bold text-slate-850 truncate">{user.full_name}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50/80 px-2 py-1 rounded-md border border-indigo-100 shadow-2xs leading-none">
              {user.role}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-650 py-3 text-xs font-bold hover:bg-rose-500 hover:text-white transition duration-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Mobile Top Header */}
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-slate-200 bg-white/90 backdrop-blur-md flex items-center justify-between px-6 z-30 lg:hidden">
        <Link to="/" className="flex items-center gap-2.5 text-xl font-extrabold">
          <span className="bg-gradient-to-r from-indigo-600 to-cyan-700 bg-clip-text text-transparent font-black">
            Sentinel
          </span>
        </Link>
        <button
          onClick={toggleMobile}
          className="rounded-lg p-2 hover:bg-slate-100 transition text-slate-600"
          aria-label="Toggle Menu"
        >
          {mobileOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </header>

      {/* Desktop Fixed Sidebar */}
      <aside className="fixed top-0 bottom-0 left-0 z-40 w-64 border-r border-slate-200 bg-white hidden lg:block">
        {content}
      </aside>

      {/* Mobile Drawer Slideout overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {content}
      </aside>
    </>
  )
}
