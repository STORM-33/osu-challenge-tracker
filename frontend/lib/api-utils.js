// API error handling utilities

export class APIError extends Error {
    constructor(message, status, code) {
      super(message);
      this.status = status;
      this.code = code;
      this.name = 'APIError';
    }
  }
  
  // Standard API response handler
  export function handleAPIResponse(res, data, options = {}) {
    const { 
      status = 200, 
      cache = false,
      cacheTime = 60 
    } = options;
  
    // Set cache headers if enabled
    if (cache) {
      res.setHeader(
        'Cache-Control',
        `s-maxage=${cacheTime}, stale-while-revalidate`
      );
    }
  
    return res.status(status).json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  }
  
  // Standard error response handler
  export function handleAPIError(res, error) {
    console.error('API Error:', error);
  
    // Determine status code
    let status = 500;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
  
    if (error instanceof APIError) {
      status = error.status;
      message = error.message;
      code = error.code;
    } else if (error.message?.includes('not found')) {
      status = 404;
      message = 'Resource not found';
      code = 'NOT_FOUND';
    } else if (error.message?.includes('unauthorized')) {
      status = 401;
      message = 'Unauthorized';
      code = 'UNAUTHORIZED';
    } else if (error.message?.includes('forbidden')) {
      status = 403;
      message = 'Forbidden';
      code = 'FORBIDDEN';
    }
  
    return res.status(status).json({
      success: false,
      error: {
        message,
        code,
        ...(process.env.NODE_ENV === 'development' && { 
          stack: error.stack 
        })
      },
      timestamp: new Date().toISOString()
    });
  }
  
  // Rate limiting helper
  const rateLimitMap = new Map();
  
  export function checkRateLimit(identifier, maxRequests = 100, windowMs = 60000) {
    const now = Date.now();
    const userLimits = rateLimitMap.get(identifier) || { count: 0, resetTime: now + windowMs };
  
    // Reset if window has passed
    if (now > userLimits.resetTime) {
      userLimits.count = 0;
      userLimits.resetTime = now + windowMs;
    }
  
    userLimits.count++;
    rateLimitMap.set(identifier, userLimits);
  
    if (userLimits.count > maxRequests) {
      throw new APIError('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
    }
  
    return {
      remaining: maxRequests - userLimits.count,
      reset: new Date(userLimits.resetTime).toISOString()
    };
  }
  
  // Request validation helper
  export function validateRequest(req, schema) {
    const errors = [];
  
    // Validate method
    if (schema.method && req.method !== schema.method) {
      errors.push(`Method ${req.method} not allowed`);
    }
  
    // Validate required query params
    if (schema.query) {
      for (const [param, rules] of Object.entries(schema.query)) {
        const value = req.query[param];
  
        if (rules.required && !value) {
          errors.push(`Query parameter '${param}' is required`);
        }
  
        if (value && rules.type) {
          if (rules.type === 'number' && isNaN(Number(value))) {
            errors.push(`Query parameter '${param}' must be a number`);
          }
          if (rules.type === 'boolean' && !['true', 'false'].includes(value)) {
            errors.push(`Query parameter '${param}' must be a boolean`);
          }
        }
  
        if (value && rules.min !== undefined && Number(value) < rules.min) {
          errors.push(`Query parameter '${param}' must be at least ${rules.min}`);
        }
  
        if (value && rules.max !== undefined && Number(value) > rules.max) {
          errors.push(`Query parameter '${param}' must be at most ${rules.max}`);
        }
      }
    }
  
    // Validate required body fields
    if (schema.body && req.body) {
      for (const [field, rules] of Object.entries(schema.body)) {
        const value = req.body[field];
  
        if (rules.required && !value) {
          errors.push(`Field '${field}' is required`);
        }
  
        if (value && rules.type && typeof value !== rules.type) {
          errors.push(`Field '${field}' must be of type ${rules.type}`);
        }
      }
    }
  
    if (errors.length > 0) {
      throw new APIError(errors.join(', '), 400, 'VALIDATION_ERROR');
    }
  }
  
  // Pagination helper
  export function getPaginationParams(req, maxLimit = 100) {
    const limit = Math.min(
      Math.max(1, parseInt(req.query.limit) || 50),
      maxLimit
    );
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const offset = (page - 1) * limit;
  
    return { limit, offset, page };
  }
  
  // Response with pagination metadata
  export function paginatedResponse(res, data, total, params) {
    const { limit, page } = params;
    const totalPages = Math.ceil(total / limit);
  
    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      timestamp: new Date().toISOString()
    });
  }