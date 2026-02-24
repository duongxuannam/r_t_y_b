import { useSearchParams, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useObservable } from '@legendapp/state/react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { api } from '../services/api'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { PasswordInput } from '../components/ui/password-input'
import { t } from '../lib/i18n'

const ResetPage = () => {
  const [searchParams] = useSearchParams()
  const form = useObservable({
    token: searchParams.get('token') ?? '',
    password: '',
    notice: '',
  })

  const resetMutation = useMutation({
    mutationFn: async () =>
      api.resetPassword({
        token: form.token.get().trim(),
        password: form.password.get(),
      }),
    onSuccess: (response) => {
      form.notice.set(response.message)
      form.password.set('')
    },
  })

  return (
    <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="glass-panel p-6 fade-up">
        <h1 className="font-display text-3xl font-semibold">{t('reset.title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('reset.subtitle')}
        </p>

        <div className="mt-6 space-y-4">
          <Input
            type="text"
            placeholder={t('reset.tokenPlaceholder')}
            value={form.token.get()}
            onChange={(event) => form.token.set(event.target.value)}
          />
          <PasswordInput
            placeholder={t('reset.passwordPlaceholder')}
            value={form.password.get()}
            onChange={(event) => form.password.set(event.target.value)}
          />
          <Button
            className="w-full shadow-glow"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
          >
            {resetMutation.isPending ? t('reset.updating') : t('reset.submit')}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t('reset.passwordHint')}
          </p>
          {resetMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <div>
                <AlertTitle>{t('reset.failure')}</AlertTitle>
                <AlertDescription>
                  {(resetMutation.error as Error).message || t('reset.requestFailed')}
                </AlertDescription>
              </div>
            </Alert>
          )}
          {form.notice.get() && (
            <Alert variant="success">
              <CheckCircle2 className="h-4 w-4" />
              <div>
                <AlertTitle>{t('reset.successTitle')}</AlertTitle>
                <AlertDescription>{form.notice.get()}</AlertDescription>
              </div>
            </Alert>
          )}
        </div>
      </div>

      <div className="glass-panel p-6 fade-up fade-delay-1">
        <h2 className="font-display text-2xl font-semibold">{t('reset.backTitle')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('reset.backDescription')}
        </p>
        <Button variant="outline" className="mt-6" asChild>
          <Link to="/auth">{t('reset.backCta')}</Link>
        </Button>
      </div>
    </section>
  )
}

export default ResetPage
