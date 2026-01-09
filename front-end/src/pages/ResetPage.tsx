import { useSearchParams, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useObservable } from '@legendapp/state/react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { api } from '../services/api'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

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
        <h1 className="font-display text-3xl font-semibold">Reset password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste your reset token and choose a new password.
        </p>

        <div className="mt-6 space-y-4">
          <Input
            type="text"
            placeholder="Reset token"
            value={form.token.get()}
            onChange={(event) => form.token.set(event.target.value)}
          />
          <Input
            type="password"
            placeholder="New password"
            value={form.password.get()}
            onChange={(event) => form.password.set(event.target.value)}
          />
          <Button
            className="w-full shadow-glow"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
          >
            {resetMutation.isPending ? 'Updating...' : 'Reset password'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Password needs at least 8 characters with letters and numbers.
          </p>
          {resetMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <div>
                <AlertTitle>Reset failed</AlertTitle>
                <AlertDescription>
                  {(resetMutation.error as Error).message || 'Reset request failed.'}
                </AlertDescription>
              </div>
            </Alert>
          )}
          {form.notice.get() && (
            <Alert variant="success">
              <CheckCircle2 className="h-4 w-4" />
              <div>
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{form.notice.get()}</AlertDescription>
              </div>
            </Alert>
          )}
        </div>
      </div>

      <div className="glass-panel p-6 fade-up fade-delay-1">
        <h2 className="font-display text-2xl font-semibold">Back to auth</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Login again after resetting your password.
        </p>
        <Button variant="outline" className="mt-6" asChild>
          <Link to="/auth">Go to auth page</Link>
        </Button>
      </div>
    </section>
  )
}

export default ResetPage
