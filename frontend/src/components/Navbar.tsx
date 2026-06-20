import { Link, useLocation } from 'react-router-dom'

type Props = { user?: { full_name: string; role: string } | null; onLogout: () => void }

export default function Navbar({ user, onLogout }: Props) {
  const location = useLocation()
  
  const isActive = (path: string) => location.pathname === path

  return (
    <header className="sticky top-0 z-50 border-b border-slate-250 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 hover:opacity-90 transition">
            <span className="bg-gradient-to-r from-cyan-600 to-indigo-650 bg-clip-text text-transparent">Sentinel</span>
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
