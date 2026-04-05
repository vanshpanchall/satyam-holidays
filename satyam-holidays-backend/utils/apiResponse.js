/**
 * Standardized API error response format
 * Ensures consistent error responses across all API endpoints
 */

class ApiError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR", details = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        message: this.message,
        code: this.code,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

// Common error factory methods
const ApiErrors = {
  badRequest: (message = "Bad request", details = null) =>
    new ApiError(message, 400, "BAD_REQUEST", details),

  unauthorized: (message = "Authentication required") => new ApiError(message, 401, "UNAUTHORIZED"),

  forbidden: (message = "Access denied") => new ApiError(message, 403, "FORBIDDEN"),

  notFound: (resource = "Resource") => new ApiError(`${resource} not found`, 404, "NOT_FOUND"),

  conflict: (message = "Resource already exists") => new ApiError(message, 409, "CONFLICT"),

  validationError: (errors) =>
    new ApiError("Validation failed", 400, "VALIDATION_ERROR", { errors }),

  tooManyRequests: (retryAfter = 60) =>
    new ApiError("Too many requests, please try again later", 429, "RATE_LIMITED", {
      retryAfter,
    }),

  internal: (message = "Internal server error") => new ApiError(message, 500, "INTERNAL_ERROR"),
};

/**
 * Success response helper
 */
function successResponse(res, data = null, statusCode = 200, meta = {}) {
  const response = {
    success: true,
    ...(data !== null && { data }),
    ...meta,
  };
  return res.status(statusCode).json(response);
}

/**
 * Paginated response helper
 */
function paginatedResponse(res, data, pagination, meta = {}) {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPrev: pagination.page > 1,
    },
    ...meta,
  });
}

/**
 * Error response helper
 */
function errorResponse(res, error, requestId = null) {
  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    error: {
      message: error.message || "Internal server error",
      code: error.code || "INTERNAL_ERROR",
      ...(error.details && { details: error.details }),
    },
    ...(requestId && { requestId }),
  };
  return res.status(statusCode).json(response);
}

module.exports = {
  ApiError,
  ApiErrors,
  successResponse,
  paginatedResponse,
  errorResponse,
};
