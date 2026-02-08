export interface CreateTodoRequest {
  title: string;
  status?: string | null;
  assignee_id?: string | null;
}

export interface UpdateTodoRequest {
  title?: string | null;
  completed?: boolean | null;
  status?: string | null;
  position?: number | null;
  assignee_id?: string | null;
}

export interface ReorderTodoItem {
  id: string;
  status: string;
  position: number;
}

export interface ReorderTodosRequest {
  items: ReorderTodoItem[];
}

export interface TodoResponse {
  id: string;
  reporter_id: string;
  reporter_email: string;
  assignee_id: string | null;
  assignee_email: string | null;
  title: string;
  completed: boolean;
  status: string;
  position: number;
  created_at: string;
  updated_at: string;
}
