export type Todo = {
  id: string
  user_id: string
  title: string
  completed: boolean
  created_at: string
  updated_at: string
}

export type CreateTodoRequest = {
  title: string
}

export type UpdateTodoRequest = {
  title?: string
  completed?: boolean
}
