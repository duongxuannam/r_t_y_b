import { observable } from '@legendapp/state'

const storageKeys = {
  auth: 'todo-pulse-auth',
  theme: 'todo-pulse-theme',
}

type StoredAuth = {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
  }
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
    refreshToken: '',
    user: {
      id: '',
      email: '',
    },
  },
})

export const authActions = {
  hydrate() {
    const stored = readStorage<StoredAuth>(storageKeys.auth)
    if (!stored) return
    appState.auth.accessToken.set(stored.accessToken)
    appState.auth.refreshToken.set(stored.refreshToken)
    appState.auth.user.set(stored.user)
  },
  persist() {
    const payload: StoredAuth = {
      accessToken: appState.auth.accessToken.get(),
      refreshToken: appState.auth.refreshToken.get(),
      user: appState.auth.user.get(),
    }
    writeStorage(storageKeys.auth, payload)
  },
  setAuth(payload: StoredAuth) {
    appState.auth.accessToken.set(payload.accessToken)
    appState.auth.refreshToken.set(payload.refreshToken)
    appState.auth.user.set(payload.user)
    authActions.persist()
  },
  logout() {
    appState.auth.accessToken.set('')
    appState.auth.refreshToken.set('')
    appState.auth.user.set({ id: '', email: '' })
    writeStorage(storageKeys.auth, null)
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
