import { render, screen } from '@testing-library/react'
import AboutPage from '../pages/AboutPage'

describe('AboutPage', () => {
  it('renders the overview heading', () => {
    render(<AboutPage />)
    expect(
      screen.getByRole('heading', { name: /modern dashboard for the rust todo api/i }),
    ).toBeInTheDocument()
  })
})
