import { withSecureAuth, withOptionalAuth as secureOptionalAuth } from './secure-auth';

// Replace the old insecure functions with secure ones
export const withAuth = withSecureAuth;
export const withOptionalAuth = secureOptionalAuth;

// Admin middleware using secure auth
export function withAdminAuth(handler) {
  return withSecureAuth(handler, { requireAdmin: true });
}

// Keep this function as-is for client-side checks
export async function checkAdminStatus(userId) {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('admin')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return false;
    }

    return user.admin || false;
  } catch (error) {
    console.error('Admin status check error:', error);
    return false;
  }
}