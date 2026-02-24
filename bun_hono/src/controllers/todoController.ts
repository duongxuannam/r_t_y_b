import type { Context } from 'hono';
import type { AppState } from '../config/state';
import type { CreateTodoRequest, ReorderTodosRequest, UpdateTodoRequest } from '../models/todo';
import { getAuthUser } from '../middleware/auth';
import { createTodo, deleteTodo, getTodo, listTodos, reorderTodos, updateTodo } from '../services/todoService';

export const listTodosHandler = (state: AppState) => async (c: Context) => {
  const user = getAuthUser(c);
  const todos = await listTodos(state, user.userId);
  return c.json(todos);
};

export const createTodoHandler = (state: AppState) => async (c: Context) => {
  const user = getAuthUser(c);
  const payload = (await c.req.json()) as CreateTodoRequest;
  const todo = await createTodo(state, user.userId, payload);
  return c.json(todo, 201);
};

export const getTodoHandler = (state: AppState) => async (c: Context) => {
  const user = getAuthUser(c);
  const todoId = c.req.param('id');
  const todo = await getTodo(state, user.userId, todoId);
  return c.json(todo);
};

export const updateTodoHandler = (state: AppState) => async (c: Context) => {
  const user = getAuthUser(c);
  const todoId = c.req.param('id');
  const payload = (await c.req.json()) as UpdateTodoRequest;
  const todo = await updateTodo(state, user.userId, todoId, payload);
  return c.json(todo);
};

export const deleteTodoHandler = (state: AppState) => async (c: Context) => {
  const user = getAuthUser(c);
  const todoId = c.req.param('id');
  await deleteTodo(state, user.userId, todoId);
  return c.body(null, 204);
};

export const reorderTodosHandler = (state: AppState) => async (c: Context) => {
  const user = getAuthUser(c);
  const payload = (await c.req.json()) as ReorderTodosRequest;
  if (payload.items.length === 0) {
    console.warn('reorder todos request had empty items', { userId: user.userId });
  }
  if (payload.items.length > 200) {
    console.warn('reorder todos request has a large payload', { userId: user.userId, itemCount: payload.items.length });
  }
  await reorderTodos(state, user.userId, payload);
  return c.body(null, 204);
};
