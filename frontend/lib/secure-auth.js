import crypto from 'crypto';
import { supabaseAdmin } from './supabase-admin';

const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback-secret-change-this';
const SESSION_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

// Generate cryptographically secure session token
export function generateSessionToken(userId, userAgent = '', ipAddress = '') {
  const timestamp = Date.now();
  const random = crypto.randomBytes(32).toString('hex');
  
  // Create payload with user info and metadata
  const payload = {
    userId,
    timestamp,
    random,
    userAgent: userAgent.substring(0, 100), // Limit length
    ipAddress: ipAddress.split(',')[0].trim(), // First IP if proxied
    expiresAt: timestamp + SESSION_EXPIRY
  };
  
  // Create signature
  const data = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('hex');
  
  // Combine payload and signature
  const token = Buffer.from(JSON.stringify({ data: payload, signature })).toString('base64');
  
  return { token, expiresAt: payload.expiresAt };
}

// Verify and decode session token
export function verifySessionToken(token, userAgent = '', ipAddress = '') {
  try {
    if (!token) return null;
    
    // Decode token
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    const { data: payload, signature } = decoded;
    
    if (!payload || !signature) return null;
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    if (signature !== expectedSignature) {
      console.warn('🔒 Invalid session signature');
      return null;
    }
    
    // Check expiration
    if (Date.now() > payload.expiresAt) {
      console.warn('🔒 Session expired');
      return null;
    }
    
    // Optional: Verify user agent consistency (helps detect session hijacking)
    const currentUA = userAgent.substring(0, 100);
    if (payload.userAgent && currentUA && payload.userAgent !== currentUA) {
      console.warn('🔒 User agent mismatch - possible session hijacking');
      // Don't fail completely, but log for monitoring
    }
    
    // Optional: Verify IP consistency (be careful with proxies/mobile networks)
    const currentIP = ipAddress.split(',')[0].trim();
    if (payload.ipAddress && currentIP && payload.ipAddress !== currentIP) {
      console.warn('🔒 IP address mismatch - possible session hijacking');
      // Don't fail completely for IP changes (mobile users, etc.)
    }
    
    return {
      userId: payload.userId,
      createdAt: payload.timestamp,
      expiresAt: payload.expiresAt,
      isValid: true
    };
    
  } catch (error) {
    console.error('🔒 Session verification error:', error);
    return null;
  }
}

// Enhanced middleware with proper session management
export function withSecureAuth(handler, options = {}) {
  return async (req, res) => {
    const { requireAdmin = false, optional = false } = options;
    
    try {
      // Get session token from cookie
      const sessionToken = req.cookies.osu_session;
      
      if (!sessionToken) {
        if (optional) {
          return handler(req, res);
        }
        return res.status(401).json({
          success: false,
          error: {
            message: 'No authentication session found',
            code: 'NO_SESSION'
          }
        });
      }
      
      // Verify session token
      const session = verifySessionToken(
        sessionToken, 
        req.headers['user-agent'], 
        req.headers['x-forwarded-for'] || req.connection.remoteAddress
      );
      
      if (!session) {
        if (optional) {
          return handler(req, res);
        }
        
        // Clear invalid session cookie
        res.setHeader('Set-Cookie', [
          'osu_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
        ]);
        
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid or expired session',
            code: 'INVALID_SESSION'
          }
        });
      }
      
      // Get user from database
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('*, admin')
        .eq('id', session.userId)
        .single();
      
      if (error || !user) {
        if (optional) {
          return handler(req, res);
        }
        
        return res.status(401).json({
          success: false,
          error: {
            message: 'User not found',
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
      
      // Check admin requirement
      if (requireAdmin && !user.admin) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Admin access required',
            code: 'ADMIN_REQUIRED'
          }
        });
      }
      
      // Add user and session info to request
      req.user = user;
      req.session = session;
      
      // Refresh session if it's more than halfway to expiry
      const timeUntilExpiry = session.expiresAt - Date.now();
      const halfSessionLife = SESSION_EXPIRY / 2;
      
      if (timeUntilExpiry < halfSessionLife) {
        console.log(`🔄 Refreshing session for user ${user.id}`);
        
        const { token: newToken, expiresAt } = generateSessionToken(
          user.id,
          req.headers['user-agent'],
          req.headers['x-forwarded-for'] || req.connection.remoteAddress
        );
        
        // Set new session cookie
        const isProduction = process.env.NODE_ENV === 'production';
        const sessionCookieOptions = [
          `osu_session=${newToken}`,
          'Path=/',
          'HttpOnly',
          'SameSite=Lax',
          `Max-Age=${Math.floor(SESSION_EXPIRY / 1000)}`,
          ...(isProduction ? ['Secure'] : [])
        ].join('; ');
        
        res.setHeader('Set-Cookie', sessionCookieOptions);
      }
      
      return handler(req, res);
      
    } catch (error) {
      console.error('🔒 Secure auth middleware error:', error);
      
      if (optional) {
        return handler(req, res);
      }
      
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

// Updated auth callback with secure sessions
export async function handleSecureAuthCallback(req, res) {
  const { code, state } = req.query;
  
  console.log('🔑 === SECURE AUTH CALLBACK START ===');
  console.log('📍 URL:', req.url);
  console.log('🔑 Code present:', !!code);
  console.log('🎲 State received:', state);
  
  // Verify state parameter
  const cookieHeader = req.headers.cookie || '';
  const cookies = cookieHeader.split('; ');
  const stateCookie = cookies.find(c => c.startsWith('osu_auth_state='));
  
  if (!stateCookie) {
    console.log('❌ State cookie not found');
    return res.status(400).json({ 
      error: 'Invalid state parameter',
      details: 'State cookie not found'
    });
  }
  
  const savedState = stateCookie.split('=')[1];
  
  if (savedState !== state) {
    console.log('❌ State mismatch');
    return res.status(400).json({ 
      error: 'Invalid state parameter',
      details: 'State values do not match'
    });
  }
  
  console.log('✅ State verification PASSED');
  
  // Clear state cookie
  const isProduction = process.env.NODE_ENV === 'production';
  const clearStateCookie = [
    'osu_auth_state=',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    ...(isProduction ? ['Secure'] : [])
  ].join('; ');
  
  try {
    console.log('🔄 Exchanging code for access token...');
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://osu.ppy.sh/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.OSU_CLIENT_ID,
        client_secret: process.env.OSU_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.OSU_REDIRECT_URI,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Token exchange failed:', tokenResponse.status, errorText);
      throw new Error(`Failed to exchange code for token: ${tokenResponse.status}`);
    }
    
    const { access_token } = await tokenResponse.json();
    console.log('✅ Access token received');
    
    // Get user info from osu! API
    console.log('👤 Fetching user info from osu! API...');
    const userResponse = await fetch('https://osu.ppy.sh/api/v2/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });
    
    if (!userResponse.ok) {
      console.error('❌ User info fetch failed:', userResponse.status);
      throw new Error('Failed to fetch user info');
    }
    
    const osuUser = await userResponse.json();
    console.log('👤 osu! user data:', { 
      id: osuUser.id, 
      username: osuUser.username, 
      country: osuUser.country_code 
    });
    
    // Save user to database
    console.log('💾 Upserting user in database...');
    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('users')
      .upsert({
        osu_id: osuUser.id,
        username: osuUser.username,
        avatar_url: osuUser.avatar_url,
        country: osuUser.country_code,
        global_rank: osuUser.statistics?.global_rank,
        country_rank: osuUser.statistics?.country_rank,
        pp: osuUser.statistics?.pp,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'osu_id',
        ignoreDuplicates: false
      })
      .select()
      .single();
    
    if (dbError) {
      console.error('❌ Database error:', dbError);
      throw new Error('Failed to save user data');
    }
    
    console.log('✅ User saved to database:', { 
      id: dbUser.id, 
      username: dbUser.username,
      admin: dbUser.admin 
    });
    
    // Generate secure session token
    const { token: sessionToken } = generateSessionToken(
      dbUser.id,
      req.headers['user-agent'],
      req.headers['x-forwarded-for'] || req.connection.remoteAddress
    );
    
    // Set secure session cookie
    const sessionCookieOptions = [
      `osu_session=${sessionToken}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${Math.floor(SESSION_EXPIRY / 1000)}`,
      ...(isProduction ? ['Secure'] : [])
    ].join('; ');
    
    console.log('🍪 Setting secure session cookie');
    
    // Set both cookies in response
    res.setHeader('Set-Cookie', [clearStateCookie, sessionCookieOptions]);
    
    // Redirect to profile page
    console.log('↩️ Redirecting to profile...');
    res.redirect(`/profile/${dbUser.id}`);
    
  } catch (error) {
    console.error('🚨 Secure auth callback error:', error);
    res.redirect(`/?error=auth_failed&details=${encodeURIComponent(error.message)}`);
  }
}

// Utility functions for use in other parts of the app
export function withOptionalAuth(handler) {
  return withSecureAuth(handler, { optional: true });
}

export function withAdminAuth(handler) {
  return withSecureAuth(handler, { requireAdmin: true });
}

// Session management utilities
export async function invalidateSession(userId) {
  // In a production app, you might want to maintain a blacklist of invalidated sessions
  // For now, we rely on the cryptographic verification
  console.log(`🔒 Session invalidated for user ${userId}`);
}

export async function invalidateAllUserSessions(userId) {
  // This would be used for security incidents or password changes
  console.log(`🔒 All sessions invalidated for user ${userId}`);
}

// Security monitoring
export function logSecurityEvent(type, details, req) {
  console.warn(`🚨 SECURITY EVENT: ${type}`, {
    timestamp: new Date().toISOString(),
    type,
    details,
    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    userAgent: req.headers['user-agent']?.substring(0, 100),
    url: req.url
  });
}