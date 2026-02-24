import { Computed, observer } from '@legendapp/state/react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import ThemeToggle from './components/ThemeToggle'
import AiAssistant from './components/AiAssistant'
import { Badge } from './components/ui/badge'
import { buttonVariants } from './components/ui/button-variants'
import { MessageHost } from './components/ui/message-host'
import { t } from './lib/i18n'
import type { TranslationKey } from './lib/i18n'
import { cn } from './lib/utils'
import { api } from './services/api'
import { appActions, appState, authActions, languageActions, themeOptions } from './state/appState'

const TOUR_STORAGE_KEY = 'todo-pulse-tour-seen'

const routes = [
  { to: '/app', labelKey: 'nav.mainApp' },
  { to: '/about', labelKey: 'nav.about' },
  { to: '/auth', labelKey: 'nav.auth' },
] as const satisfies ReadonlyArray<{ to: string; labelKey: TranslationKey }>

const tourSteps = [
  {
    titleKey: 'tour.step.welcome.title',
    descriptionKey: 'tour.step.welcome.description',
  },
  {
    titleKey: 'tour.step.auth.title',
    descriptionKey: 'tour.step.auth.description',
  },
  {
    titleKey: 'tour.step.todos.title',
    descriptionKey: 'tour.step.todos.description',
  },
] as const satisfies ReadonlyArray<{ titleKey: TranslationKey; descriptionKey: TranslationKey }>

const LanguageMenu = ({
  buttonClassName,
  menuClassName,
}: {
  buttonClassName?: string
  menuClassName?: string
}) => {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const language = appState.language.get()
  const currentCode = language.toUpperCase()
  const options: Array<{ id: 'en' | 'vi'; label: string }> = [
    { id: 'en', label: t('language.english') },
    { id: 'vi', label: t('language.vietnamese') },
  ]

  useEffect(() => {
    if (!open) return undefined
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={menuRef}>
      <button
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'sm' }),
          'flex items-center gap-2 text-xs font-semibold tracking-[0.2em]',
          buttonClassName,
        )}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        title={t('language.label')}
      >
        <span className="inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-full border border-border bg-card/80 px-2">
          {currentCode}
        </span>
        <ChevronDown className="h-4 w-4 opacity-70" />
      </button>
      {open ? (
        <div
          role="menu"
          className={cn(
            'absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-2xl border border-border/70 bg-background/95 shadow-lg backdrop-blur',
            menuClassName,
          )}
        >
          {options.map((option) => (
            <button
              key={option.id}
              role="menuitem"
              className={cn(
                'flex w-full items-center justify-between px-3 py-2 text-sm transition hover:bg-accent/60',
                language === option.id ? 'text-foreground' : 'text-muted-foreground',
              )}
              type="button"
              onClick={() => {
                languageActions.setLanguage(option.id)
                setOpen(false)
              }}
            >
              <span>{option.label}</span>
              <span className="text-xs font-semibold tracking-[0.2em]">{option.id.toUpperCase()}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

const App = observer(() => {
  const theme = appState.theme.get()
  const language = appState.language.get()
  const authUser = appState.auth.user.get()
  const isAuthed = appState.auth.accessToken.get().length > 0
  const queryClient = useQueryClient()
  const [tourOpen, setTourOpen] = useState(false)
  const [tourStep, setTourStep] = useState(0)
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
      return
    }
    const seen = window.localStorage.getItem(TOUR_STORAGE_KEY)
    if (!seen) {
      setTourOpen(true)
      setTourStep(0)
    }
  }, [])

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
    queryClient.removeQueries({ queryKey: ['users'], exact: true })
  }

  const markTourSeen = () => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(TOUR_STORAGE_KEY, 'true')
  }

  const handleTourClose = () => {
    setTourOpen(false)
    markTourSeen()
  }

  const handleTourNext = () => {
    if (tourStep >= tourSteps.length - 1) {
      handleTourClose()
      return
    }
    setTourStep((prev) => prev + 1)
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
                      <LanguageMenu />
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
        <AiAssistant />
        {tourOpen ? (
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-8" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/20 bg-background/95 p-6 shadow-2xl sm:p-8">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    {t('tour.step')} {tourStep + 1} / {tourSteps.length}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold">{t('tour.title')}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{t('tour.subtitle')}</p>
                </div>
                <button
                  className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                  type="button"
                  onClick={handleTourClose}
                >
                  {t('tour.skip')}
                </button>
              </div>

              <div className="mt-6 rounded-2xl border border-border/60 bg-card/80 p-4">
                <h3 className="text-lg font-semibold">{t(tourSteps[tourStep].titleKey)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(tourSteps[tourStep].descriptionKey)}</p>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                  type="button"
                  onClick={() => setTourStep((prev) => Math.max(0, prev - 1))}
                  disabled={tourStep === 0}
                >
                  {t('tour.back')}
                </button>
                <button
                  className={buttonVariants({ variant: 'default', size: 'sm' })}
                  type="button"
                  onClick={handleTourNext}
                >
                  {tourStep === tourSteps.length - 1 ? t('tour.finish') : t('tour.next')}
                </button>
              </div>
            </div>
          </div>
        ) : null}

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
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          {t('language.label')}
                        </span>
                        <LanguageMenu
                          buttonClassName="h-8 px-2"
                          menuClassName="left-auto right-0 mt-3 w-40"
                        />
                      </div>
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
