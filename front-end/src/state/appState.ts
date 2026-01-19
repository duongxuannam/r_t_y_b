import { observable } from '@legendapp/state'

const storageKeys = {
  theme: 'todo-pulse-theme',
  language: 'todo-pulse-language',
}

const readStorage = <T,>(key: string): T | null => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

const writeStorage = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

export const themeOptions = [
  { id: 'light', label: 'Light', color: '#f8fafc' },
  { id: 'dark', label: 'Dark', color: '#0f172a' },
]

const allowedThemes = ['light', 'dark'] as const
type ThemeId = (typeof allowedThemes)[number]

const allowedLanguages = ['en', 'vi'] as const
export type LanguageId = (typeof allowedLanguages)[number]

const normalizeTheme = (value: string | null | undefined): ThemeId =>
  allowedThemes.includes(value as ThemeId) ? (value as ThemeId) : 'light'

const detectSystemTheme = (): ThemeId => {
  if (typeof window === 'undefined') return 'light'
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches
  return prefersDark ? 'dark' : 'light'
}

const normalizeLanguage = (value: string | null | undefined): LanguageId =>
  allowedLanguages.includes(value as LanguageId) ? (value as LanguageId) : 'en'

const detectSystemLanguage = (): LanguageId => {
  if (typeof window === 'undefined') return 'en'
  const language = window.navigator?.language?.toLowerCase() ?? 'en'
  return language.startsWith('vi') ? 'vi' : 'en'
}

export const appState = observable({
  theme: 'light' as ThemeId,
  language: 'en' as LanguageId,
  app: {
    headerHidden: false,
    drawerOpen: false
  },
  auth: {
    accessToken: '',
    user: {
      id: '',
      email: '',
    },
  },
})

export const authActions = {
  setAuth(payload: { accessToken: string; user: { id: string; email: string } }) {
    appState.auth.accessToken.set(payload.accessToken)
    appState.auth.user.set(payload.user)
  },
  logout() {
    appState.auth.accessToken.set('')
    appState.auth.user.set({ id: '', email: '' })
  },
}

export const themeActions = {
  hydrate() {
    const stored = readStorage<string>(storageKeys.theme)
    if (stored && allowedThemes.includes(stored as ThemeId)) {
      const normalized = normalizeTheme(stored)
      appState.theme.set(normalized)
      if (stored !== normalized) {
        writeStorage(storageKeys.theme, normalized)
      }
      return
    }
    const detected = detectSystemTheme()
    appState.theme.set(detected)
    if (stored) {
      writeStorage(storageKeys.theme, detected)
    }
  },
  setTheme(theme: string) {
    const normalized = normalizeTheme(theme)
    appState.theme.set(normalized)
    writeStorage(storageKeys.theme, normalized)
  },
}

export const languageActions = {
  hydrate() {
    const stored = readStorage<string>(storageKeys.language)
    if (stored && allowedLanguages.includes(stored as LanguageId)) {
      const normalized = normalizeLanguage(stored)
      appState.language.set(normalized)
      if (stored !== normalized) {
        writeStorage(storageKeys.language, normalized)
      }
      return
    }
    const detected = detectSystemLanguage()
    appState.language.set(detected)
    if (stored) {
      writeStorage(storageKeys.language, detected)
    }
  },
  setLanguage(language: string) {
    const normalized = normalizeLanguage(language)
    appState.language.set(normalized)
    writeStorage(storageKeys.language, normalized)
  },
  toggleLanguage() {
    const next = appState.language.get() === 'en' ? 'vi' : 'en'
    appState.language.set(next)
    writeStorage(storageKeys.language, next)
  },
}

export const appActions = {
  setHeaderHidden(hidden: boolean) {
    appState.app.headerHidden.set(hidden)
  },
  setDrawerOpen(open: boolean) {
    appState.app.drawerOpen.set(open)
  },
}
