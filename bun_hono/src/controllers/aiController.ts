import type { Context } from 'hono';
import type { AppState } from '../config/state';
import { AppError } from '../models/error';
import type { AiGenerateRequest } from '../models/ai';
import { generate } from '../services/aiService';

export const aiGenerate = (state: AppState) => async (c: Context) => {
  const payload = (await c.req.json()) as AiGenerateRequest;
  if (!payload?.prompt) {
    throw AppError.badRequest('prompt is required');
  }
  const response = await generate(state, payload);
  return c.json(response);
};
