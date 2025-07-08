function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Clear the HttpOnly session cookie
    res.setHeader('Set-Cookie', [
      'osu_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
      // Also clear any other auth-related cookies if they exist
      'osu_auth_state=; Path=/; HttpOnly; Max-Age=0'
    ]);

    console.log('🍪 Session cookie cleared');

    return res.status(200).json({ 
      success: true, 
      message: 'Logged out successfully' 
    });

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to logout' 
    });
  }
}

export default handler;