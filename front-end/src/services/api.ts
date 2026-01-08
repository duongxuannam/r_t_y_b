import { appState } from '../state/appState'
import type {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  MessageResponse,
  RegisterRequest,
  ResetPasswordRequest,
} from '../types/auth'
import type { CreateTodoRequest, Todo, UpdateTodoRequest } from '../types/todo'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000/api'

const request = async<T>(path: string, options ?: RequestInit): Promise<T> => {
  const accessToken = appState.auth.accessToken.get()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
    'Content-Type': 'application/json',
  ...(accessToken ? {Authorization: `Bearer ${accessToken}` } : { }),
  ...(options?.headers ?? { }),
    },
  ...options,
  })

  if (!response.ok) {
    const message = await response.text()
  throw new Error(message || `Request failed with ${response.status}`)
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
              deleteTodo(id: string) {
    return request<void>(`/todos/${id}`, {
                method: 'DELETE',
    })
  },
}
