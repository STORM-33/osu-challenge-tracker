import { withSecureAuth, withOptionalAuth as secureOptionalAuth } from './secure-auth';

// Replace the old insecure functions with secure ones
export const withAuth = withSecureAuth;
export const withOptionalAuth = secureOptionalAuth;

// Admin middleware using secure auth
export function withAdminAuth(handler) {
  return withSecureAuth(handler, { requireAdmin: true });
}
