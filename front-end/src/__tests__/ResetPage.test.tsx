import { screen } from '@testing-library/react'
import ResetPage from '../pages/ResetPage'
import { renderWithRouter } from '../test/testUtils'

describe('ResetPage', () => {
  it('renders reset inputs', () => {
    renderWithRouter(<ResetPage />, ['/reset?token=abc'])
    expect(screen.getByPlaceholderText(/reset token/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/new password/i)).toBeInTheDocument()
  })
})
