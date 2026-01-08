import { screen } from '@testing-library/react'
import AuthPage from '../pages/AuthPage'
import { renderWithProviders } from '../test/testUtils'

describe('AuthPage', () => {
  it('renders login and register tabs', () => {
    renderWithProviders(<AuthPage />)
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument()
  })

  it('renders email and password inputs', () => {
    renderWithProviders(<AuthPage />)
    expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
  })
})
