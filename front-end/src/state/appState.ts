import { observable } from '@legendapp/state'

const storageKeys = {
  theme: 'todo-pulse-theme',
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

const normalizeTheme = (value: string | null | undefined): ThemeId =>
  allowedThemes.includes(value as ThemeId) ? (value as ThemeId) : 'light'

export const appState = observable({
  theme: 'light' as ThemeId,
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
    const normalized = normalizeTheme(stored)
    appState.theme.set(normalized)
    if (stored !== normalized) {
      writeStorage(storageKeys.theme, normalized)
    }
  },
  setTheme(theme: string) {
    const normalized = normalizeTheme(theme)
    appState.theme.set(normalized)
    writeStorage(storageKeys.theme, normalized)
  },
}
