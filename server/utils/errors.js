export class AppError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', code = 'BAD_REQUEST', details = null) {
    super(message, 400, code, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED', details = null) {
    super(message, 401, code, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN', details = null) {
    super(message, 403, code, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource Not Found', code = 'NOT_FOUND', details = null) {
    super(message, 404, code, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', code = 'CONFLICT', details = null) {
    super(message, 409, code, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation Failed', details = null) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}
