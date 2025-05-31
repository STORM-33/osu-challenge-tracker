export default function handler(req, res) {
    const { OSU_CLIENT_ID, OSU_REDIRECT_URI } = process.env;
    
    // Generate a random state for security
    const state = Math.random().toString(36).substring(7);
    
    // Store state in httpOnly cookie
    res.setHeader('Set-Cookie', `osu_auth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);
    
    // Redirect to osu! OAuth
    const authUrl = new URL('https://osu.ppy.sh/oauth/authorize');
    authUrl.searchParams.append('client_id', OSU_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', OSU_REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'identify public');
    authUrl.searchParams.append('state', state);
    
    res.redirect(authUrl.toString());
  }