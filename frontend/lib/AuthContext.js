import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    checkUser();

    // Listen for auth changes in other tabs
    const handleStorageChange = (e) => {
      if (e.key === 'auth_change') {
        console.log('🔄 AuthContext: Cross-tab auth change detected');
        checkUser();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // SIMPLIFIED: Only refresh on route changes for OAuth redirects
  useEffect(() => {
    if (mounted && router.pathname.startsWith('/profile/') && !user && !loading) {
      console.log('🔄 AuthContext: OAuth redirect detected, refreshing...');
      setTimeout(() => checkUser(), 300);
    }
  }, [router.pathname, user, loading, mounted]);

  // Handle logout success parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('logout') === 'success') {
      console.log('🔄 AuthContext: Logout success detected');
      
      // Clean up the URL immediately to prevent loops
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Force one final auth check
      setTimeout(() => checkUser(), 100);
    }
  }, [router.asPath]);

  const checkUser = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    try {
      console.log('🔍 AuthContext: Checking user...');
      
      const timestamp = Date.now();
      const response = await fetch(`/api/auth/status?_t=${timestamp}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) {
          console.log('✅ AuthContext: User found:', data.user.username);
          setUser(data.user);
          setIsAdmin(data.user.admin || false);
          
          // Notify other tabs
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_change', Date.now().toString());
            localStorage.removeItem('auth_change');
          }
        } else {
          console.log('❌ AuthContext: No user found');
          setUser(null);
          setIsAdmin(false);
        }
      } else {
        console.error('❌ AuthContext: Auth status failed:', response.status);
        setUser(null);
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('🚨 AuthContext: Auth check error:', error);
      setUser(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      console.log('🚪 AuthContext: Signing out...');
      
      // CRITICAL: Set loading first to prevent flickering
      setLoading(true);
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error('❌ Logout API failed:', response.status);
      }
      
      // SMOOTH: Update all auth state in one batch
      setUser(null);
      setIsAdmin(false);
      
      // Notify other tabs
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_change', Date.now().toString());
        localStorage.removeItem('auth_change');
      }
      
      console.log('✅ AuthContext: Signed out successfully');
      return true;
      
    } catch (error) {
      console.error('🚨 AuthContext: Logout error:', error);
      // Clear state even if API fails
      setUser(null);
      setIsAdmin(false);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUser = useCallback(() => {
    setLoading(true);
    return checkUser();
  }, [checkUser]);

  const value = {
    user,
    loading,
    isAdmin,
    checkUser: refreshUser,
    signOut
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  // SSR safety
  if (typeof window === 'undefined') {
    return {
      user: null,
      loading: true,
      isAdmin: false,
      checkUser: () => Promise.resolve(),
      signOut: () => Promise.resolve()
    };
  }
  
  return context;
}