/**
 * Typed application errors. Services throw these; the HTTP layer maps them to status codes,
 * so business logic never needs to know about Request/Response objects.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  badRequest: (message: string, details?: unknown) => new AppError(400, "BAD_REQUEST", message, details),
  unauthorized: (message = "Please sign in to continue.") => new AppError(401, "UNAUTHORIZED", message),
  forbidden: (message = "You do not have permission to perform this action.") =>
    new AppError(403, "FORBIDDEN", message),
  notFound: (what = "Resource") => new AppError(404, "NOT_FOUND", `${what} not found.`),
  conflict: (message: string) => new AppError(409, "CONFLICT", message),
  unprocessable: (message: string, details?: unknown) => new AppError(422, "UNPROCESSABLE", message, details),
  rateLimited: (retryAfterSec: number) =>
    new AppError(429, "RATE_LIMITED", "Too many requests. Please slow down.", { retryAfterSec }),
  unavailable: (message: string) => new AppError(503, "UNAVAILABLE", message),
};
