import { withAPITracking } from '../../../middleware';

function handler(req, res) {
    const { OSU_CLIENT_ID, OSU_REDIRECT_URI } = process.env;
    
    console.log('🔑 === LOGIN HANDLER DEBUG START ===');
    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('🏠 Host:', req.headers.host);
    console.log('🔗 Redirect URI configured:', OSU_REDIRECT_URI);
    console.log('🆔 Client ID:', OSU_CLIENT_ID ? 'present' : 'missing');
    
    if (!OSU_CLIENT_ID || !OSU_REDIRECT_URI) {
        console.error('❌ Missing required environment variables');
        return res.status(500).json({ error: 'Server configuration error' });
    }
    
    // Generate a random state for security
    const state = Math.random().toString(36).substring(7);
    console.log('🎲 Generated state:', state);
    console.log('🎲 State length:', state.length);
    
    // Try multiple cookie setting approaches for better compatibility
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Primary cookie with all attributes
    const primaryCookieOptions = [
        `osu_auth_state=${state}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        'Max-Age=600',
        ...(isProduction ? ['Secure'] : [])
    ].join('; ');
    
    // Fallback cookie with minimal attributes (in case SameSite causes issues)
    const fallbackCookieOptions = [
        `osu_auth_state_backup=${state}`,
        'Path=/',
        'HttpOnly',
        'Max-Age=600',
        ...(isProduction ? ['Secure'] : [])
    ].join('; ');
    
    console.log('🍪 Setting primary cookie:', primaryCookieOptions);
    console.log('🍪 Setting fallback cookie:', fallbackCookieOptions);
    
    // Set both cookies
    res.setHeader('Set-Cookie', [primaryCookieOptions, fallbackCookieOptions]);
    
    // Build OAuth URL
    const authUrl = new URL('https://osu.ppy.sh/oauth/authorize');
    authUrl.searchParams.append('client_id', OSU_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', OSU_REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'identify public');
    authUrl.searchParams.append('state', state);
    
    const finalAuthUrl = authUrl.toString();
    console.log('↗️ Final OAuth URL:', finalAuthUrl);
    console.log('📏 URL length:', finalAuthUrl.length);
    
    // Additional debugging: log the exact redirect URI being used
    console.log('🔍 OAuth redirect URI match check:');
    console.log('  - Env var:', OSU_REDIRECT_URI);
    console.log('  - URL param:', authUrl.searchParams.get('redirect_uri'));
    console.log('  - Match:', OSU_REDIRECT_URI === authUrl.searchParams.get('redirect_uri'));
    
    console.log('🔑 === REDIRECTING TO OSU ===');
    res.redirect(finalAuthUrl);
}

export default withAPITracking(handler, { memoryMB: 128 });