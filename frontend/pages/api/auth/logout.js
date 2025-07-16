function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🚪 Logout request received');
  console.log('🌍 Environment:', process.env.NODE_ENV);
  console.log('🍪 Current cookies:', req.headers.cookie);

  try {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Clear cookies with proper production attributes
    const clearCookies = [
      // Main session cookie with correct production attributes
      `osu_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProduction ? '; Secure' : ''}`,
      
      // Clear OAuth state cookies with production attributes
      `osu_auth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProduction ? '; Secure' : ''}`,
      `osu_auth_state=; Path=/; HttpOnly; SameSite=None; Max-Age=0${isProduction ? '; Secure' : ''}`,
      `osu_auth_state_backup=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProduction ? '; Secure' : ''}`,
      
      // Clear any potential domain-specific cookies
      ...(isProduction ? [
        'osu_session=; Path=/; Domain=.challengersnexus.com; HttpOnly; SameSite=Lax; Max-Age=0; Secure',
        'osu_session=; Path=/; Domain=challengersnexus.com; HttpOnly; SameSite=Lax; Max-Age=0; Secure'
      ] : [])
    ];

    console.log('🧹 Clearing session cookies:', clearCookies);
    res.setHeader('Set-Cookie', clearCookies);
    
    // Prevent any caching of logout response
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    console.log('🍪 Session cookie cleared');

    return handleAPIResponse(res, {
      message: 'Logged out successfully',
      cookiesCleared: clearCookies.length
    });

  } catch (error) {
    console.error('🚨 Logout error:', error);
    
    // Even if there's an error, try to clear the main session cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.setHeader('Set-Cookie', [
      `osu_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProduction ? '; Secure' : ''}`
    ]);
    
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to logout',
      timestamp: new Date().toISOString()
    });
  }
}

export default handler;