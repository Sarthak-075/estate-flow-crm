/**
 * ============================================================================
 * EstateFlow CRM
 * API Error Classes
 * ============================================================================
 */

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class BadRequestError extends ApiError {
  constructor(message = "Bad request", details?: unknown) {
    super(400, "BAD_REQUEST", message, details);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") {
    super(401, "UNAUTHORIZED", message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden") {
    super(403, "FORBIDDEN", message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Resource not found") {
    super(404, "NOT_FOUND", message);
  }
}

export class ConflictError extends ApiError {
  constructor(message = "Conflict", details?: unknown) {
    super(409, "CONFLICT", message, details);
  }
}

export class ValidationError extends ApiError {
  constructor(details: unknown) {
    super(422, "VALIDATION_ERROR", "Validation failed", details);
  }
}

export class InternalServerError extends ApiError {
  constructor(message = "Internal server error") {
    super(500, "INTERNAL_SERVER_ERROR", message);
  }
}

/**
 * Type guard
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
