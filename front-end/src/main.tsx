import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './app/routes'
import './index.css'
import { api } from './services/api'
import { authActions, themeActions } from './state/appState'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

themeActions.hydrate()

const refreshOnLoad = async () => {
  try {
    const response = await api.refresh()
    authActions.setAuth({
      accessToken: response.access_token,

      user: response.user,
    })
  } catch {
    authActions.logout()
  }
}

refreshOnLoad()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
)
