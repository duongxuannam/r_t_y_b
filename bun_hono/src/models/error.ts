export class AppError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }

  static badRequest(message: string) {
    return new AppError(message, 400);
  }

  static unauthorized() {
    return new AppError('unauthorized', 401);
  }

  static notFound() {
    return new AppError('not found', 404);
  }

  static internal() {
    return new AppError('internal error', 500);
  }
}

export interface ErrorResponse {
  message: string;
}
