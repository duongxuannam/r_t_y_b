import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'

const NotFoundPage = () => {
  return (
    <section className="glass-panel p-8 text-center fade-up">
      <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">404</p>
      <h1 className="mt-3 font-display text-3xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The page you requested does not exist.
      </p>
      <Button asChild className="mt-6">
        <Link to="/app">Back to dashboard</Link>
      </Button>
    </section>
  )
}

export default NotFoundPage
