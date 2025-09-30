function handler(req, res) {
    const { OSU_CLIENT_ID, OSU_REDIRECT_URI } = process.env;
    
    console.log('🔑 === SECURE LOGIN START ===');
    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('🏠 Host:', req.headers.host);
    console.log('🔗 Redirect URI:', OSU_REDIRECT_URI);
    
    if (!OSU_CLIENT_ID || !OSU_REDIRECT_URI) {
        console.error('❌ Missing OAuth configuration');
        return res.status(500).json({ error: 'Server configuration error' });
    }
    
    // Generate cryptographically secure state
    const state = require('crypto').randomBytes(16).toString('hex');
    console.log('🎲 Generated state:', state);
    
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Set cookies with proper attributes for OAuth flows
    const stateCookieOptions = [
    `osu_auth_state=${state}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=600',
    ...(isProduction ? ['Secure'] : [])
    ].join('; ');

    console.log('Setting state cookie (SameSite=Lax):', stateCookieOptions);

    res.setHeader('Set-Cookie', stateCookieOptions);
    
    // Build OAuth URL with proper parameters
    const authUrl = new URL('https://osu.ppy.sh/oauth/authorize');
    authUrl.searchParams.set('client_id', OSU_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', OSU_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'identify public');
    authUrl.searchParams.set('state', state);
    
    const finalAuthUrl = authUrl.toString();
    console.log('🔑 Redirecting to OAuth provider');
    
    // Always redirect to OAuth, never skip this step
    res.redirect(finalAuthUrl);
}

export default handler;