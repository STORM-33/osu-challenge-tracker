import { withOptionalAuth } from '../../../lib/auth-middleware';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'private, max-age=300');

  try {
    if (!req.user) {
      return res.status(200).json({ 
        authenticated: false, 
        user: null 
      });
    }

    return res.status(200).json({
      authenticated: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        avatar_url: req.user.avatar_url,
        country: req.user.country,
        admin: req.user.admin,
        osu_id: req.user.osu_id
      }
    });

  } catch (error) {
    console.error('Auth status error:', error);
    return res.status(500).json({ 
      authenticated: false, 
      user: null,
      error: 'Internal server error' 
    });
  }
}

export default withOptionalAuth(handler);