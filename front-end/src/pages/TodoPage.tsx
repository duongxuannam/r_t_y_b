import { observer, useObservable } from '@legendapp/state/react'
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { appState } from '../state/appState'
import { useTodos } from '../hooks/useTodos'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'
import { message } from '../components/ui/message'
import { t } from '../lib/i18n'

const TodoPage = observer(() => {
  const todoForm = useObservable({ title: '' })
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const lastErrorRef = useRef<Record<string, string | null>>({
    list: null,
    create: null,
    update: null,
    delete: null,
  })
  const isAuthed = appState.auth.accessToken.get().length > 0
  const { listQuery, createMutation, updateMutation, deleteMutation } = useTodos(isAuthed)

  const todos = listQuery.data ?? []

  const handleCreate = () => {
    const title = todoForm.title.get().trim()
    if (!title) return
    createMutation.mutate({ title }, { onSuccess: () => todoForm.title.set('') })
  }

  useEffect(() => {
    if (listQuery.isError) {
      const errorMessage = (listQuery.error as Error).message || t('errors.unableToLoadTodos')
      if (lastErrorRef.current.list !== errorMessage) {
        lastErrorRef.current.list = errorMessage
        message.error(errorMessage)
      }
    }
  }, [listQuery.isError, listQuery.error])

  useEffect(() => {
    if (createMutation.isError) {
      const errorMessage = (createMutation.error as Error)?.message || t('errors.requestFailed')
      if (lastErrorRef.current.create !== errorMessage) {
        lastErrorRef.current.create = errorMessage
        message.error(errorMessage)
      }
    }
  }, [createMutation.isError, createMutation.error])

  useEffect(() => {
    if (updateMutation.isError) {
      const errorMessage = (updateMutation.error as Error)?.message || t('errors.requestFailed')
      if (lastErrorRef.current.update !== errorMessage) {
        lastErrorRef.current.update = errorMessage
        message.error(errorMessage)
      }
    }
  }, [updateMutation.isError, updateMutation.error])

  useEffect(() => {
    if (deleteMutation.isError) {
      const errorMessage = (deleteMutation.error as Error)?.message || t('errors.requestFailed')
      if (lastErrorRef.current.delete !== errorMessage) {
        lastErrorRef.current.delete = errorMessage
        message.error(errorMessage)
      }
    }
  }, [deleteMutation.isError, deleteMutation.error])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined
    }

    if (isCreateOpen) {
      document.documentElement.setAttribute('data-modal-open', 'true')
    } else {
      document.documentElement.removeAttribute('data-modal-open')
    }

    return () => {
      document.documentElement.removeAttribute('data-modal-open')
    }
  }, [isCreateOpen])

  return (
    <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="p-5 pb-28 glass-panel fade-up sm:p-6 sm:pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold font-display sm:text-3xl">{t('todo.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('todo.subtitle')}
            </p>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
            <div className="rounded-2xl border bg-card/80 p-3 text-center shadow-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t('todo.total')}</div>
              <div className="text-xl font-semibold sm:text-2xl">{todos.length}</div>
            </div>
            <div className="rounded-2xl border bg-card/80 p-3 text-center shadow-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t('todo.completed')}</div>
              <div className="text-xl font-semibold sm:text-2xl">
                {todos.filter((todo) => todo.completed).length}
              </div>
            </div>
          </div>
        </div>

        {!isAuthed && (
          <Alert variant="warning" className="mt-6">
            <AlertTriangle className="h-4 w-4" />
            <div>
              <AlertTitle>{t('todo.loginRequired')}</AlertTitle>
              <AlertDescription>
                {t('todo.loginRequiredDescription')}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {listQuery.isLoading && (
          <div className="mt-6 space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {listQuery.isError && null}

        {isAuthed && !listQuery.isLoading && (
          <div className="mt-6 space-y-3">
            {todos.length === 0 ? (
              <div className="p-6 text-sm text-center border border-dashed rounded-2xl border-border">
                {t('todo.empty')}
              </div>
            ) : (
              todos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded-md border border-input accent-primary"
                      checked={todo.completed}
                      onChange={() =>
                        updateMutation.mutate({
                          id: todo.id,
                          payload: { completed: !todo.completed },
                        })
                      }
                    />
                    <div>
                      <p
                        className={`font-semibold ${todo.completed ? 'line-through text-muted-foreground' : ''
                          }`}
                      >
                        {todo.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('todo.updated')} {new Date(todo.updated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="self-start text-destructive sm:self-auto"
                    onClick={() => deleteMutation.mutate(todo.id)}
                  >
                    {t('todo.delete')}
                  </Button>
                </div>
              ))
            )}
          </div>
        )}

        <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 sm:hidden">
          <Button
            className="w-full shadow-glow"
            onClick={() => setIsCreateOpen(true)}
          >
            {t('todo.create')}
          </Button>
        </div>
      </div>

      <div className="hidden p-5 glass-panel fade-up fade-delay-1 sm:block sm:p-6">
        <h2 className="text-xl font-semibold font-display sm:text-2xl">{t('todo.create')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('todo.createSubtitle')}
        </p>
        <div className="mt-4 space-y-3">
          <Input
            type="text"
            placeholder={t('todo.titlePlaceholder')}
            value={todoForm.title.get()}
            onChange={(event) => todoForm.title.set(event.target.value)}
          />
          <Button
            variant="success"
            className="w-full shadow-glow"
            onClick={handleCreate}
            disabled={!isAuthed || createMutation.isPending}
          >
            {createMutation.isPending ? t('todo.saving') : t('todo.add')}
          </Button>
          {!isAuthed && (
            <p className="text-xs text-muted-foreground">
              {t('todo.loginBeforeCreate')}
            </p>
          )}
          {(createMutation.isError || updateMutation.isError || deleteMutation.isError) && null}
        </div>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 sm:hidden">
          <button
            className="absolute inset-0 cursor-default"
            onClick={() => setIsCreateOpen(false)}
            aria-label={t('todo.closeCreateModal')}
          />
          <div
            className="glass-panel relative z-10 mx-4 w-full max-w-sm p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold font-display">{t('todo.create')}</h2>
                <p className="text-xs text-muted-foreground">
                  {t('todo.createSubtitle')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                aria-label={t('todo.close')}
              >
                {t('todo.close')}
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              <Input
                type="text"
                placeholder={t('todo.titlePlaceholder')}
                value={todoForm.title.get()}
                onChange={(event) => todoForm.title.set(event.target.value)}
              />
              <Button
                variant="success"
                className="w-full shadow-glow"
                onClick={handleCreate}
                disabled={!isAuthed || createMutation.isPending}
              >
                {createMutation.isPending ? t('todo.saving') : t('todo.add')}
              </Button>
              {!isAuthed && (
                <p className="text-xs text-muted-foreground">
                  {t('todo.loginBeforeCreate')}
                </p>
              )}
              {(createMutation.isError || updateMutation.isError || deleteMutation.isError) && null}
            </div>
          </div>
        </div>
      )}

    </section>
  )
})

export default TodoPage
