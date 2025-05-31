import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  const { code, state } = req.query;
  
  // Verify state matches
  const cookies = req.headers.cookie?.split('; ') || [];
  const stateCookie = cookies.find(c => c.startsWith('osu_auth_state='));
  const savedState = stateCookie?.split('=')[1];
  
  if (!savedState || savedState !== state) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }
  
  // Clear the state cookie
  res.setHeader('Set-Cookie', 'osu_auth_state=; Path=/; HttpOnly; Max-Age=0');
  
  try {
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
      throw new Error('Failed to exchange code for token');
    }
    
    const { access_token } = await tokenResponse.json();
    
    // Get user info from osu! API
    const userResponse = await fetch('https://osu.ppy.sh/api/v2/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });
    
    if (!userResponse.ok) {
      throw new Error('Failed to fetch user info');
    }
    
    const osuUser = await userResponse.json();
    
    // Upsert user in database
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .upsert({
        osu_id: osuUser.id,
        username: osuUser.username,
        avatar_url: osuUser.avatar_url,
        country: osuUser.country_code,
        global_rank: osuUser.statistics?.global_rank,
        country_rank: osuUser.statistics?.country_rank,
        pp: osuUser.statistics?.pp,
      }, {
        onConflict: 'osu_id',
      })
      .select()
      .single();
    
    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save user data');
    }
    
    // For now, we'll use a simple cookie-based session
    // In production, use proper JWT tokens
    res.setHeader('Set-Cookie', `osu_session=${dbUser.id}; Path=/; HttpOnly; SameSite=Lax`);
    
    // Redirect to profile page
    res.redirect('/profile');
    
  } catch (error) {
    console.error('Auth error:', error);
    res.redirect('/?error=auth_failed');
  }
}