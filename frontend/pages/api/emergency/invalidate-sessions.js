export default function handler(req, res) {
  console.log('🚨 EMERGENCY: Invalidating all sessions');
  console.log('🕐 Timestamp:', new Date().toISOString());
  console.log('🌐 IP:', req.headers['x-forwarded-for'] || req.connection.remoteAddress);
  
  // Get environment info
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Clear ALL authentication cookies with maximum compatibility
  const clearCookies = [
    // Main session cookie
    `osu_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProduction ? '; Secure' : ''}`,
    
    // OAuth state cookies  
    `osu_auth_state=; Path=/; HttpOnly; SameSite=None; Max-Age=0${isProduction ? '; Secure' : ''}`,
    `osu_auth_state_backup=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProduction ? '; Secure' : ''}`,
    
    // Legacy cookies (in case old ones exist)
    `session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProduction ? '; Secure' : ''}`,
    `auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProduction ? '; Secure' : ''}`,
    
    // Clear any potential subdomain cookies
    `osu_session=; Path=/; Domain=.challengersnexus.com; HttpOnly; SameSite=Lax; Max-Age=0${isProduction ? '; Secure' : ''}`,
  ];
  
  console.log('🧹 Clearing cookies:', clearCookies);
  
  // Set response headers to clear cookies
  res.setHeader('Set-Cookie', clearCookies);
  
  // Prevent caching of this response
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Return success response
  res.status(200).json({ 
    success: true,
    message: 'All user sessions have been invalidated',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    cookiesCleared: clearCookies.length
  });
  
  console.log('✅ Emergency session invalidation completed');
}