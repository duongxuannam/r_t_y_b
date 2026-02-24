import { AppError } from '../models/error';
import type { AiGenerateRequest, AiGenerateResponse } from '../models/ai';
import type { AppState } from '../config/state';

interface OllamaGenerateResponse {
  model: string;
  response: string;
}

export const generate = async (state: AppState, payload: AiGenerateRequest): Promise<AiGenerateResponse> => {
  const model = payload.model ?? state.ollama.defaultModel;
  const url = `${state.ollama.baseUrl.replace(/\/$/, '')}/api/generate`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), state.ollama.timeoutSeconds * 1000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: payload.prompt, stream: false }),
      signal: controller.signal,
    });

    const bodyText = await response.text();

    if (!response.ok) {
      const message = bodyText.trim()
        ? `ollama request failed: ${bodyText}`
        : `ollama request failed with status ${response.status}`;
      if (response.status === 400) {
        throw AppError.badRequest(message);
      }
      throw AppError.internal();
    }

    let parsed: OllamaGenerateResponse;
    try {
      parsed = JSON.parse(bodyText) as OllamaGenerateResponse;
    } catch {
      throw AppError.internal();
    }

    return {
      model: parsed.model,
      response: parsed.response,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw AppError.internal();
    }
    throw AppError.internal();
  } finally {
    clearTimeout(timeout);
  }
};
