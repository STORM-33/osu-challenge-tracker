import { supabase } from './supabase';

// Middleware to verify user authentication using cookie-based sessions
export function withAuth(handler) {
  return async (req, res) => {
    try {
      // Get user ID from cookie (matches your current auth setup)
      const userId = req.cookies.osu_session;

      if (!userId) {
        return res.status(401).json({ 
          success: false,
          error: { 
            message: 'No authentication session found',
            code: 'NO_SESSION'
          }
        });
      }

      // Get user from database with admin field
      const { data: user, error } = await supabase
        .from('users')
        .select('*, admin')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return res.status(401).json({ 
          success: false,
          error: { 
            message: 'User not found or session invalid',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      // Check if user is active (if you have status/banned fields)
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

// Optional auth middleware (doesn't fail if no session)
export function withOptionalAuth(handler) {
  return async (req, res) => {
    try {
      const userId = req.cookies.osu_session;
      
      if (userId) {
        try {
          const { data: user, error } = await supabase
            .from('users')
            .select('*, admin')
            .eq('id', userId)
            .single();

          if (!error && user && user.status !== 'inactive' && !user.banned_at) {
            req.user = user;
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
export function withAdminAuth(handler) {
  return withAuth(async (req, res) => {
    if (!req.user.admin) {
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

// Check if user has admin privileges (for client-side use)
export async function checkAdminStatus(userId) {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('admin')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return false;
    }

    return user.admin || false;
  } catch (error) {
    console.error('Admin status check error:', error);
    return false;
  }
}