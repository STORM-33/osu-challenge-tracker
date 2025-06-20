import { supabaseAdmin } from '../../../lib/supabase-admin';

export default async function handler(req, res) {
  const { code, state } = req.query;
  
  console.log('🔑 Auth callback received:', { code: code ? 'present' : 'missing', state });
  
  // Verify state matches
  const cookies = req.headers.cookie?.split('; ') || [];
  const stateCookie = cookies.find(c => c.startsWith('osu_auth_state='));
  const savedState = stateCookie?.split('=')[1];
  
  console.log('🍪 State verification:', { savedState, receivedState: state });
  
  if (!savedState || savedState !== state) {
    console.log('❌ State verification failed');
    return res.status(400).json({ error: 'Invalid state parameter' });
  }
  
  // Clear the state cookie
  res.setHeader('Set-Cookie', 'osu_auth_state=; Path=/; HttpOnly; Max-Age=0');
  
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
      throw new Error('Failed to exchange code for token');
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
    
    // Upsert user in database using admin client (bypasses RLS)
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
        // DON'T include admin field - let it keep existing value or DB default
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'osu_id',
        ignoreDuplicates: false // This ensures updates happen for existing users
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
    
    // Set session cookie
    const cookieOptions = [
      `osu_session=${dbUser.id}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      // Add Secure for production
      ...(process.env.NODE_ENV === 'production' ? ['Secure'] : [])
    ].join('; ');
    
    console.log('🍪 Setting session cookie:', cookieOptions);
    res.setHeader('Set-Cookie', cookieOptions);
    
    // Redirect to profile page
    console.log('↩️ Redirecting to profile...');
    res.redirect('/profile');
    
  } catch (error) {
    console.error('🚨 Auth callback error:', error);
    res.redirect('/?error=auth_failed');
  }
}