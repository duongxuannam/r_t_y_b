import { observer } from '@legendapp/state/react'
import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import ThemeToggle from './components/ThemeToggle'
import { Badge } from './components/ui/badge'
import { buttonVariants } from './components/ui/button'
import { cn } from './lib/utils'
import { appState, authActions, themeOptions } from './state/appState'

const App = observer(() => {
  const theme = appState.theme.get()
  const authUser = appState.auth.user.get()
  const isAuthed = appState.auth.accessToken.get().length > 0

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [theme])


  return (
    <div className="min-h-screen bg-aurora">
      <div className="bg-grid">
        <div className="flex flex-col max-w-6xl min-h-screen gap-8 px-4 py-6 mx-auto sm:px-6 sm:py-8">
          <header className="relative z-20 flex flex-col items-start gap-4 px-5 py-4 glass-panel fade-up sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs border-primary/40 text-primary sm:text-sm">
                Rust Todo
              </Badge>
              <span className="text-lg font-semibold font-display sm:text-xl">Todo Pulse</span>
            </div>
            <nav className="flex items-center w-full gap-2 text-xs sm:w-auto sm:text-sm">
              {[
                { to: '/app', label: 'Main App' },
                { to: '/about', label: 'About' },
                { to: '/auth', label: 'Auth' },
              ].map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      buttonVariants({
                        variant: isActive ? 'default' : 'ghost',
                        size: 'sm',
                      }),
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
            <div className="flex flex-wrap items-center w-full gap-2 sm:w-auto sm:flex-nowrap sm:gap-3">
              <ThemeToggle options={themeOptions} value={theme} />
              {isAuthed ? (
                <div className="flex items-center gap-2">
                  <div className="max-w-[160px] truncate text-xs text-muted-foreground sm:max-w-none">
                    {authUser.email}
                  </div>
                  <button
                    className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                    onClick={authActions.logout}
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Guest mode</span>
              )}
            </div>
          </header>

          <main className="relative z-0 fade-up fade-delay-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
})

export default App
