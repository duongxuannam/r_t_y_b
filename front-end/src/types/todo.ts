export type Todo = {
  id: string
  reporter_id: string
  reporter_email: string
  assignee_id: string | null
  assignee_email: string | null
  title: string
  completed: boolean
  status: string
  position: number
  created_at: string
  updated_at: string
}

export type CreateTodoRequest = {
  title: string
  status?: string
  assignee_id?: string | null
}

export type UpdateTodoRequest = {
  title?: string
  completed?: boolean
  status?: string
  position?: number
  assignee_id?: string | null
}

export type ReorderTodoItem = {
  id: string
  status: string
  position: number
}

export type ReorderTodosRequest = {
  items: ReorderTodoItem[]
}
