import { withOptionalAuth } from '../../../lib/auth-middleware';
import { handleAPIResponse, handleAPIError } from '../../../lib/api-utils';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Allow very short caching for performance, but not so long it breaks logout
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Add cache busting headers for logout scenarios
  const timestamp = Date.now();

  try {
    console.log('🔍 Auth status check:', {
      hasUser: !!req.user,
      username: req.user?.username,
      timestamp: new Date().toISOString()
    });

    if (!req.user) {
      return handleAPIResponse(res, { 
        authenticated: false, 
        user: null,
        timestamp
      }, { cache: false });
    }

    return handleAPIResponse(res, {
      authenticated: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        avatar_url: req.user.avatar_url,
        country: req.user.country,
        admin: req.user.admin,
        osu_id: req.user.osu_id
      },
      timestamp
    }, { cache: false });
  } catch (error) {
    console.error('🚨 Auth status error:', error);
    return res.status(500).json({ 
      authenticated: false, 
      user: null,
      error: 'Internal server error',
      timestamp
    });
  }
}

export default withOptionalAuth(handler);