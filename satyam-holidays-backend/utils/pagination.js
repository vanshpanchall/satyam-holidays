/**
 * Standardized pagination utilities for consistent API responses
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse and validate pagination parameters from request query
 * @param {object} query - Express request query object
 * @returns {object} Validated pagination parameters
 */
function parsePaginationParams(query) {
  let page = parseInt(query.page, 10) || DEFAULT_PAGE;
  let limit = parseInt(query.limit, 10) || DEFAULT_LIMIT;

  // Enforce bounds
  page = Math.max(1, page);
  limit = Math.min(Math.max(1, limit), MAX_LIMIT);

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Build pagination metadata for API response
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {object} Pagination metadata
 */
function buildPaginationMeta(page, limit, total) {
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null,
  };
}

/**
 * Build standardized paginated response
 * @param {Array} data - Array of items for current page
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {object} Standardized paginated response
 */
function paginatedResponse(data, page, limit, total) {
  return {
    success: true,
    data,
    pagination: buildPaginationMeta(page, limit, total),
  };
}

/**
 * Express middleware to parse pagination params and attach to req
 */
function paginationMiddleware(req, res, next) {
  req.pagination = parsePaginationParams(req.query);
  next();
}

module.exports = {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  parsePaginationParams,
  buildPaginationMeta,
  paginatedResponse,
  paginationMiddleware,
};
