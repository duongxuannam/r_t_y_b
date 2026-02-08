export interface AiGenerateRequest {
  prompt: string;
  model?: string;
}

export interface AiGenerateResponse {
  model: string;
  response: string;
}
