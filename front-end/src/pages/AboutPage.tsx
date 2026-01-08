const AboutPage = () => {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="glass-panel p-6 fade-up">
        <p className="text-xs uppercase tracking-[0.2em] text-base-content/50">Overview</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">
          A modern dashboard for the Rust Todo API
        </h1>
        <p className="mt-4 text-sm text-base-content/70">
          This UI pairs DaisyUI + Tailwind with Legend State for local state and
          TanStack Query for server data. Everything is designed to feel crisp
          and production-ready.
        </p>
      </div>
      <div className="glass-panel p-6 fade-up fade-delay-1">
        <h2 className="font-display text-2xl font-semibold">Tech highlights</h2>
        <div className="mt-4 grid gap-3 text-sm text-base-content/70">
          <div className="flex items-start gap-3">
            <span className="badge badge-primary badge-outline">Legend State</span>
            Reactive global store for auth + theme.
          </div>
          <div className="flex items-start gap-3">
            <span className="badge badge-secondary badge-outline">TanStack Query</span>
            Query caching + mutations for todos.
          </div>
          <div className="flex items-start gap-3">
            <span className="badge badge-accent badge-outline">DaisyUI</span>
            Themeable UI with sleek components.
          </div>
        </div>
      </div>
    </section>
  )
}

export default AboutPage
