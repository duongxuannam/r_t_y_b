import { screen } from '@testing-library/react'
import TodoPage from '../pages/TodoPage'
import { appState } from '../state/appState'
import { renderWithProviders } from '../test/testUtils'

describe('TodoPage', () => {
  beforeEach(() => {
    appState.auth.accessToken.set('')
    appState.auth.user.set({ id: '', email: '' })
  })

  it('shows login warning when user is not authenticated', () => {
    renderWithProviders(<TodoPage />)
    expect(screen.getByText(/please login first/i)).toBeInTheDocument()
  })
})
