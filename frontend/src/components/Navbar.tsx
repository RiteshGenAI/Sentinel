import { Link, useLocation } from 'react-router-dom'

type Props = { user?: { full_name: string; role: string } | null; onLogout: () => void }

export default function Navbar({ user, onLogout }: Props) {
  const location = useLocation()
  
  const isActive = (path: string) => location.pathname === path

  return (
    <header className="sticky top-0 z-50 border-b border-slate-250 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-8 py-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight hover:opacity-90 transition">
            {/* Mini Shield Logo Icon */}
            <svg className="h-6 w-6" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="navPrimaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#6366f1"/>
                  <stop offset="100%" stop-color="#06b6d4"/>
                </linearGradient>
                <linearGradient id="navInnerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#a78bfa"/>
                  <stop offset="100%" stop-color="#22d3ee"/>
                </linearGradient>
              </defs>
              <path d="M 120,20 L 205,65 L 205,140 C 205,185 120,220 120,220 C 120,220 35,185 35,140 L 35,65 Z" stroke="url(#navPrimaryGrad)" stroke-width="12" stroke-linejoin="round" />
              <path d="M 55,120 C 75,85 100,70 120,70 C 140,70 165,85 185,120 C 165,155 140,170 120,170 C 100,170 75,155 55,120 Z" stroke="url(#navInnerGrad)" stroke-width="6" stroke-linejoin="round" />
              <circle cx="120" cy="120" r="22" fill="url(#navPrimaryGrad)" />
              <circle cx="120" cy="120" r="8" fill="#1e1b4b" />
            </svg>
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 bg-clip-text text-transparent font-black" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
              Sentinel
            </span>
          </Link>
          <span className="h-4 w-[1px] bg-slate-200 hidden sm:block"></span>
          <p className="hidden text-xs font-semibold text-slate-500 sm:block uppercase tracking-wider">Cost Intelligence</p>
        </div>
        
        <div className="flex items-center gap-6 text-sm">
          {user && (
            <>
              <nav className="flex items-center gap-1 sm:gap-2">
                <Link
                  to="/dashboard"
                  className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                    isActive('/dashboard')
                      ? 'bg-slate-100 text-indigo-600'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/50'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/forecast"
                  className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                    isActive('/forecast')
                      ? 'bg-slate-100 text-indigo-600'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/50'
                  }`}
                >
                  Forecast
                </Link>
                <Link
                  to="/providers"
                  className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                    isActive('/providers')
                      ? 'bg-slate-100 text-indigo-600'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/50'
                  }`}
                >
                  Providers
                </Link>
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                      isActive('/admin')
                        ? 'bg-slate-100 text-indigo-600'
                        : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/50'
                    }`}
                  >
                    Admin
                  </Link>
                )}
              </nav>
              
              <div className="h-5 w-[1px] bg-slate-200"></div>
              
              <div className="flex items-center gap-3">
                <span className="hidden md:inline-block text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                  {user.full_name} · <span className="capitalize text-indigo-600">{user.role}</span>
                </span>
                <button
                  onClick={onLogout}
                  className="rounded-lg bg-rose-50 border border-rose-100 text-rose-600 px-3.5 py-1.5 text-xs font-bold hover:bg-rose-500 hover:text-white transition duration-200"
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
