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
  { id: 'cupcake', label: 'Cupcake', color: '#f9a8d4' },
  { id: 'emerald', label: 'Emerald', color: '#34d399' },
  { id: 'corporate', label: 'Corporate', color: '#93c5fd' },
  { id: 'synthwave', label: 'Synthwave', color: '#a855f7' },
]

export const appState = observable({
  theme: 'light',
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
    if (!stored) return
    appState.theme.set(stored)
  },
  setTheme(theme: string) {
    appState.theme.set(theme)
    writeStorage(storageKeys.theme, theme)
  },
}
