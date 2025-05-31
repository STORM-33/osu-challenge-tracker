import jwt from 'jsonwebtoken';
import { supabase } from './supabase';

// Middleware to verify user authentication
export async function withAuth(handler) {
  return async (req, res) => {
    try {
      // Get token from cookie or header
      const token = req.cookies.osu_auth_token || req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'No authentication token provided' });
      }

      // In production, use proper JWT verification
      // For now, we'll use a simple session check
      const userId = req.cookies.osu_session;
      
      if (!userId) {
        return res.status(401).json({ error: 'Invalid session' });
      }

      // Get user from database
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Add user to request
      req.user = user;

      // Call the actual handler
      return handler(req, res);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(401).json({ error: 'Authentication failed' });
    }
  };
}

// Middleware to optionally get user if authenticated
export async function withOptionalAuth(handler) {
  return async (req, res) => {
    try {
      const userId = req.cookies.osu_session;
      
      if (userId) {
        const { data: user } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        
        req.user = user;
      }

      return handler(req, res);
    } catch (error) {
      // Continue without user
      return handler(req, res);
    }
  };
}

// Helper to generate session token
export function generateSessionToken(user) {
  // In production, use proper JWT with expiration
  return {
    userId: user.id,
    username: user.username,
    timestamp: Date.now()
  };
}

// Helper to set auth cookies
export function setAuthCookies(res, user) {
  // Set httpOnly cookie for security
  res.setHeader('Set-Cookie', [
    `osu_session=${user.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`, // 7 days
    `osu_username=${user.username}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
  ]);
}

// Helper to clear auth cookies
export function clearAuthCookies(res) {
  res.setHeader('Set-Cookie', [
    'osu_session=; Path=/; HttpOnly; Max-Age=0',
    'osu_username=; Path=/; Max-Age=0'
  ]);
}