import { observer, useObservable } from '@legendapp/state/react'
import { useState } from 'react'
import { AlertCircle, AlertTriangle } from 'lucide-react'
import { appState } from '../state/appState'
import { useTodos } from '../hooks/useTodos'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'

const TodoPage = observer(() => {
  const todoForm = useObservable({ title: '' })
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const isAuthed = appState.auth.accessToken.get().length > 0
  const { listQuery, createMutation, updateMutation, deleteMutation } = useTodos(isAuthed)

  const todos = listQuery.data ?? []

  const handleCreate = () => {
    const title = todoForm.title.get().trim()
    if (!title) return
    createMutation.mutate({ title }, { onSuccess: () => todoForm.title.set('') })
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="p-5 glass-panel fade-up sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold font-display sm:text-3xl">Todo Control</h1>
            <p className="text-sm text-muted-foreground">
              Track tasks synced with the Rust API.
            </p>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
            <div className="rounded-2xl border bg-card/80 p-3 text-center shadow-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total</div>
              <div className="text-xl font-semibold sm:text-2xl">{todos.length}</div>
            </div>
            <div className="rounded-2xl border bg-card/80 p-3 text-center shadow-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Completed</div>
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
              <AlertTitle>Login required</AlertTitle>
              <AlertDescription>
                Please login first to sync todos with the API.
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

        {listQuery.isError && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <div>
              <AlertTitle>Unable to load todos</AlertTitle>
              <AlertDescription>
                {(listQuery.error as Error).message || 'Unable to load todos.'}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {isAuthed && !listQuery.isLoading && (
          <div className="mt-6 space-y-3">
            {todos.length === 0 ? (
              <div className="p-6 text-sm text-center border border-dashed rounded-2xl border-border">
                No todos yet. Add one to get started.
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
                        Updated {new Date(todo.updated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="self-start text-destructive sm:self-auto"
                    onClick={() => deleteMutation.mutate(todo.id)}
                  >
                    Delete
                  </Button>
                </div>
              ))
            )}
          </div>
        )}

        <div className="mt-6 sm:hidden">
          <Button
            className="w-full shadow-glow"
            onClick={() => setIsCreateOpen(true)}
          >
            Create todo
          </Button>
        </div>
      </div>

      <div className="hidden p-5 glass-panel fade-up fade-delay-1 sm:block sm:p-6">
        <h2 className="text-xl font-semibold font-display sm:text-2xl">Create todo</h2>
        <p className="text-sm text-muted-foreground">
          Add a new task to your personal list.
        </p>
        <div className="mt-4 space-y-3">
          <Input
            type="text"
            placeholder="Todo title"
            value={todoForm.title.get()}
            onChange={(event) => todoForm.title.set(event.target.value)}
          />
          <Button
            variant="success"
            className="w-full shadow-glow"
            onClick={handleCreate}
            disabled={!isAuthed || createMutation.isPending}
          >
            {createMutation.isPending ? 'Saving...' : 'Add todo'}
          </Button>
          {!isAuthed && (
            <p className="text-xs text-muted-foreground">
              Login required before creating tasks.
            </p>
          )}
          {(createMutation.isError || updateMutation.isError || deleteMutation.isError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <div>
                <AlertTitle>Request failed</AlertTitle>
                <AlertDescription>
                  {(createMutation.error as Error)?.message ||
                    (updateMutation.error as Error)?.message ||
                    (deleteMutation.error as Error)?.message ||
                    'Request failed.'}
                </AlertDescription>
              </div>
            </Alert>
          )}
        </div>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4 sm:hidden">
          <button
            className="absolute inset-0 cursor-default"
            onClick={() => setIsCreateOpen(false)}
            aria-label="Close create todo modal"
          />
          <div
            className="glass-panel relative z-10 w-full max-w-sm p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold font-display">Create todo</h2>
                <p className="text-xs text-muted-foreground">
                  Add a new task to your personal list.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                aria-label="Close"
              >
                Close
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              <Input
                type="text"
                placeholder="Todo title"
                value={todoForm.title.get()}
                onChange={(event) => todoForm.title.set(event.target.value)}
              />
              <Button
                variant="success"
                className="w-full shadow-glow"
                onClick={handleCreate}
                disabled={!isAuthed || createMutation.isPending}
              >
                {createMutation.isPending ? 'Saving...' : 'Add todo'}
              </Button>
              {!isAuthed && (
                <p className="text-xs text-muted-foreground">
                  Login required before creating tasks.
                </p>
              )}
              {(createMutation.isError || updateMutation.isError || deleteMutation.isError) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <div>
                    <AlertTitle>Request failed</AlertTitle>
                    <AlertDescription>
                      {(createMutation.error as Error)?.message ||
                        (updateMutation.error as Error)?.message ||
                        (deleteMutation.error as Error)?.message ||
                        'Request failed.'}
                    </AlertDescription>
                  </div>
                </Alert>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
})

export default TodoPage
