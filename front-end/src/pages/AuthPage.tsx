import { observer, useObservable } from '@legendapp/state/react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../services/api'
import { authActions, appState } from '../state/appState'

const AuthPage = observer(() => {
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
        refreshToken: response.refresh_token,
        user: response.user,
      })
      form.password.set('')
      form.notice.set('Authenticated successfully.')
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

  return (
    <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="relative fade-up">
        <div className="pointer-events-none absolute -top-8 -left-6 h-32 w-32 rounded-full bg-primary/25 blur-3xl float-slow" />
        <div className="pointer-events-none absolute -bottom-10 right-8 h-32 w-32 rounded-full bg-secondary/20 blur-3xl float-fast" />
        <div className="glass-panel relative overflow-hidden p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-base-content/50">
                Secure access
              </p>
              <h1 className="mt-2 text-3xl font-semibold font-display">Authenticate</h1>
              <p className="mt-2 text-sm text-base-content/70">
                Connect with the Rust API to manage todos with JWT auth.
              </p>
            </div>
            <div className="rounded-full bg-base-100/80 px-4 py-1 text-xs font-semibold text-base-content/70 shadow-sm">
              JWT powered
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 rounded-full bg-base-200/70 p-1 text-sm">
            {[
              { id: 'login', label: 'Login' },
              { id: 'register', label: 'Register' },
              { id: 'forgot', label: 'Forgot' },
              { id: 'reset', label: 'Reset' },
            ].map((tab) => {
              const isActive = form.mode.get() === tab.id
              return (
                <button
                  key={tab.id}
                  className={`flex-1 rounded-full px-4 py-2 font-medium transition ${
                    isActive
                      ? 'bg-base-100 text-base-content shadow'
                      : 'text-base-content/60 hover:text-base-content'
                  }`}
                  onClick={() => form.mode.set(tab.id)}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="mt-6 space-y-4">
            <div className="auth-field">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">
                Email
              </label>
              <input
                type="email"
                className="mt-2 w-full px-4"
                placeholder="you@company.com"
                value={form.email.get()}
                onChange={(event) => form.email.set(event.target.value)}
              />
            </div>
            {(form.mode.get() === 'login' || form.mode.get() === 'register') && (
              <>
                <div className="auth-field">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">
                    Password
                  </label>
                  <input
                    type="password"
                    className="mt-2 w-full px-4"
                    placeholder="Enter your password"
                    value={form.password.get()}
                    onChange={(event) => form.password.set(event.target.value)}
                  />
                </div>
                <button
                  className="w-full btn btn-primary shadow-glow"
                  onClick={() => authMutation.mutate()}
                  disabled={authMutation.isPending}
                >
                  {authMutation.isPending ? 'Working...' : 'Continue'}
                </button>
              </>
            )}
            {form.mode.get() === 'forgot' && (
              <>
                <p className="text-xs text-base-content/60">
                  We will email a reset link if the account exists.
                </p>
                <button
                  className="w-full btn btn-primary shadow-glow"
                  onClick={() => forgotMutation.mutate()}
                  disabled={forgotMutation.isPending}
                >
                  {forgotMutation.isPending ? 'Sending...' : 'Send reset email'}
                </button>
              </>
            )}
            {form.mode.get() === 'reset' && (
              <>
                <div className="auth-field">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">
                    Reset token
                  </label>
                  <input
                    type="text"
                    className="mt-2 w-full px-4"
                    placeholder="Paste your reset token"
                    value={form.resetToken.get()}
                    onChange={(event) => form.resetToken.set(event.target.value)}
                  />
                </div>
                <div className="auth-field">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">
                    New password
                  </label>
                  <input
                    type="password"
                    className="mt-2 w-full px-4"
                    placeholder="Create a new password"
                    value={form.resetPassword.get()}
                    onChange={(event) => form.resetPassword.set(event.target.value)}
                  />
                </div>
                <button
                  className="w-full btn btn-primary shadow-glow"
                  onClick={() => resetMutation.mutate()}
                  disabled={resetMutation.isPending}
                >
                  {resetMutation.isPending ? 'Updating...' : 'Reset password'}
                </button>
                <p className="text-xs text-base-content/60">
                  Use 8+ characters with a mix of letters and numbers.
                </p>
              </>
            )}
            {(authMutation.isError || forgotMutation.isError || resetMutation.isError) && (
              <div className="text-sm alert alert-error">
                {(authMutation.error as Error)?.message ||
                  (forgotMutation.error as Error)?.message ||
                  (resetMutation.error as Error)?.message ||
                  'Auth request failed.'}
              </div>
            )}
            {(form.notice.get() || isAuthed) && (
              <div className="text-sm alert alert-success">
                {form.notice.get() || 'Authenticated successfully.'}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel p-8 fade-up fade-delay-1">
        <h2 className="text-2xl font-semibold font-display">Auth checklist</h2>
        <p className="mt-2 text-sm text-base-content/70">
          What happens after you connect your account.
        </p>
        <div className="mt-6 space-y-4 text-sm text-base-content/70">
          <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="badge badge-outline">JWT</span>
              <span className="text-xs text-base-content/60">Access + refresh</span>
            </div>
            <p className="mt-3">
              Keep the access token in memory and local storage for fast requests.
            </p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="badge badge-outline">Refresh</span>
              <span className="text-xs text-base-content/60">Token renewal</span>
            </div>
            <p className="mt-3">
              Use the refresh endpoint when you add automatic token rotation.
            </p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="badge badge-outline">Security</span>
              <span className="text-xs text-base-content/60">API calls</span>
            </div>
            <p className="mt-3">Always send Authorization: Bearer &lt;token&gt;.</p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="badge badge-outline">Reset</span>
              <span className="text-xs text-base-content/60">Account recovery</span>
            </div>
            <p className="mt-3">Use the reset token sent to your inbox.</p>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-dashed border-base-300 bg-base-100/60 p-4 text-xs text-base-content/60">
          <p className="text-[10px] uppercase tracking-[0.3em]">Request header</p>
          <code className="mt-2 block text-xs text-base-content">
            Authorization: Bearer &lt;access_token&gt;
          </code>
        </div>
      </div>
    </section>
  )
})

export default AuthPage
