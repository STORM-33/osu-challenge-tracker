import { supabaseAdmin } from '../../../lib/supabase-admin';

async function handler(req, res) {
  const { code, state, error } = req.query;
  
  console.log('🔑 === SECURE AUTH CALLBACK START ===');
  console.log('📍 URL:', req.url);
  console.log('🔑 Code present:', !!code);
  console.log('🎲 State received:', state);
  console.log('❌ Error param:', error);
  
  // Check for OAuth errors first
  if (error) {
    console.log('❌ OAuth error received:', error);
    return res.redirect('/?error=oauth_denied');
  }
  
  // Verify state parameter - NO BYPASS ALLOWED
  const cookieHeader = req.headers.cookie || '';
  console.log('🍪 Cookie header:', cookieHeader);
  
  if (!cookieHeader) {
    console.log('❌ SECURITY: No cookies received - potential attack');
    return res.redirect('/?error=security_violation');
  }
  
  const cookies = cookieHeader.split('; ');
  console.log('🍪 All cookies:', cookies);
  
  // Look for state cookie with multiple fallbacks
  let stateCookie = cookies.find(c => c.startsWith('osu_auth_state='));
  if (!stateCookie) {
    stateCookie = cookies.find(c => c.startsWith('osu_auth_state_backup='));
  }
  
  if (!stateCookie) {
    console.log('❌ SECURITY: State cookie not found - BLOCKING AUTH');
    console.log('Available cookies:', cookies);
    return res.redirect('/?error=security_violation');
  }
  
  const savedState = stateCookie.split('=')[1];
  console.log('🔍 Saved state:', savedState);
  console.log('🔍 Received state:', state);
  
  if (!savedState || savedState !== state) {
    console.log('❌ SECURITY: State mismatch - BLOCKING AUTH');
    return res.redirect('/?error=security_violation');
  }
  
  if (!code) {
    console.log('❌ No authorization code received');
    return res.redirect('/?error=auth_failed');
  }
  
  console.log('✅ State verification PASSED - proceeding with auth');
  
  // Clear state cookies immediately
  const isProduction = process.env.NODE_ENV === 'production';
  const clearCookies = [
    'osu_auth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' + (isProduction ? '; Secure' : ''),
    'osu_auth_state_backup=; Path=/; HttpOnly; Max-Age=0' + (isProduction ? '; Secure' : '')
  ];
  
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
      return res.redirect('/?error=token_exchange_failed');
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
      return res.redirect('/?error=user_fetch_failed');
    }
    
    const osuUser = await userResponse.json();
    console.log('👤 osu! user data:', { 
      id: osuUser.id, 
      username: osuUser.username, 
      country: osuUser.country_code 
    });
    
    // Create NEW session, never reuse existing ones
    console.log('💾 Creating new user session...');
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
      return res.redirect('/?error=database_error');
    }
    
    console.log('✅ User saved to database:', { 
      id: dbUser.id, 
      username: dbUser.username,
      admin: dbUser.admin 
    });
    
    // Generate completely new session token with security metadata
    const sessionData = {
      userId: dbUser.id,
      timestamp: Date.now(),
      random: require('crypto').randomBytes(32).toString('hex'),
      userAgent: req.headers['user-agent']?.substring(0, 100),
      ipAddress: (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim(),
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
    };
    
    const sessionToken = Buffer.from(JSON.stringify({
      data: sessionData,
      signature: require('crypto')
        .createHmac('sha256', process.env.SESSION_SECRET)
        .update(JSON.stringify(sessionData))
        .digest('hex')
    })).toString('base64');
    
    // Set NEW session cookie
    const sessionCookie = `osu_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000` + (isProduction ? '; Secure' : '');
    
    console.log('🍪 Setting NEW session cookie');
    
    // Set all cookies
    res.setHeader('Set-Cookie', [...clearCookies, sessionCookie]);
    
    // Redirect to profile
    console.log('↩️ Redirecting to profile...');
    res.redirect(`/profile/${dbUser.id}`);
    
  } catch (error) {
    console.error('🚨 Auth callback error:', error);
    res.redirect(`/?error=auth_failed&details=${encodeURIComponent(error.message)}`);
  }
}

export default handler;