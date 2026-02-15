import { appState, authActions } from '../state/appState'
import type {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  MessageResponse,
  RegisterRequest,
  ResetPasswordRequest,
  UserResponse,
} from '../types/auth'
import type { CreateTodoRequest, ReorderTodosRequest, Todo, UpdateTodoRequest } from '../types/todo'
import type { UnitTestCoverageResponse } from '../types/system'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'
const AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/forgot',
  '/auth/reset',
]
let refreshPromise: Promise<AuthResponse> | null = null

const getLanguageHeader = () => appState.language.get() || 'en'

const buildHeaders = (accessToken: string, options?: RequestInit) => {
  const headers = new Headers(options?.headers)
  if (options?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (!headers.has('Accept-Language')) {
    headers.set('Accept-Language', getLanguageHeader())
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }
  return headers
}

const normalizeErrorMessage = (raw: string, status: number, path: string): string => {
  let message = raw

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { message?: string; error?: string }
      message = parsed?.message || parsed?.error || raw
    } catch {
      message = raw
    }
  }

  const cleaned = message.trim()
  if (!cleaned) {
    return `Request failed with ${status}`
  }

  const lower = cleaned.toLowerCase()
  if (lower === 'unauthorized') {
    if (path.startsWith('/auth/login') || path.startsWith('/auth/register')) {
      return 'Invalid email or password.'
    }
    return 'Unauthorized request. Please login.'
  }
  if (lower === 'forbidden') {
    return 'You do not have permission to perform this action.'
  }

  return cleaned
}

const refreshSession = async (): Promise<AuthResponse> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: buildHeaders(''),
      })
      if (!response.ok) {
        const message = await response.text()
        throw new Error(normalizeErrorMessage(message, response.status, '/auth/refresh'))
      }
      return (await response.json()) as AuthResponse
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const accessToken = appState.auth.accessToken.get()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: buildHeaders(accessToken, options),
    ...options,
  })

  if (!response.ok) {
    if (response.status === 401 && !AUTH_PATHS.includes(path)) {
      try {
        const refreshed = await refreshSession()
        authActions.setAuth({
          accessToken: refreshed.access_token,
          user: refreshed.user,
        })
        const retryResponse = await fetch(`${API_BASE_URL}${path}`, {
          credentials: 'include',
          headers: buildHeaders(refreshed.access_token, options),
          ...options,
        })
        if (retryResponse.ok) {
          if (retryResponse.status === 204) {
            return undefined as T
          }
          return (await retryResponse.json()) as T
        }
      } catch {
        authActions.logout()
      }
    }

    const message = await response.text()
    throw new Error(normalizeErrorMessage(message, response.status, path))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export const api = {
  register(payload: RegisterRequest) {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  login(payload: LoginRequest) {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  refresh() {
    return request<AuthResponse>('/auth/refresh', {
      method: 'POST',
    })
  },
  logout() {
    return request<void>('/auth/logout', {
      method: 'POST',
    })
  },
  forgotPassword(payload: ForgotPasswordRequest) {
    return request<MessageResponse>('/auth/forgot', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  resetPassword(payload: ResetPasswordRequest) {
    return request<MessageResponse>('/auth/reset', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  listTodos() {
    return request<Todo[]>('/todos')
  },
  listUsers() {
    return request<UserResponse[]>('/users')
  },
  createTodo(payload: CreateTodoRequest) {
    return request<Todo>('/todos', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updateTodo(id: string, payload: UpdateTodoRequest) {
    return request<Todo>(`/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  reorderTodos(payload: ReorderTodosRequest) {
    return request<void>('/todos/reorder-items', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  deleteTodo(id: string) {
    return request<void>(`/todos/${id}`, {
      method: 'DELETE',
    })
  },
  getUnitTestCoverage() {
    return request<UnitTestCoverageResponse>('/system/unit-test-coverage')
  },
}

