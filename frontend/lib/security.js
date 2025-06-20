// Security configuration and utilities

import crypto from 'crypto';
import { rateLimit } from 'express-rate-limit';

// Content Security Policy configuration
export const CSP_CONFIG = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-eval'", // Next.js requires this
    'https://vercel.live',
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com'
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Tailwind requires this
    'https://fonts.googleapis.com'
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https:',
    'https://a.ppy.sh', // osu! avatars
    'https://assets.ppy.sh', // osu! assets
    'https://vercel.com'
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com'
  ],
  'connect-src': [
    "'self'",
    'https://osu.ppy.sh', // osu! API
    'https://*.supabase.co', // Supabase
    'https://vercel.live',
    'wss://*.supabase.co' // Supabase realtime
  ],
  'frame-src': [
    "'self'",
    'https://vercel.live'
  ],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': []
};

// Generate CSP header string
export function generateCSPHeader(config = CSP_CONFIG) {
  return Object.entries(config)
    .map(([directive, sources]) => {
      if (sources.length === 0) return directive;
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
}

// Security headers middleware
export function setSecurityHeaders(req, res, next) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', generateCSPHeader());
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  res.setHeader('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );
  
  if (isProduction) {
    // HSTS - only in production with HTTPS
    const hstsMaxAge = process.env.HSTS_MAX_AGE || '31536000'; // 1 year
    res.setHeader('Strict-Transport-Security', 
      `max-age=${hstsMaxAge}; includeSubDomains; preload`
    );
    
    // Prevent caching of sensitive pages
    if (req.url.includes('/api/') || req.url.includes('/admin')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
  
  if (next) next();
}

// Input sanitization functions
export const sanitize = {
  // Remove potentially dangerous HTML tags and attributes
  html: (input) => {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/<link\b[^<]*>/gi, '')
      .replace(/<meta\b[^<]*>/gi, '')
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/javascript:/gi, '')
      .replace(/data:text\/html/gi, '')
      .trim();
  },
  
  // Sanitize for SQL-like queries (basic protection)
  sql: (input) => {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/['"`;\\]/g, '')
      .replace(/\b(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER|EXEC|EXECUTE)\b/gi, '')
      .trim();
  },
  
  // Sanitize filename
  filename: (input) => {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Remove invalid filename chars
      .replace(/^\.+/, '') // Remove leading dots
      .replace(/\.+$/, '') // Remove trailing dots
      .substring(0, 255) // Limit length
      .trim();
  },
  
  // Sanitize URL
  url: (input) => {
    if (typeof input !== 'string') return '';
    
    try {
      const url = new URL(input);
      // Only allow specific protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return '';
      }
      return url.toString();
    } catch {
      return '';
    }
  },
  
  // Sanitize email
  email: (input) => {
    if (typeof input !== 'string') return '';
    
    const email = input.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email) || email.length > 254) {
      return '';
    }
    
    return email;
  }
};

// Password security utilities
export const password = {
  // Check password strength
  checkStrength: (password) => {
    if (typeof password !== 'string') return { score: 0, feedback: ['Invalid password'] };
    
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      notCommon: !isCommonPassword(password)
    };
    
    const score = Object.values(checks).filter(Boolean).length;
    const feedback = [];
    
    if (!checks.length) feedback.push('Password must be at least 8 characters long');
    if (!checks.lowercase) feedback.push('Add lowercase letters');
    if (!checks.uppercase) feedback.push('Add uppercase letters');
    if (!checks.numbers) feedback.push('Add numbers');
    if (!checks.symbols) feedback.push('Add symbols');
    if (!checks.notCommon) feedback.push('Avoid common passwords');
    
    return { score, feedback, checks };
  },
  
  // Generate secure random password
  generate: (length = 16) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += chars.charAt(crypto.randomInt(0, chars.length));
    }
    
    return password;
  }
};

// Common password list (subset)
const commonPasswords = new Set([
  'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
  'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'iloveyou'
]);

function isCommonPassword(password) {
  return commonPasswords.has(password.toLowerCase());
}

// CSRF protection utilities
export const csrf = {
  // Generate CSRF token
  generateToken: () => {
    return crypto.randomBytes(32).toString('hex');
  },
  
  // Verify CSRF token
  verifyToken: (sessionToken, requestToken) => {
    if (!sessionToken || !requestToken) return false;
    return crypto.timingSafeEqual(
      Buffer.from(sessionToken, 'hex'),
      Buffer.from(requestToken, 'hex')
    );
  },
  
  // Middleware for CSRF protection
  middleware: (req, res, next) => {
    if (req.method === 'GET') {
      // Generate token for GET requests
      if (!req.session.csrfToken) {
        req.session.csrfToken = csrf.generateToken();
      }
      return next();
    }
    
    // Verify token for state-changing requests
    const token = req.headers['x-csrf-token'] || req.body._csrf;
    
    if (!csrf.verifyToken(req.session.csrfToken, token)) {
      return res.status(403).json({
        success: false,
        error: { message: 'Invalid CSRF token', code: 'CSRF_ERROR' }
      });
    }
    
    next();
  }
};

// Rate limiting configurations
export const rateLimiters = {
  // General API rate limiting
  api: rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
      success: false,
      error: { message: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' }
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for admin users (optional)
      return req.user?.is_admin === true;
    }
  }),
  
  // Stricter rate limiting for auth endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
      success: false,
      error: { message: 'Too many authentication attempts', code: 'AUTH_RATE_LIMIT' }
    },
    standardHeaders: true,
    legacyHeaders: false
  }),
  
  // Very strict rate limiting for password reset
  passwordReset: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts per hour
    message: {
      success: false,
      error: { message: 'Too many password reset attempts', code: 'PASSWORD_RESET_LIMIT' }
    }
  })
};

// Secure session configuration
export const sessionConfig = {
  name: process.env.SESSION_NAME || 'osu_tracker_session',
  secret: process.env.SESSION_SECRET || 'your-super-secret-session-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: process.env.SESSION_SAME_SITE || 'lax' // CSRF protection
  },
  rolling: true // Reset expiry on activity
};

// Data validation schemas
export const validationSchemas = {
  // User input validation
  username: {
    type: 'string',
    minLength: 3,
    maxLength: 15,
    pattern: /^[a-zA-Z0-9_-]+$/,
    required: true
  },
  
  email: {
    type: 'string',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 254,
    required: true
  },
  
  password: {
    type: 'string',
    minLength: 8,
    maxLength: 128,
    required: true
  },
  
  osuUserId: {
    type: 'number',
    min: 1,
    max: 99999999,
    required: true
  },
  
  challengeName: {
    type: 'string',
    minLength: 3,
    maxLength: 100,
    required: true
  },
  
  challengeDescription: {
    type: 'string',
    maxLength: 1000,
    required: false
  }
};

// Security audit logger
export function logSecurityEvent(event, details = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    details,
    ip: details.ip || 'unknown',
    userAgent: details.userAgent || 'unknown',
    userId: details.userId || null
  };
  
  console.warn('SECURITY EVENT:', JSON.stringify(logEntry));
  
  // In production, send to security monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Send to security monitoring service
  }
}

// Middleware to log suspicious activity
export function securityLogger(req, res, next) {
  const suspiciousPatterns = [
    /\.\./,  // Path traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /javascript:/i,  // JavaScript injection
    /eval\(/i,  // Code injection
  ];
  
  const fullUrl = req.url + JSON.stringify(req.body || {});
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fullUrl)) {
      logSecurityEvent('suspicious_request', {
        pattern: pattern.toString(),
        url: req.url,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        body: req.body
      });
      break;
    }
  }
  
  next();
}

// Export middleware setup function
export function setupSecurity(app) {
  // Apply security headers
  app.use(setSecurityHeaders);
  
  // Apply security logging
  app.use(securityLogger);
  
  // Apply rate limiting
  app.use('/api/', rateLimiters.api);
  app.use('/api/auth/', rateLimiters.auth);
  app.use('/api/auth/reset-password', rateLimiters.passwordReset);
}

export default {
  CSP_CONFIG,
  generateCSPHeader,
  setSecurityHeaders,
  sanitize,
  password,
  csrf,
  rateLimiters,
  sessionConfig,
  validationSchemas,
  logSecurityEvent,
  securityLogger,
  setupSecurity
};