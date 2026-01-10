import { observer, useObservable } from '@legendapp/state/react'
import { useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { api } from '../services/api'
import { appState, authActions } from '../state/appState'

const AuthPage = observer(() => {
  const navigate = useNavigate()
  const form = useObservable({
    mode: 'login',
    email: '',
    password: '',
    resetToken: '',
    resetPassword: '',
    notice: '',
  })

  const authMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        email: form.email.get().trim(),
        password: form.password.get(),
      }
      if (form.mode.get() === 'register') {
        return api.register(payload)
      }
      return api.login(payload)
    },
    onSuccess: (response) => {
      authActions.setAuth({
        accessToken: response.access_token,
        user: response.user,
      })
      form.password.set('')
      form.notice.set('Authenticated successfully.')
      navigate('/app')
    },
  })

  const forgotMutation = useMutation({
    mutationFn: async () =>
      api.forgotPassword({ email: form.email.get().trim() }),
    onSuccess: (response) => {
      form.notice.set(response.message)
    },
  })

  const resetMutation = useMutation({
    mutationFn: async () =>
      api.resetPassword({
        token: form.resetToken.get().trim(),
        password: form.resetPassword.get(),
      }),
    onSuccess: (response) => {
      form.notice.set(response.message)
      form.resetPassword.set('')
    },
  })

  const isAuthed = appState.auth.accessToken.get().length > 0
  useEffect(() => {
    form.mode.set(isAuthed ? 'reset' : 'login')
  }, [form, isAuthed])
  const errorMessage =
    (authMutation.error as Error)?.message ||
    (forgotMutation.error as Error)?.message ||
    (resetMutation.error as Error)?.message ||
    'Auth request failed.'
  const successMessage = form.notice.get()
  const showResetSuccess = form.mode.get() === 'reset' && resetMutation.isSuccess && successMessage
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const mode = form.mode.get()

    if ((mode === 'login' || mode === 'register') && !authMutation.isPending) {
      authMutation.mutate()
      return
    }

    if (mode === 'forgot' && !forgotMutation.isPending) {
      forgotMutation.mutate()
      return
    }

    if (mode === 'reset' && !resetMutation.isPending) {
      resetMutation.mutate()
    }
  }

  return (
    <section className="grid gap-6 lg:flex lg:items-stretch lg:gap-8">
      <div className="relative flex flex-col fade-up lg:w-[1.15fr]">
        <div className="absolute hidden w-32 h-32 rounded-full pointer-events-none -top-8 -left-6 bg-primary/15 blur-2xl sm:block" />
        <div className="absolute hidden w-32 h-32 rounded-full pointer-events-none -bottom-10 right-8 bg-secondary/15 blur-2xl sm:block" />
        <div className="relative flex h-full flex-col overflow-hidden glass-panel p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Secure access
              </p>
              <h1 className="mt-2 text-2xl font-semibold font-display sm:text-3xl">
                Authenticate
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Connect with the Rust API to manage todos with JWT auth.
              </p>
            </div>
            <div className='flex '>
              <div className="px-4 py-1 text-xs font-semibold rounded-full shadow-sm bg-card/80 text-muted-foreground">
                JWT powered
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 mt-6 text-xs rounded-2xl bg-secondary/70 sm:flex sm:flex-wrap sm:rounded-full sm:text-sm">
            {(
              isAuthed
                ? [{ id: 'reset', label: 'Reset' }]
                : [
                    { id: 'login', label: 'Login' },
                    { id: 'register', label: 'Register' },
                    { id: 'forgot', label: 'Forgot' },
                  ]
            ).map((tab) => {
              const isActive = form.mode.get() === tab.id
              return (
                <button
                  key={tab.id}
                  className={`rounded-full px-3 py-2 font-medium transition sm:flex-1 sm:px-4 ${isActive
                    ? 'bg-card text-foreground shadow'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                  type="button"
                  onClick={() => form.mode.set(tab.id)}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Email
              </label>
              <Input
                type="email"
                className="mt-2"
                placeholder="Email address"
                value={form.email.get()}
                onChange={(event) => form.email.set(event.target.value)}
              />
            </div>
            {(form.mode.get() === 'login' || form.mode.get() === 'register') && (
              <>
                <div className="auth-field">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Password
                  </label>
                  <Input
                    type="password"
                    className="mt-2"
                    placeholder="Enter your password"
                    value={form.password.get()}
                    onChange={(event) => form.password.set(event.target.value)}
                  />
                </div>
                <Button
                  className="w-full shadow-glow"
                  type="submit"
                  disabled={authMutation.isPending}
                >
                  {authMutation.isPending ? 'Working...' : 'Continue'}
                </Button>
              </>
            )}
            {form.mode.get() === 'forgot' && (
              <>
                <p className="text-xs text-muted-foreground">
                  We will email a reset link if the account exists.
                </p>
                <Button
                  className="w-full shadow-glow"
                  type="submit"
                  disabled={forgotMutation.isPending}
                >
                  {forgotMutation.isPending ? 'Sending...' : 'Send reset email'}
                </Button>
              </>
            )}
            {form.mode.get() === 'reset' && (
              <>
                <div className="auth-field">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Reset token
                  </label>
                  <Input
                    type="text"
                    className="mt-2"
                    placeholder="Paste your reset token"
                    value={form.resetToken.get()}
                    onChange={(event) => form.resetToken.set(event.target.value)}
                  />
                </div>
                <div className="auth-field">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    New password
                  </label>
                  <Input
                    type="password"
                    className="mt-2"
                    placeholder="Create a new password"
                    value={form.resetPassword.get()}
                    onChange={(event) => form.resetPassword.set(event.target.value)}
                  />
                </div>
                <Button
                  className="w-full shadow-glow"
                  type="submit"
                  disabled={resetMutation.isPending}
                >
                  {resetMutation.isPending ? 'Updating...' : 'Reset password'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Use 8+ characters with a mix of letters and numbers.
                </p>
              </>
            )}
            {(authMutation.isError ||
              forgotMutation.isError ||
              resetMutation.isError ||
              showResetSuccess) && (
                <Alert
                  variant={
                    authMutation.isError || forgotMutation.isError || resetMutation.isError
                      ? 'destructive'
                      : 'success'
                  }
                  className="flex items-start gap-3"
                >
                  {authMutation.isError || forgotMutation.isError || resetMutation.isError ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <div>
                    <AlertTitle>
                      {authMutation.isError || forgotMutation.isError || resetMutation.isError
                        ? 'Authentication failed'
                        : 'Success'}
                    </AlertTitle>
                    <AlertDescription>
                      {authMutation.isError || forgotMutation.isError || resetMutation.isError
                        ? errorMessage
                        : successMessage}
                    </AlertDescription>
                  </div>
                </Alert>
              )}
          </form>
        </div>
      </div>

      <div className="glass-panel flex h-full flex-col p-6 fade-up fade-delay-1 sm:p-8 lg:w-[0.85fr]">
        <h2 className="text-xl font-semibold font-display sm:text-2xl">Auth checklist</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          What happens after you connect your account.
        </p>
        <div className="mt-6 space-y-4 text-sm text-muted-foreground">
          <div className="p-4 border shadow-sm rounded-2xl border-border/60 bg-card/70">
            <div className="flex items-center justify-between">
              <Badge variant="outline">JWT</Badge>
              <span className="text-xs text-muted-foreground">Access + refresh</span>
            </div>
            <p className="mt-3">
              Keep the access token in memory and local storage for fast requests.
            </p>
          </div>
          <div className="p-4 border shadow-sm rounded-2xl border-border/60 bg-card/70">
            <div className="flex items-center justify-between">
              <Badge variant="outline">Refresh</Badge>
              <span className="text-xs text-muted-foreground">Token renewal</span>
            </div>
            <p className="mt-3">
              Use the refresh endpoint when you add automatic token rotation.
            </p>
          </div>
          <div className="p-4 border shadow-sm rounded-2xl border-border/60 bg-card/70">
            <div className="flex items-center justify-between">
              <Badge variant="outline">Security</Badge>
              <span className="text-xs text-muted-foreground">API calls</span>
            </div>
            <p className="mt-3">Always send Authorization: Bearer &lt;token&gt;.</p>
          </div>
          <div className="p-4 border shadow-sm rounded-2xl border-border/60 bg-card/70">
            <div className="flex items-center justify-between">
              <Badge variant="outline">Reset</Badge>
              <span className="text-xs text-muted-foreground">Account recovery</span>
            </div>
            <p className="mt-3">Use the reset token sent to your inbox.</p>
          </div>
        </div>
        <div className="p-4 mt-6 text-xs border border-dashed rounded-2xl border-border bg-card/60 text-muted-foreground">
          <p className="text-[10px] uppercase tracking-[0.3em]">Request header</p>
          <code className="block mt-2 text-xs text-foreground">
            Authorization: Bearer &lt;access_token&gt;
          </code>
        </div>
      </div>
    </section>
  )
})

export default AuthPage
