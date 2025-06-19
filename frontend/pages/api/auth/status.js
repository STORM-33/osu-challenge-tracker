import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user ID from HttpOnly cookie
    const userId = req.cookies.osu_session;
    
    if (!userId) {
      return res.status(200).json({ 
        authenticated: false, 
        user: null 
      });
    }

    // Fetch user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', parseInt(userId))
      .single();

    if (error || !user) {
      console.error('Auth status error:', error);
      return res.status(200).json({ 
        authenticated: false, 
        user: null 
      });
    }

    // Return user data (excluding sensitive info if needed)
    return res.status(200).json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        avatar_url: user.avatar_url,
        country: user.country,
        admin: user.admin,
        osu_id: user.osu_id
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