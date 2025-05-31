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

  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Set cache headers if enabled
  if (cache) {
    res.setHeader(
      'Cache-Control',
      `s-maxage=${cacheTime}, stale-while-revalidate`
    );
  } else {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }

  return res.status(status).json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  });
}

// Standard error response handler
export function handleAPIError(res, error) {
  console.error('API Error:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

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
  } else if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
    status = 401;
    message = 'Authentication required';
    code = 'AUTH_REQUIRED';
  }

  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');

  return res.status(status).json({
    success: false,
    error: {
      message,
      code,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        details: error.details 
      })
    },
    timestamp: new Date().toISOString()
  });
}

// Improved rate limiting with memory management
class RateLimitStore {
  constructor(cleanupInterval = 300000) { // 5 minutes
    this.store = new Map();
    this.maxEntries = 10000; // Prevent memory bloat
    
    // Cleanup expired entries periodically
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, cleanupInterval);
  }

  cleanup() {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key);
        removed++;
      }
    }
    
    // If still too many entries, remove oldest
    if (this.store.size > this.maxEntries) {
      const entries = Array.from(this.store.entries())
        .sort((a, b) => a[1].resetTime - b[1].resetTime);
      
      const toRemove = this.store.size - this.maxEntries;
      for (let i = 0; i < toRemove; i++) {
        this.store.delete(entries[i][0]);
        removed++;
      }
    }
    
    if (removed > 0) {
      console.log(`Rate limit cleanup: removed ${removed} expired entries`);
    }
  }

  get(key) {
    return this.store.get(key);
  }

  set(key, value) {
    this.store.set(key, value);
  }

  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.store.clear();
  }
}

const rateLimitStore = new RateLimitStore();

export function checkRateLimit(identifier, maxRequests = 100, windowMs = 60000) {
  if (!identifier) {
    throw new APIError('Rate limit identifier required', 400, 'INVALID_IDENTIFIER');
  }

  const now = Date.now();
  const userLimits = rateLimitStore.get(identifier) || { 
    count: 0, 
    resetTime: now + windowMs,
    firstRequest: now
  };

  // Reset if window has passed
  if (now > userLimits.resetTime) {
    userLimits.count = 0;
    userLimits.resetTime = now + windowMs;
    userLimits.firstRequest = now;
  }

  userLimits.count++;
  rateLimitStore.set(identifier, userLimits);

  const remaining = Math.max(0, maxRequests - userLimits.count);
  const resetTime = new Date(userLimits.resetTime).toISOString();

  if (userLimits.count > maxRequests) {
    const error = new APIError('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
    error.headers = {
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': 0,
      'X-RateLimit-Reset': resetTime,
      'Retry-After': Math.ceil((userLimits.resetTime - now) / 1000)
    };
    throw error;
  }

  return {
    remaining,
    reset: resetTime,
    headers: {
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': remaining,
      'X-RateLimit-Reset': resetTime
    }
  };
}

// Request validation helper with improved security
export function validateRequest(req, schema) {
  const errors = [];

  // Validate method
  if (schema.method && req.method !== schema.method) {
    errors.push(`Method ${req.method} not allowed. Expected: ${schema.method}`);
  }

  // Validate required query params
  if (schema.query) {
    for (const [param, rules] of Object.entries(schema.query)) {
      const value = req.query[param];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`Query parameter '${param}' is required`);
        continue;
      }

      if (value !== undefined && value !== null && value !== '') {
        // Type validation
        if (rules.type === 'number') {
          const numValue = Number(value);
          if (isNaN(numValue) || !isFinite(numValue)) {
            errors.push(`Query parameter '${param}' must be a valid number`);
            continue;
          }
        }
        
        if (rules.type === 'boolean' && !['true', 'false', '1', '0'].includes(String(value).toLowerCase())) {
          errors.push(`Query parameter '${param}' must be a boolean (true/false)`);
          continue;
        }

        if (rules.type === 'string' && typeof value !== 'string') {
          errors.push(`Query parameter '${param}' must be a string`);
          continue;
        }

        // Range validation
        const numValue = Number(value);
        if (rules.min !== undefined && !isNaN(numValue) && numValue < rules.min) {
          errors.push(`Query parameter '${param}' must be at least ${rules.min}`);
        }

        if (rules.max !== undefined && !isNaN(numValue) && numValue > rules.max) {
          errors.push(`Query parameter '${param}' must be at most ${rules.max}`);
        }

        // String length validation
        if (rules.minLength && String(value).length < rules.minLength) {
          errors.push(`Query parameter '${param}' must be at least ${rules.minLength} characters`);
        }

        if (rules.maxLength && String(value).length > rules.maxLength) {
          errors.push(`Query parameter '${param}' must be at most ${rules.maxLength} characters`);
        }

        // Pattern validation
        if (rules.pattern && !rules.pattern.test(String(value))) {
          errors.push(`Query parameter '${param}' format is invalid`);
        }

        // Enum validation
        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(`Query parameter '${param}' must be one of: ${rules.enum.join(', ')}`);
        }
      }
    }
  }

  // Validate required body fields
  if (schema.body && req.body) {
    if (typeof req.body !== 'object' || Array.isArray(req.body)) {
      errors.push('Request body must be a valid JSON object');
    } else {
      for (const [field, rules] of Object.entries(schema.body)) {
        const value = req.body[field];

        if (rules.required && (value === undefined || value === null || value === '')) {
          errors.push(`Field '${field}' is required`);
          continue;
        }

        if (value !== undefined && value !== null && value !== '') {
          if (rules.type && typeof value !== rules.type) {
            errors.push(`Field '${field}' must be of type ${rules.type}`);
            continue;
          }

          // String validations
          if (rules.type === 'string') {
            if (rules.minLength && value.length < rules.minLength) {
              errors.push(`Field '${field}' must be at least ${rules.minLength} characters`);
            }
            if (rules.maxLength && value.length > rules.maxLength) {
              errors.push(`Field '${field}' must be at most ${rules.maxLength} characters`);
            }
            if (rules.pattern && !rules.pattern.test(value)) {
              errors.push(`Field '${field}' format is invalid`);
            }
          }

          // Number validations
          if (rules.type === 'number') {
            if (rules.min !== undefined && value < rules.min) {
              errors.push(`Field '${field}' must be at least ${rules.min}`);
            }
            if (rules.max !== undefined && value > rules.max) {
              errors.push(`Field '${field}' must be at most ${rules.max}`);
            }
          }

          // Array validations
          if (rules.type === 'array') {
            if (!Array.isArray(value)) {
              errors.push(`Field '${field}' must be an array`);
            } else {
              if (rules.minItems && value.length < rules.minItems) {
                errors.push(`Field '${field}' must have at least ${rules.minItems} items`);
              }
              if (rules.maxItems && value.length > rules.maxItems) {
                errors.push(`Field '${field}' must have at most ${rules.maxItems} items`);
              }
            }
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new APIError(errors.join(', '), 400, 'VALIDATION_ERROR');
  }
}

// Pagination helper with improved validation
export function getPaginationParams(req, maxLimit = 100, defaultLimit = 20) {
  let limit = defaultLimit;
  let page = 1;

  // Parse and validate limit
  if (req.query.limit) {
    const parsedLimit = parseInt(req.query.limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      throw new APIError('Limit must be a positive integer', 400, 'INVALID_LIMIT');
    }
    limit = Math.min(parsedLimit, maxLimit);
  }

  // Parse and validate page
  if (req.query.page) {
    const parsedPage = parseInt(req.query.page, 10);
    if (isNaN(parsedPage) || parsedPage < 1) {
      throw new APIError('Page must be a positive integer', 400, 'INVALID_PAGE');
    }
    page = parsedPage;
  }

  const offset = (page - 1) * limit;

  return { limit, offset, page };
}

// Response with pagination metadata
export function paginatedResponse(res, data, total, params, options = {}) {
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
      hasPrev: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null
    },
    timestamp: new Date().toISOString()
  });
}

// Graceful shutdown helper
export function setupGracefulShutdown() {
  const cleanup = () => {
    console.log('Cleaning up rate limit store...');
    rateLimitStore.destroy();
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
  process.on('exit', cleanup);
}

// Input sanitization helper
export function sanitizeInput(input, type = 'string') {
  if (input === null || input === undefined) {
    return input;
  }

  switch (type) {
    case 'string':
      return String(input).trim().slice(0, 1000); // Limit length
    case 'number':
      const num = Number(input);
      return isNaN(num) ? 0 : num;
    case 'boolean':
      return Boolean(input);
    case 'email':
      const email = String(input).trim().toLowerCase();
      return email.length > 320 ? '' : email; // RFC 5321 limit
    default:
      return input;
  }
}