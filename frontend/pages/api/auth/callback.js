import { supabaseAdmin } from '../../../lib/supabase-admin';
import { handleSecureAuthCallback } from '../../../lib/secure-auth';

async function handler(req, res) {
  const { code, state } = req.query;
  
  // Enhanced debugging
  console.log('🔑 === AUTH CALLBACK DEBUG START ===');
  console.log('📍 URL:', req.url);
  console.log('🌍 Environment:', process.env.NODE_ENV);
  console.log('🏠 Host:', req.headers.host);
  console.log('🔗 Referer:', req.headers.referer);
  console.log('🍪 Raw Cookie Header:', req.headers.cookie);
  console.log('📨 Query params:', req.query);
  console.log('🔑 Code present:', !!code);
  console.log('🎲 State received:', state);
  
  // Parse all cookies with detailed logging
  const cookieHeader = req.headers.cookie || '';
  console.log('🍪 Cookie header length:', cookieHeader.length);
  
  if (!cookieHeader) {
    console.log('❌ NO COOKIE HEADER FOUND AT ALL');
    return res.status(400).json({ 
      error: 'Invalid state parameter',
      details: 'No cookies received',
      debug: {
        cookieHeader: cookieHeader,
        allHeaders: Object.keys(req.headers),
        host: req.headers.host,
        userAgent: req.headers['user-agent']?.substring(0, 100)
      }
    });
  }
  
  const cookies = cookieHeader.split('; ');
  console.log('🍪 All cookies found:', cookies);
  console.log('🍪 Cookie count:', cookies.length);
  
  // Look for our state cookie with multiple approaches
  let savedState = null;
  let stateCookieFound = false;
  
  // Method 1: Direct search
  const stateCookie = cookies.find(c => c.startsWith('osu_auth_state='));
  if (stateCookie) {
    savedState = stateCookie.split('=')[1];
    stateCookieFound = true;
    console.log('✅ State cookie found (method 1):', stateCookie);
  }
  
  // Method 2: Manual parsing (in case of encoding issues)
  if (!stateCookieFound) {
    for (const cookie of cookies) {
      const [name, value] = cookie.split('=');
      if (name?.trim() === 'osu_auth_state') {
        savedState = value;
        stateCookieFound = true;
        console.log('✅ State cookie found (method 2):', cookie);
        break;
      }
    }
  }
  
  console.log('🔍 State verification details:');
  console.log('  - State cookie found:', stateCookieFound);
  console.log('  - Saved state:', savedState);
  console.log('  - Received state:', state);
  console.log('  - States match:', savedState === state);
  console.log('  - Saved state length:', savedState?.length);
  console.log('  - Received state length:', state?.length);
  
  if (!stateCookieFound || !savedState) {
    console.log('❌ State cookie not found');
    return res.status(400).json({ 
      error: 'Invalid state parameter',
      details: 'State cookie not found',
      debug: {
        cookiesReceived: cookies,
        cookieCount: cookies.length,
        cookieHeader: cookieHeader,
        stateCookieFound,
        host: req.headers.host
      }
    });
  }
  
  if (savedState !== state) {
    console.log('❌ State mismatch');
    return res.status(400).json({ 
      error: 'Invalid state parameter',
      details: 'State values do not match',
      debug: {
        expected: savedState,
        received: state,
        expectedLength: savedState?.length,
        receivedLength: state?.length
      }
    });
  }
  
  console.log('✅ State verification PASSED');
  console.log('🔑 === PROCEEDING WITH AUTH ===');
  
  // Clear the state cookie with same attributes as when we set it
  const isProduction = process.env.NODE_ENV === 'production';
  const clearCookieOptions = [
    'osu_auth_state=',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax', 
    'Max-Age=0',
    ...(isProduction ? ['Secure'] : [])
  ].join('; ');
  
  console.log('🧹 Clearing state cookie:', clearCookieOptions);
  
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
    
    // Set session cookie with proper attributes for production
    const sessionCookieOptions = [
      `osu_session=${dbUser.id}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=2592000', // 30 days
      ...(isProduction ? ['Secure'] : [])
    ].join('; ');
    
    console.log('🍪 Setting session cookie:', sessionCookieOptions);
    
    // Set both cookies in response
    res.setHeader('Set-Cookie', [clearCookieOptions, sessionCookieOptions]);
    
    // Redirect to profile page
    console.log('↩️ Redirecting to profile...');
    res.redirect(`/profile/${dbUser.id}`);
    
  } catch (error) {
    console.error('🚨 Auth callback error:', error);
    res.redirect(`/?error=auth_failed&details=${encodeURIComponent(error.message)}`);
  }
}

export default handleSecureAuthCallback;