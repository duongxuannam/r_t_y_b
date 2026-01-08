import { observer, useObservable } from '@legendapp/state/react'
import { appState } from '../state/appState'
import { useTodos } from '../hooks/useTodos'

const TodoPage = observer(() => {
  const todoForm = useObservable({ title: '' })
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
      <div className="p-6 glass-panel fade-up">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold font-display">Todo Control</h1>
            <p className="text-sm text-base-content/70">
              Track tasks synced with the Rust API.
            </p>
          </div>
          <div className="shadow stats">
            <div className="stat">
              <div className="stat-title">Total</div>
              <div className="text-2xl stat-value">{todos.length}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Completed</div>
              <div className="text-2xl stat-value">
                {todos.filter((todo) => todo.completed).length}
              </div>
            </div>
          </div>
        </div>

        {!isAuthed && (
          <div className="mt-6 text-sm alert alert-warning">
            Please login first to sync todos with the API.
          </div>
        )}

        {listQuery.isLoading && (
          <div className="mt-6 space-y-2">
            <div className="w-full h-16 skeleton" />
            <div className="w-full h-16 skeleton" />
          </div>
        )}

        {listQuery.isError && (
          <div className="mt-6 text-sm alert alert-error">
            {(listQuery.error as Error).message || 'Unable to load todos.'}
          </div>
        )}

        {isAuthed && !listQuery.isLoading && (
          <div className="mt-6 space-y-3">
            {todos.length === 0 ? (
              <div className="p-6 text-sm text-center border border-dashed rounded-2xl border-base-300">
                No todos yet. Add one to get started.
              </div>
            ) : (
              todos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 border shadow-sm rounded-2xl border-white/70 bg-white/80"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary"
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
                        className={`font-semibold ${todo.completed ? 'line-through text-base-content/40' : ''
                          }`}
                      >
                        {todo.title}
                      </p>
                      <p className="text-xs text-base-content/50">
                        Updated {new Date(todo.updated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm text-error"
                    onClick={() => deleteMutation.mutate(todo.id)}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="p-6 glass-panel fade-up fade-delay-1">
        <h2 className="text-2xl font-semibold font-display">Create todo</h2>
        <p className="text-sm text-base-content/70">
          Add a new task to your personal list.
        </p>
        <div className="mt-4 space-y-3">
          <input
            type="text"
            className="w-full input input-bordered"
            placeholder="Todo title"
            value={todoForm.title.get()}
            onChange={(event) => todoForm.title.set(event.target.value)}
          />
          <button
            className="w-full btn btn-primary shadow-glow"
            onClick={handleCreate}
            disabled={!isAuthed || createMutation.isPending}
          >
            {createMutation.isPending ? 'Saving...' : 'Add todo'}
          </button>
          {!isAuthed && (
            <p className="text-xs text-base-content/60">
              Login required before creating tasks.
            </p>
          )}
          {(createMutation.isError || updateMutation.isError || deleteMutation.isError) && (
            <div className="text-sm alert alert-error">
              {(createMutation.error as Error)?.message ||
                (updateMutation.error as Error)?.message ||
                (deleteMutation.error as Error)?.message ||
                'Request failed.'}
            </div>
          )}
        </div>
      </div>
    </section>
  )
})

export default TodoPage
