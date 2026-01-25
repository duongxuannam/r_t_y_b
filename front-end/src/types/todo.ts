export type Todo = {
  id: string
  user_id: string
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
}

export type UpdateTodoRequest = {
  title?: string
  completed?: boolean
  status?: string
  position?: number
}

export type ReorderTodoItem = {
  id: string
  status: string
  position: number
}

export type ReorderTodosRequest = {
  items: ReorderTodoItem[]
}
