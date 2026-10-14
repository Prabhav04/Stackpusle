export type ApiErrorCode =
  | 'USER_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'GITHUB_UNAVAILABLE'
  | 'UNAUTHENTICATED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly code: ApiErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, code: ApiErrorCode = 'INTERNAL_ERROR', statusCode: number = 500, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code: ApiErrorCode = 'NOT_FOUND') {
    super(message, code, 404);
  }
}

export class UserNotFoundError extends AppError {
  constructor(username: string) {
    super(`GitHub user "${username}" was not found`, 'USER_NOT_FOUND', 404);
  }
}

export class RateLimitedError extends AppError {
  constructor(message = 'GitHub API rate limit exceeded. Please try again shortly or configure GITHUB_TOKEN.') {
    super(message, 'RATE_LIMITED', 429);
  }
}

export class GitHubUnavailableError extends AppError {
  constructor(message = 'GitHub service is currently unavailable. Please try again later.') {
    super(message, 'GITHUB_UNAVAILABLE', 503);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Authentication required to access this resource') {
    super(message, 'UNAUTHENTICATED', 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to access this resource') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}
