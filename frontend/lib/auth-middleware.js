import jwt from 'jsonwebtoken';
import { supabase } from './supabase';

// Middleware to verify user authentication
export async function withAuth(handler) {
  return async (req, res) => {
    try {
      // Get token from cookie or header
      const token = req.cookies.osu_auth_token || req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ 
          success: false,
          error: { 
            message: 'No authentication token provided',
            code: 'NO_TOKEN'
          }
        });
      }

      // Verify JWT token (if using JWT)
      let decoded;
      try {
        if (process.env.JWT_SECRET) {
          decoded = jwt.verify(token, process.env.JWT_SECRET);
        } else {
          // Fallback to session-based auth
          const userId = req.cookies.osu_session;
          if (!userId) {
            throw new Error('Invalid session');
          }
          decoded = { userId };
        }
      } catch (jwtError) {
        return res.status(401).json({ 
          success: false,
          error: { 
            message: 'Invalid authentication token',
            code: 'INVALID_TOKEN'
          }
        });
      }

      // Get user from database
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', decoded.userId || decoded.sub)
        .single();

      if (error || !user) {
        return res.status(401).json({ 
          success: false,
          error: { 
            message: 'User not found or inactive',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      // Check if user is active
      if (user.status === 'inactive' || user.banned_at) {
        return res.status(403).json({ 
          success: false,
          error: { 
            message: 'User account is inactive or banned',
            code: 'USER_INACTIVE'
          }
        });
      }

      // Add user to request
      req.user = user;

      // Call the actual handler
      return handler(req, res);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ 
        success: false,
        error: { 
          message: 'Authentication verification failed',
          code: 'AUTH_ERROR'
        }
      });
    }
  };
}

// Optional auth middleware (doesn't fail if no token)
export async function withOptionalAuth(handler) {
  return async (req, res) => {
    try {
      const token = req.cookies.osu_auth_token || req.headers.authorization?.replace('Bearer ', '');
      
      if (token) {
        try {
          let decoded;
          if (process.env.JWT_SECRET) {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
          } else {
            const userId = req.cookies.osu_session;
            if (userId) {
              decoded = { userId };
            }
          }

          if (decoded) {
            const { data: user, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', decoded.userId || decoded.sub)
              .single();

            if (!error && user && user.status !== 'inactive' && !user.banned_at) {
              req.user = user;
            }
          }
        } catch (authError) {
          // Silently fail for optional auth
          console.warn('Optional auth failed:', authError.message);
        }
      }

      return handler(req, res);
    } catch (error) {
      console.error('Optional auth middleware error:', error);
      return handler(req, res); // Continue without auth
    }
  };
}

// Admin-only middleware
export async function withAdminAuth(handler) {
  return withAuth(async (req, res) => {
    if (!req.user.is_admin) {
      return res.status(403).json({ 
        success: false,
        error: { 
          message: 'Admin access required',
          code: 'ADMIN_REQUIRED'
        }
      });
    }
    return handler(req, res);
  });
}