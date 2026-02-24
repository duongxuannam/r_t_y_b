import { observer, useObservable } from '@legendapp/state/react'
import { AlertTriangle, GripVertical, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { message } from '../components/ui/message'
import { Skeleton } from '../components/ui/skeleton'
import { useTodos } from '../hooks/useTodos'
import { useUsers } from '../hooks/useUsers'
import { t } from '../lib/i18n'
import { cn } from '../lib/utils'
import { appState } from '../state/appState'
import type { Todo } from '../types/todo'

const columnOrder = ['todo', 'in_progress', 'done'] as const

const TodoPage = observer(() => {
  const todoForm = useObservable({ title: '', assigneeId: '' })
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ status: string; index: number | null } | null>(
    null,
  )
  const lastErrorRef = useRef<Record<string, string | null>>({
    list: null,
    create: null,
    update: null,
    delete: null,
    reorder: null,
  })
  const createInputRef = useRef<HTMLInputElement>(null)
  const isAuthed = appState.auth.accessToken.get().length > 0
  const currentUserId = appState.auth.user.id.get()
  const { listQuery, createMutation, updateMutation, reorderMutation, deleteMutation } =
    useTodos(isAuthed)
  const { listQuery: usersQuery } = useUsers(isAuthed)
  const isMutatingTodo =
    createMutation.isPending ||
    updateMutation.isPending ||
    reorderMutation.isPending ||
    deleteMutation.isPending

  const todos = listQuery.data ?? []
  const users = usersQuery.data ?? []
  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.email.localeCompare(b.email)),
    [users],
  )

  const columns = [
    {
      id: 'todo',
      title: t('todo.column.todo'),
      description: t('todo.column.todoDescription'),
      accent: 'border-slate-200/20 text-slate-200',
    },
    {
      id: 'in_progress',
      title: t('todo.column.inProgress'),
      description: t('todo.column.inProgressDescription'),
      accent: 'border-amber-200/20 text-amber-100',
    },
    {
      id: 'done',
      title: t('todo.column.done'),
      description: t('todo.column.doneDescription'),
      accent: 'border-emerald-200/20 text-emerald-100',
    },
  ] as const

  const todosByStatus = useMemo(() => {
    const grouped: Record<string, Todo[]> = {
      todo: [],
      in_progress: [],
      done: [],
    }

    const sorted = [...todos].sort((a, b) => a.position - b.position)
    sorted.forEach((todo) => {
      if (!grouped[todo.status]) {
        grouped.todo.push(todo)
        return
      }
      grouped[todo.status].push(todo)
    })
    return grouped
  }, [todos])

  const totalCount = todos.length
  const doneCount = todos.filter((todo) => todo.status === 'done').length

  const handleCreate = () => {
    const title = todoForm.title.get().trim()
    if (!title) return
    const assigneeId = todoForm.assigneeId.get()
    createMutation.mutate(
      { title, assignee_id: assigneeId || undefined },
      {
        onSuccess: () => {
          todoForm.title.set('')
          setIsCreateOpen(false)
        },
      },
    )
  }

  const handleDrop = (status: string, index: number | null, draggedId?: string) => {
    const activeDragId = draggedId || draggingId
    if (!isAuthed || !activeDragId || reorderMutation.isPending) return

    const sourceTodo = todos.find((todo) => todo.id === activeDragId)
    if (!sourceTodo) return
    const normalizedSourceStatus = columnOrder.includes(
      sourceTodo.status as (typeof columnOrder)[number],
    )
      ? (sourceTodo.status as (typeof columnOrder)[number])
      : 'todo'
    const normalizedTargetStatus = columnOrder.includes(status as (typeof columnOrder)[number])
      ? (status as (typeof columnOrder)[number])
      : 'todo'

    const nextGrouped: Record<string, Todo[]> = {
      todo: [...todosByStatus.todo],
      in_progress: [...todosByStatus.in_progress],
      done: [...todosByStatus.done],
    }

    const sourceList = nextGrouped[normalizedSourceStatus]
    const sourceIndex = sourceList.findIndex((todo) => todo.id === activeDragId)
    if (sourceIndex >= 0) {
      sourceList.splice(sourceIndex, 1)
    }

    const targetList = nextGrouped[normalizedTargetStatus]
    const insertIndex = index === null ? targetList.length : index
    const clampedIndex = Math.max(0, Math.min(insertIndex, targetList.length))
    targetList.splice(clampedIndex, 0, { ...sourceTodo, status: normalizedTargetStatus })

    const items = columnOrder.flatMap((columnId) =>
      nextGrouped[columnId].map((todo, position) => ({
        id: todo.id,
        status: columnId,
        position,
      })),
    )

    reorderMutation.mutate({ items })
    setDropTarget(null)
    setDraggingId(null)
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
    if (reorderMutation.isError) {
      const errorMessage = (reorderMutation.error as Error)?.message || t('errors.requestFailed')
      if (lastErrorRef.current.reorder !== errorMessage) {
        lastErrorRef.current.reorder = errorMessage
        message.error(errorMessage)
      }
    }
  }, [reorderMutation.isError, reorderMutation.error])

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
    if (!isAuthed || sortedUsers.length === 0) return
    if (!todoForm.assigneeId.get()) {
      const defaultAssignee =
        sortedUsers.find((user) => user.id === currentUserId)?.id ?? sortedUsers[0]?.id ?? ''
      if (defaultAssignee) {
        todoForm.assigneeId.set(defaultAssignee)
      }
    }
  }, [currentUserId, isAuthed, sortedUsers, todoForm])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return

      if (event.key === 'Escape' && isCreateOpen) {
        event.preventDefault()
        setIsCreateOpen(false)
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        const target = event.target as HTMLElement | null
        const tagName = target?.tagName?.toLowerCase()
        const isEditable =
          tagName === 'input' || tagName === 'textarea' || target?.isContentEditable
        if (isEditable) return

        if (event.key.toLowerCase() === 'k') {
          event.preventDefault()
          setIsCreateOpen(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCreateOpen])

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

  useEffect(() => {
    if (!isCreateOpen) return
    const frameId = window.requestAnimationFrame(() => createInputRef.current?.focus())
    return () => window.cancelAnimationFrame(frameId)
  }, [isCreateOpen])

  return (
    <section className="grid gap-6">
      <div className="p-5 pb-28 glass-panel fade-up sm:p-6 sm:pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div>
              <h1 className="text-2xl font-semibold font-display sm:text-3xl">{t('todo.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('todo.subtitle')}</p>
            </div>
            <Button
              className="shadow-glow"
              onClick={() => setIsCreateOpen(true)}
              aria-label={t('todo.create')}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t('todo.create')}</span>
            </Button>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
            <div className="rounded-2xl border bg-card/80 p-3 text-center shadow-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {t('todo.total')}
              </div>
              <div className="text-xl font-semibold sm:text-2xl">{totalCount}</div>
            </div>
            <div className="rounded-2xl border bg-card/80 p-3 text-center shadow-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {t('todo.completed')}
              </div>
              <div className="text-xl font-semibold sm:text-2xl">{doneCount}</div>
            </div>
          </div>
        </div>

        {!isAuthed && (
          <Alert variant="warning" className="mt-6">
            <AlertTriangle className="h-4 w-4" />
            <div>
              <AlertTitle>{t('todo.loginRequired')}</AlertTitle>
              <AlertDescription>{t('todo.loginRequiredDescription')}</AlertDescription>
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

        {isMutatingTodo && (
          <Alert variant="default" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <div>
              <AlertTitle>{t('todo.updatingTitle')}</AlertTitle>
              <AlertDescription>{t('todo.updatingDescription')}</AlertDescription>
            </div>
          </Alert>
        )}

        {!listQuery.isLoading && (
          <div className="mt-6 space-y-5">
            {todos.length === 0 ? (
              <div className="p-6 text-sm text-center border border-dashed rounded-2xl border-border">
                {t('todo.empty')}
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                {columns.map((column) => {
                  const columnTodos = todosByStatus[column.id]
                  return (
                    <div
                      key={column.id}
                      className="flex h-full flex-col rounded-2xl border border-border/60 bg-card/50 p-4"
                      onDragOver={(event) => {
                        event.preventDefault()
                        setDropTarget({ status: column.id, index: null })
                      }}
                      onDrop={(event) => {
                        event.preventDefault()
                        const draggedId = event.dataTransfer.getData('text/plain')
                        handleDrop(
                          column.id,
                          dropTarget?.status === column.id ? dropTarget.index : null,
                          draggedId,
                        )
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-semibold font-display">{column.title}</h2>
                          <p className="text-xs text-muted-foreground">{column.description}</p>
                        </div>
                        <span
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.2em]',
                            column.accent,
                          )}
                        >
                          {columnTodos.length}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-1 flex-col gap-3">
                        {columnTodos.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
                            {t('todo.column.empty')}
                          </div>
                        ) : (
                          columnTodos.map((todo, index) => {
                            const isDragging = draggingId === todo.id
                            const isDropTarget =
                              dropTarget?.status === column.id &&
                              dropTarget.index === index &&
                              draggingId !== todo.id
                            return (
                              <div
                                key={todo.id}
                                draggable={isAuthed}
                                onDragStart={(event) => {
                                  if (!isAuthed) return
                                  event.dataTransfer.effectAllowed = 'move'
                                  event.dataTransfer.setData('text/plain', todo.id)
                                  setDraggingId(todo.id)
                                }}
                                onDragEnd={() => {
                                  setDraggingId(null)
                                  setDropTarget(null)
                                }}
                                onDragOver={(event) => {
                                  event.preventDefault()
                                  setDropTarget({ status: column.id, index })
                                }}
                                onDrop={(event) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  const draggedId = event.dataTransfer.getData('text/plain')
                                  handleDrop(column.id, index, draggedId)
                                }}
                                className={cn(
                                  'group flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm transition',
                                  isDragging ? 'opacity-60' : 'hover:border-primary/40',
                                  isDropTarget ? 'ring-2 ring-primary/40' : '',
                                )}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-2">
                                    <GripVertical className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="font-semibold">{todo.title}</p>
                                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                        <span>
                                          {t('todo.assignee')}:{' '}
                                          {todo.assignee_email ?? t('todo.unassigned')}
                                        </span>
                                        <span>
                                          {t('todo.reporter')}: {todo.reporter_email}
                                        </span>
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        {t('todo.updated')}{' '}
                                        {new Date(todo.updated_at).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive"
                                    onClick={() => deleteMutation.mutate(todo.id)}
                                    disabled={deleteMutation.isPending || reorderMutation.isPending}
                                  >
                                    {deleteMutation.isPending ? t('todo.deleting') : t('todo.delete')}
                                  </Button>
                                </div>
                                {isAuthed && sortedUsers.length > 0 && (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{t('todo.assignTo')}</span>
                                    <select
                                      className="h-9 w-full rounded-xl border border-input bg-background px-3 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                      value={todo.assignee_id ?? sortedUsers[0]?.id ?? ''}
                                      onChange={(event) =>
                                        updateMutation.mutate({
                                          id: todo.id,
                                          payload: { assignee_id: event.target.value },
                                        })
                                      }
                                      disabled={updateMutation.isPending}
                                    >
                                      {sortedUsers.length === 0 ? (
                                        <option value="">{t('todo.noAssignees')}</option>
                                      ) : (
                                        sortedUsers.map((user) => (
                                          <option key={user.id} value={user.id}>
                                            {user.email}
                                          </option>
                                        ))
                                      )}
                                    </select>
                                  </div>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/55 px-4 py-10 backdrop-blur-sm sm:px-8">
          <button
            className="absolute inset-0 cursor-default"
            onClick={() => setIsCreateOpen(false)}
            aria-label={t('todo.closeCreateModal')}
          />
          <div
            className="glass-panel relative z-10 w-full max-w-sm overflow-hidden p-5 shadow-2xl transition-all duration-300 ease-out animate-in zoom-in-95 sm:max-w-xl sm:rounded-3xl sm:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400/80 via-fuchsia-400/70 to-emerald-400/70" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold font-display sm:text-2xl">{t('todo.create')}</h2>
                <p className="text-xs text-muted-foreground sm:mt-1 sm:text-sm">{t('todo.createSubtitle')}</p>
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
            <div className="mt-5 space-y-4 sm:mt-6 sm:space-y-5">
              <Input
                ref={createInputRef}
                type="text"
                placeholder={t('todo.titlePlaceholder')}
                value={todoForm.title.get()}
                onChange={(event) => todoForm.title.set(event.target.value)}
              />
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {t('todo.assignTo')}
                </label>
                <select
                  className="flex h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={todoForm.assigneeId.get()}
                  onChange={(event) => todoForm.assigneeId.set(event.target.value)}
                  disabled={!isAuthed || usersQuery.isLoading || sortedUsers.length === 0}
                >
                  {sortedUsers.length === 0 ? (
                    <option value="">{t('todo.noAssignees')}</option>
                  ) : (
                    sortedUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.email}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <Button
                variant="success"
                className="w-full shadow-glow"
                onClick={handleCreate}
                disabled={!isAuthed || createMutation.isPending}
              >
                {createMutation.isPending ? t('todo.saving') : t('todo.add')}
              </Button>
              {!isAuthed && (
                <p className="text-xs text-muted-foreground">{t('todo.loginBeforeCreate')}</p>
              )}
              {(createMutation.isError ||
                updateMutation.isError ||
                deleteMutation.isError ||
                reorderMutation.isError) &&
                null}
              <div className="rounded-2xl border border-border/60 bg-card/60 p-3 text-xs text-muted-foreground">
                {t('todo.dragHint')}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
})

export default TodoPage
