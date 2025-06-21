import { withAPITracking } from '../../../middleware';

function handler(req, res) {
    const { OSU_CLIENT_ID, OSU_REDIRECT_URI } = process.env;
    
    console.log('🔑 Starting OAuth login flow');
    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('🔗 Redirect URI:', OSU_REDIRECT_URI);
    
    // Generate a random state for security
    const state = Math.random().toString(36).substring(7);
    
    console.log('🎲 Generated state:', state);
    
    // Set cookie attributes based on environment
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = [
        `osu_auth_state=${state}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        'Max-Age=600',
        // Add Secure flag for production (HTTPS)
        ...(isProduction ? ['Secure'] : [])
    ].join('; ');
    
    console.log('🍪 Setting state cookie:', cookieOptions);
    
    // Store state in httpOnly cookie
    res.setHeader('Set-Cookie', cookieOptions);
    
    // Redirect to osu! OAuth
    const authUrl = new URL('https://osu.ppy.sh/oauth/authorize');
    authUrl.searchParams.append('client_id', OSU_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', OSU_REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'identify public');
    authUrl.searchParams.append('state', state);
    
    console.log('↗️ Redirecting to osu! OAuth:', authUrl.toString());
    
    res.redirect(authUrl.toString());
}

export default withAPITracking(handler, { memoryMB: 128 });