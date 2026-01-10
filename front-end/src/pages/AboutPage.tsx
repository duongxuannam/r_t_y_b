import { Badge } from '../components/ui/badge'

const AboutPage = () => {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="p-6 glass-panel fade-up">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Overview</p>
        <h1 className="mt-2 text-3xl font-semibold font-display">
          A modern dashboard for the Rust Todo API
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          This UI now uses shadcn/ui components on top of Tailwind, paired with
          Legend State for local state and TanStack Query for server data.
        </p>
      </div>
      <div className="p-6 glass-panel fade-up fade-delay-1">
        <h2 className="text-2xl font-semibold font-display">Tech highlights</h2>
        <div className="grid gap-3 mt-4 text-sm text-muted-foreground">
          <div className="grid items-start gap-3" style={{ gridTemplateColumns: '130px 1fr' }}>
            <div className='flex'>
              <Badge
                variant="outline"
                className="shrink-0 border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary"
              >
                Legend State
              </Badge>
            </div>
            <p className="pt-[2px]">Reactive global store for auth + theme.</p>
          </div>
          <div className="grid items-start gap-3" style={{ gridTemplateColumns: '130px 1fr' }}>
            <div className='flex'>
              <Badge
                variant="outline"
                className="shrink-0 border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary"
              >
                TanStack Query
              </Badge>
            </div>
            <p className="pt-[2px]">Query caching + mutations for todos.</p>
          </div>
          <div className="grid items-start gap-3" style={{ gridTemplateColumns: '130px 1fr' }}>
            <div className='flex'>
              <Badge
                variant="outline"
                className="shrink-0 border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary"
              >
                shadcn/ui
              </Badge>
            </div>
            <p className="pt-[2px]">
              Reusable components with a clean, modern Tailwind foundation.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AboutPage
