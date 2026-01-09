import { Badge } from '../components/ui/badge'

const AboutPage = () => {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="glass-panel p-6 fade-up">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Overview</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">
          A modern dashboard for the Rust Todo API
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          This UI now uses shadcn/ui components on top of Tailwind, paired with
          Legend State for local state and TanStack Query for server data.
        </p>
      </div>
      <div className="glass-panel p-6 fade-up fade-delay-1">
        <h2 className="font-display text-2xl font-semibold">Tech highlights</h2>
        <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="border-primary/40 text-primary">
              Legend State
            </Badge>
            Reactive global store for auth + theme.
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="border-secondary/60 text-foreground">
              TanStack Query
            </Badge>
            Query caching + mutations for todos.
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="border-primary/40 text-primary">
              shadcn/ui
            </Badge>
            Reusable components with a clean, modern Tailwind foundation.
          </div>
        </div>
      </div>
    </section>
  )
}

export default AboutPage
