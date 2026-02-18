import type { AppState } from '../config/state';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../models/error';
import type { CreateTodoRequest, ReorderTodosRequest, TodoResponse, UpdateTodoRequest } from '../models/todo';

const TODO_STATUSES = ['todo', 'in_progress', 'done'] as const;

type TodoStatus = (typeof TODO_STATUSES)[number];

const normalizeTitle = (title: string): string => {
  const trimmed = title.trim();
  if (!trimmed) {
    throw AppError.badRequest('title is required');
  }
  return trimmed;
};

const normalizeStatus = (status: string): TodoStatus => {
  const trimmed = status.trim().toLowerCase();
  if (TODO_STATUSES.includes(trimmed as TodoStatus)) {
    return trimmed as TodoStatus;
  }
  throw AppError.badRequest('invalid status');
};

const ensureUpdatePayload = (payload: UpdateTodoRequest): string | null => {
  if (!payload.title && payload.completed === undefined && !payload.status && payload.position === undefined && !payload.assignee_id) {
    throw AppError.badRequest('nothing to update');
  }

  return payload.title ? normalizeTitle(payload.title) : null;
};

const ensureUserExists = async (state: AppState, userId: string) => {
  const [row] = await state.db<{ exists: boolean }[]>`
    SELECT EXISTS(SELECT 1 FROM users WHERE id = ${userId}) AS exists
  `;
  if (!row?.exists) {
    throw AppError.badRequest('assignee not found');
  }
};

export const listTodos = async (state: AppState, userId: string): Promise<TodoResponse[]> => {
  const todos = await state.db<TodoResponse[]>`
    SELECT
      todos.id,
      todos.reporter_id,
      reporter.email AS reporter_email,
      todos.assignee_id,
      assignee.email AS assignee_email,
      todos.title,
      todos.completed,
      todos.status,
      todos.position,
      todos.created_at,
      todos.updated_at
    FROM todos
    JOIN users reporter ON reporter.id = todos.reporter_id
    LEFT JOIN users assignee ON assignee.id = todos.assignee_id
    WHERE todos.reporter_id = ${userId} OR todos.assignee_id = ${userId}
    ORDER BY CASE todos.status WHEN 'todo' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'done' THEN 3 ELSE 4 END,
      todos.position ASC,
      todos.updated_at DESC
  `;

  return todos;
};

export const createTodo = async (
  state: AppState,
  userId: string,
  payload: CreateTodoRequest
): Promise<TodoResponse> => {
  const title = normalizeTitle(payload.title);
  const status = payload.status ? normalizeStatus(payload.status) : 'todo';

  let assigneeId = payload.assignee_id ?? userId;
  if (payload.assignee_id) {
    await ensureUserExists(state, payload.assignee_id);
  }

  const [positionRow] = await state.db<{ position: number }[]>`
    SELECT COALESCE(MAX(position), -1) + 1 AS position
    FROM todos
    WHERE assignee_id = ${assigneeId} AND status = ${status}
  `;

  const position = positionRow?.position ?? 0;
  const completed = status === 'done';

  const todoId = uuidv4();
  const [todo] = await state.db<TodoResponse[]>`
    INSERT INTO todos (id, reporter_id, assignee_id, title, completed, status, position)
    VALUES (${todoId}, ${userId}, ${assigneeId}, ${title}, ${completed}, ${status}, ${position})
    RETURNING
      id,
      reporter_id,
      (SELECT email FROM users WHERE id = reporter_id) AS reporter_email,
      assignee_id,
      (SELECT email FROM users WHERE id = assignee_id) AS assignee_email,
      title,
      completed,
      status,
      position,
      created_at,
      updated_at
  `;

  return todo;
};

export const getTodo = async (state: AppState, userId: string, todoId: string): Promise<TodoResponse> => {
  const [todo] = await state.db<TodoResponse[]>`
    SELECT
      todos.id,
      todos.reporter_id,
      reporter.email AS reporter_email,
      todos.assignee_id,
      assignee.email AS assignee_email,
      todos.title,
      todos.completed,
      todos.status,
      todos.position,
      todos.created_at,
      todos.updated_at
    FROM todos
    JOIN users reporter ON reporter.id = todos.reporter_id
    LEFT JOIN users assignee ON assignee.id = todos.assignee_id
    WHERE todos.id = ${todoId}
      AND EXISTS (
        SELECT 1
        FROM todos visible_todos
        WHERE visible_todos.id = todos.id
          AND (visible_todos.reporter_id = ${userId} OR visible_todos.assignee_id = ${userId})
      )
  `;

  if (!todo) {
    throw AppError.notFound();
  }

  return todo;
};

export const updateTodo = async (
  state: AppState,
  userId: string,
  todoId: string,
  payload: UpdateTodoRequest
): Promise<TodoResponse> => {
  const title = ensureUpdatePayload(payload);
  if (payload.assignee_id) {
    await ensureUserExists(state, payload.assignee_id);
  }

  const [assigneeRow] = await state.db<{ assignee_id: string | null }[]>`
    SELECT assignee_id FROM todos WHERE id = ${todoId} AND (reporter_id = ${userId} OR assignee_id = ${userId})
  `;

  if (!assigneeRow) {
    throw AppError.notFound();
  }

  let status = payload.status ? normalizeStatus(payload.status) : null;
  let completed = payload.completed ?? null;

  const assigneeId = payload.assignee_id ?? null;
  const positionOwnerId = assigneeId ?? assigneeRow.assignee_id ?? userId;

  if (completed !== null && !status) {
    status = completed ? 'done' : 'todo';
  }

  if (status && completed === null) {
    completed = status === 'done';
  }

  let position = payload.position ?? null;
  if (status && position === null) {
    const [positionRow] = await state.db<{ position: number }[]>`
      SELECT COALESCE(MAX(position), -1) + 1 AS position
      FROM todos
      WHERE assignee_id = ${positionOwnerId} AND status = ${status}
    `;
    position = positionRow?.position ?? 0;
  }

  const [todo] = await state.db<TodoResponse[]>`
    UPDATE todos
    SET
      title = COALESCE(${title}, title),
      completed = COALESCE(${completed}, completed),
      status = COALESCE(${status}, status),
      position = COALESCE(${position}, position),
      assignee_id = COALESCE(${assigneeId}, assignee_id),
      updated_at = NOW()
    WHERE id = ${todoId} AND (reporter_id = ${userId} OR assignee_id = ${userId})
    RETURNING
      id,
      reporter_id,
      (SELECT email FROM users WHERE id = reporter_id) AS reporter_email,
      assignee_id,
      (SELECT email FROM users WHERE id = assignee_id) AS assignee_email,
      title,
      completed,
      status,
      position,
      created_at,
      updated_at
  `;

  if (!todo) {
    throw AppError.notFound();
  }

  return todo;
};

export const deleteTodo = async (state: AppState, userId: string, todoId: string): Promise<void> => {
  const result = await state.db`
    DELETE FROM todos WHERE id = ${todoId} AND (reporter_id = ${userId} OR assignee_id = ${userId})
  `;

  if (result.count === 0) {
    throw AppError.notFound();
  }
};

export const reorderTodos = async (
  state: AppState,
  userId: string,
  payload: ReorderTodosRequest
): Promise<void> => {
  if (payload.items.length === 0) {
    throw AppError.badRequest('items is required');
  }

  await state.db.begin(async (tx) => {
    for (const item of payload.items) {
      const status = normalizeStatus(item.status);
      const completed = status === 'done';
      const result = await tx`
        UPDATE todos
        SET status = ${status}, position = ${item.position}, completed = ${completed}, updated_at = NOW()
        WHERE id = ${item.id} AND (reporter_id = ${userId} OR assignee_id = ${userId})
      `;

      if (result.count === 0) {
        throw AppError.notFound();
      }
    }
  });
};
