import { observer } from '@legendapp/state/react';
import { NavLink, Outlet } from 'react-router-dom';
import ThemeToggle from './components/ThemeToggle';
import { appState, authActions, themeOptions } from './state/appState';

const App = observer(() => {
  const theme = appState.theme.get()
  const authUser = appState.auth.user.get()
  const isAuthed = appState.auth.accessToken.get().length > 0

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme)
  }

  return (
    <div className="min-h-screen bg-aurora">
      <div className="bg-grid">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-8">
          <header className="glass-panel fade-up relative z-20 flex flex-wrap items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="badge badge-primary badge-outline">Rust Todo</div>
              <span className="font-display text-xl font-semibold">Todo Pulse</span>
            </div>
            <nav className="flex flex-wrap items-center gap-2 text-sm">
              {[
                { to: '/app', label: 'Main App' },
                { to: '/about', label: 'About' },
                { to: '/auth', label: 'Auth' },
              ].map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `btn btn-sm ${isActive ? 'btn-primary text-primary-content' : 'btn-ghost'}`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <ThemeToggle options={themeOptions} value={theme} />
              {isAuthed ? (
                <div className="flex items-center gap-2">
                  <div className="text-xs text-base-content/60">{authUser.email}</div>
                  <button className="btn btn-ghost btn-sm" onClick={authActions.logout}>
                    Logout
                  </button>
                </div>
              ) : (
                <span className="text-xs text-base-content/60">Guest mode</span>
              )}
            </div>
          </header>

          <main className="fade-up fade-delay-1 relative z-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
})

export default App
