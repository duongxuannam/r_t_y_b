import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import TodoPage from '../pages/TodoPage'
import { appState } from '../state/appState'
import { renderWithProviders } from '../test/testUtils'
import type { Todo } from '../types/todo'

const mockCreateMutate = vi.fn()
const mockUpdateMutate = vi.fn()
const mockDeleteMutate = vi.fn()

let mockedTodos: Todo[] = []

vi.mock('../hooks/useTodos', () => ({
  useTodos: () => ({
    listQuery: {
      data: mockedTodos,
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
      mutate: mockUpdateMutate,
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
      mutate: mockDeleteMutate,
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
    mockedTodos = []
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

    await user.type(screen.getByPlaceholderText(/todo title/i), 'New todo')
    await user.click(screen.getByRole('button', { name: /add todo/i }))

    expect(mockCreateMutate).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /^close$/i })).not.toBeInTheDocument()
  })

  it('supports list/detail view like jira', async () => {
    mockedTodos = [
      {
        id: 't1',
        title: 'Investigate production bug',
        status: 'in_progress',
        assignee_id: 'u1',
        assignee_email: 'user@example.com',
        reporter: 'reporter@example.com',
        reporter_id: 'u2',
        reporter_email: 'reporter@example.com',
        position: 0,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-02T00:00:00.000Z',
      },
    ]

    const user = userEvent.setup()
    renderWithProviders(<TodoPage />)

    await user.click(screen.getByRole('button', { name: /list \+ detail/i }))

    expect(screen.getByText(/investigate production bug/i)).toBeInTheDocument()
    expect(screen.getByText(/status:/i)).toBeInTheDocument()
  })
})
