import { Link } from 'react-router-dom'

const NotFoundPage = () => {
  return (
    <section className="glass-panel p-8 text-center fade-up">
      <p className="text-sm uppercase tracking-[0.2em] text-base-content/50">404</p>
      <h1 className="mt-3 font-display text-3xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-base-content/70">
        The page you requested does not exist.
      </p>
      <Link className="btn btn-primary mt-6" to="/app">
        Back to dashboard
      </Link>
    </section>
  )
}

export default NotFoundPage
