import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import type { ReactElement } from 'react'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

export const renderWithProviders = (element: ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(<QueryClientProvider client={queryClient}>{element}</QueryClientProvider>)
}

export const renderWithRouter = (element: ReactElement, initialEntries = ['/']) => {
  const queryClient = createTestQueryClient()

  const router = createMemoryRouter(
    [
      {
        path: '/',
        element,
      },
    ],
    { initialEntries },
  )

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}
