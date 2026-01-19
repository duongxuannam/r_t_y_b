import { Computed, observer } from '@legendapp/state/react'
import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Globe } from 'lucide-react'
import ThemeToggle from './components/ThemeToggle'
import { Badge } from './components/ui/badge'
import { buttonVariants } from './components/ui/button-variants'
import { MessageHost } from './components/ui/message-host'
import { t, getNextLanguage } from './lib/i18n'
import type { TranslationKey } from './lib/i18n'
import { cn } from './lib/utils'
import { api } from './services/api'
import { appActions, appState, authActions, languageActions, themeOptions } from './state/appState'

const routes: Array<{ to: string; labelKey: TranslationKey }> = [
  { to: '/app', labelKey: 'nav.mainApp' },
  { to: '/about', labelKey: 'nav.about' },
  { to: '/auth', labelKey: 'nav.auth' },
]

const App = observer(() => {
  const theme = appState.theme.get()
  const language = appState.language.get()
  const authUser = appState.auth.user.get()
  const isAuthed = appState.auth.accessToken.get().length > 0
  const queryClient = useQueryClient()
  const nextLanguage = getNextLanguage(language)
  const currentLanguageLabel = language === 'en' ? t('language.english') : t('language.vietnamese')
  const languageSwitchLabel =
    nextLanguage === 'en' ? t('language.switchToEnglish') : t('language.switchToVietnamese')
  const mobileLanguageLabel = `${t('language.label')}: ${currentLanguageLabel}`
  const localizedThemeOptions = themeOptions.map((option) => ({
    ...option,
    label: option.id === 'light' ? t('theme.light') : t('theme.dark'),
  }))

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [theme])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', language)
    }
  }, [language])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    let lastScrollY = window.scrollY
    const onScroll = () => {
      if (window.innerWidth >= 640) {
        appActions.setHeaderHidden(false)
        lastScrollY = window.scrollY
        return
      }

      const currentY = window.scrollY
      const delta = currentY - lastScrollY

      if (delta > 4 && currentY > 80) {
        appActions.setHeaderHidden(true)
      } else if (delta < -4) {
        appActions.setHeaderHidden(false)
      }

      lastScrollY = currentY
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = async () => {
    try {
      await api.logout()
    } catch {
      // Ignore logout failures; local state will be cleared.
    }
    authActions.logout()
    queryClient.removeQueries({ queryKey: ['todos'], exact: true })
  }

  return (
    <div className="min-h-screen bg-aurora">
      <div className="px-8 bg-grid sm:px-6">
        <Computed>{
          () => {
            const headerHidden = appState.app.headerHidden.get()
            return <header
              className={cn(
                'app-header fixed left-0 right-0 top-6 z-40  transition-transform duration-300 sm:px-6 px-8',
                headerHidden ? '-translate-y-[120%] sm:translate-y-0' : 'translate-y-0',
              )}
            >
              <div className="relative z-20 mx-auto max-w-7xl glass-panel fade-up">
                <div className="grid gap-3 px-5 py-3 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-3">
                  <div className="flex items-center justify-between gap-3 sm:justify-start">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs border-primary/40 text-primary sm:text-sm">
                        Rust Todo
                      </Badge>
                      <span className="text-lg font-semibold font-display sm:text-xl">Todo Pulse</span>
                    </div>
                    <Computed>
                      {() => {
                        const drawerOpen = appState.app.drawerOpen.get()
                        return <button
                          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'sm:hidden')}
                          type="button"
                          aria-label={t('header.openMenu')}
                          aria-expanded={drawerOpen}
                          onClick={() => {
                            appActions.setDrawerOpen(true)
                            appActions.setHeaderHidden(false)
                          }}
                        >
                          {t('header.menu')}
                        </button>
                      }}
                    </Computed>
                  </div>
                  <div className="hidden items-center gap-1.5 sm:flex">
                    {routes.map((link) => (
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
                        {t(link.labelKey)}
                      </NavLink>
                    ))}
                    <div className="flex items-center gap-2 ml-1">
                      <button
                        className={buttonVariants({ variant: 'ghost', size: 'icon' })}
                        type="button"
                        aria-label={languageSwitchLabel}
                        title={languageSwitchLabel}
                        onClick={() => languageActions.toggleLanguage()}
                      >
                        <Globe className="w-4 h-4" />
                      </button>
                      <ThemeToggle options={localizedThemeOptions} value={theme} />
                      {isAuthed ? (
                        <div className="flex items-center gap-2">
                          <div className="max-w-[140px] truncate text-xs text-muted-foreground sm:max-w-none">
                            {authUser.email}
                          </div>
                          <button
                            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                            onClick={handleLogout}
                          >
                            {t('header.logout')}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t('header.guest')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </header>
          }
        }</Computed>
        <MessageHost />

        <Computed>
          {() => {
            const drawerOpen = appState.app.drawerOpen.get()
            return <>
              {drawerOpen ? (
                <div className="fixed inset-0 z-[60] sm:hidden" role="dialog" aria-modal="true">
                  <button
                    className="absolute inset-0 bg-slate-950/30"
                    aria-label={t('header.closeMenu')}
                    type="button"
                    onClick={() => appActions.setDrawerOpen(false)}
                  />
                  <div className="absolute right-4 top-6 w-[calc(100%-2rem)] rounded-3xl border border-white/30 bg-background/95 p-4 shadow-2xl backdrop-blur sm:hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{t('header.navigate')}</span>
                      <button
                        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                        type="button"
                        onClick={() => appActions.setDrawerOpen(false)}
                      >
                        {t('header.close')}
                      </button>
                    </div>
                    <div className="grid gap-2 mt-3">
                      {routes.map((link) => (
                        <NavLink
                          key={link.to}
                          to={link.to}
                          onClick={() => appActions.setDrawerOpen(false)}
                          className={({ isActive }) =>
                            cn(
                              buttonVariants({
                                variant: isActive ? 'default' : 'ghost',
                                size: 'sm',
                              }),
                              'justify-start',
                            )
                          }
                        >
                          {t(link.labelKey)}
                        </NavLink>
                      ))}
                      <button
                        className={cn(
                          buttonVariants({ variant: 'ghost', size: 'sm' }),
                          'justify-start',
                        )}
                        type="button"
                        onClick={() => languageActions.toggleLanguage()}
                      >
                        {mobileLanguageLabel}
                      </button>
                    </div>
                    <div className="flex flex-col gap-3 mt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          {t('header.theme')}
                        </span>
                        <ThemeToggle options={localizedThemeOptions} value={theme} />
                      </div>
                      {isAuthed ? (
                        <div className="flex items-center justify-between gap-2">
                          <div className="max-w-[160px] truncate text-xs text-muted-foreground">
                            {authUser.email}
                          </div>
                          <button
                            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                            onClick={() => {
                              handleLogout()
                              appActions.setDrawerOpen(false)
                            }}
                          >
                            {t('header.logout')}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t('header.guestMode')}</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          }}
        </Computed>
        <div className="flex flex-col min-h-screen gap-8 pt-24 pb-6 mx-auto max-w-7xl sm:pb-8 sm:pt-28">

          <main className="relative z-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div >
  )
})

export default App
