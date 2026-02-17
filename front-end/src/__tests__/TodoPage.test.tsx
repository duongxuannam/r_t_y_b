import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import TodoPage from '../pages/TodoPage'
import { appState } from '../state/appState'
import { renderWithProviders } from '../test/testUtils'

const mockCreateMutate = vi.fn()

vi.mock('../hooks/useTodos', () => ({
  useTodos: () => ({
    listQuery: {
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    },
    createMutation: {
      mutate: mockCreateMutate,
      isPending: false,
      isError: false,
      error: null,
    },
    updateMutation: {
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    },
    reorderMutation: {
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    },
    deleteMutation: {
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    },
  }),
}))

vi.mock('../hooks/useUsers', () => ({
  useUsers: () => ({
    listQuery: {
      data: [{ id: 'u1', email: 'user@example.com' }],
      isLoading: false,
      isError: false,
      error: null,
    },
  }),
}))

describe('TodoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appState.auth.accessToken.set('')
    appState.auth.user.set({ id: '', email: '' })
  })

  it('shows login warning when user is not authenticated', () => {
    renderWithProviders(<TodoPage />)
    expect(screen.getByText(/please login first/i)).toBeInTheDocument()
  })

  it('closes create modal after successful create', async () => {
    mockCreateMutate.mockImplementation((_payload, options) => {
      options?.onSuccess?.()
    })

    appState.auth.accessToken.set('token')
    appState.auth.user.set({ id: 'u1', email: 'user@example.com' })

    const user = userEvent.setup()
    renderWithProviders(<TodoPage />)

    await user.click(screen.getByRole('button', { name: /create todo/i }))
    expect(screen.getByRole('button', { name: /^close$/i })).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText(/what needs to be done/i), 'New todo')
    await user.click(screen.getByRole('button', { name: /add todo/i }))

    expect(mockCreateMutate).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /^close$/i })).not.toBeInTheDocument()
  })
})
