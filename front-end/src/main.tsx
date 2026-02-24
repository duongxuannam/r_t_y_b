import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { router } from './app/routes'
import './index.css'
import { api } from './services/api'
import { authActions, languageActions, themeActions } from './state/appState'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

themeActions.hydrate()
languageActions.hydrate()

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

if (import.meta.env.PROD) {
  registerSW({ immediate: true })
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
)
