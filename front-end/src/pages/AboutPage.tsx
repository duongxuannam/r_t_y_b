import { useEffect, useState } from 'react'
import { Badge } from '../components/ui/badge'
import { t } from '../lib/i18n'
import { api } from '../services/api'
import type { UnitTestCoverageResponse } from '../types/system'

const AboutPage = () => {
  const [coverage, setCoverage] = useState<UnitTestCoverageResponse | null>(null)
  const [loadingCoverage, setLoadingCoverage] = useState(true)
  const [coverageError, setCoverageError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const loadCoverage = async () => {
      setLoadingCoverage(true)
      setCoverageError(null)
      try {
        const data = await api.getUnitTestCoverage()
        if (!active) return
        setCoverage(data)
      } catch {
        if (!active) return
        setCoverageError(t('about.coverageError'))
      } finally {
        if (active) {
          setLoadingCoverage(false)
        }
      }
    }

    loadCoverage()
    return () => {
      active = false
    }
  }, [])

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="p-6 glass-panel fade-up">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t('about.overview')}</p>
        <h1 className="mt-2 text-3xl font-semibold font-display">
          {t('about.title')}
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          {t('about.description')}
        </p>
      </div>
      <div className="p-6 glass-panel fade-up fade-delay-1">
        <h2 className="text-2xl font-semibold font-display">{t('about.highlights')}</h2>
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
            <p className="pt-[2px]">{t('about.legendState')}</p>
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
            <p className="pt-[2px]">{t('about.tanstack')}</p>
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
              {t('about.shadcn')}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t('about.coverageTitle')}</p>
            {loadingCoverage ? <p className="mt-2">{t('about.coverageLoading')}</p> : null}
            {coverageError ? <p className="mt-2 text-red-500">{coverageError}</p> : null}
            {!loadingCoverage && !coverageError && coverage ? (
              <div className="mt-2 grid gap-1">
                <p>
                  <span className="font-semibold">{t('about.coverageValue')}:</span> {coverage.unit_test_coverage}
                </p>
                <p>
                  <span className="font-semibold">{t('about.coverageNotes')}:</span> {coverage.notes}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

export default AboutPage
