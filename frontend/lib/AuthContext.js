import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Add refs to prevent loops and rate limit checks
  const checkingUserRef = useRef(false);
  const lastUserCheckRef = useRef(0);
  const userCheckTimeoutRef = useRef(null);
  const isInitialCheckRef = useRef(true);

  useEffect(() => {
    setMounted(true);
    checkUser();

    // Listen for auth changes in other tabs
    const handleStorageChange = (e) => {
      // FIXED: Only respond to actual auth state changes, not our own notifications
      if (e.key === 'auth_state_changed' && e.newValue) {
        console.log('🔄 AuthContext: Cross-tab auth change detected');
        const authData = JSON.parse(e.newValue);
        
        // FIXED: Don't call checkUser(), just update state directly from other tab
        if (authData.user) {
          console.log('✅ AuthContext: User synced from other tab:', authData.user.username);
          setUser(authData.user);
          setIsAdmin(authData.user.admin || false);
        } else {
          console.log('❌ AuthContext: User cleared from other tab');
          setUser(null);
          setIsAdmin(false);
        }
        setLoading(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (userCheckTimeoutRef.current) {
        clearTimeout(userCheckTimeoutRef.current);
      }
    };
  }, []);

  // SIMPLIFIED: Only refresh on route changes for OAuth redirects
  useEffect(() => {
    if (mounted && router.pathname.startsWith('/profile/') && !user && !loading) {
      console.log('🔄 AuthContext: OAuth redirect detected, refreshing...');
      // Use debounced check
      debouncedCheckUser();
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
      
      // Use debounced check instead of immediate
      debouncedCheckUser();
    }
  }, [router.asPath]);

  // FIXED: Add debounced user check to prevent rapid successive calls
  const debouncedCheckUser = useCallback(() => {
    if (userCheckTimeoutRef.current) {
      clearTimeout(userCheckTimeoutRef.current);
    }
    
    userCheckTimeoutRef.current = setTimeout(() => {
      checkUser();
    }, 100); // 100ms debounce
  }, []);

  const checkUser = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    // FIXED: Prevent concurrent checks and rate limiting
    if (checkingUserRef.current) {
      console.log('🔄 AuthContext: User check already in progress, skipping...');
      return;
    }

    // FIXED: Rate limit checks (max once per 2 seconds, except initial)
    const now = Date.now();
    if (!isInitialCheckRef.current && now - lastUserCheckRef.current < 2000) {
      console.log('🔄 AuthContext: Rate limiting user check, skipping...');
      return;
    }

    try {
      checkingUserRef.current = true;
      lastUserCheckRef.current = now;
      isInitialCheckRef.current = false;
      
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
        
        // Handle both old and new API response formats
        const responseData = data.data || data;
        
        if (responseData.authenticated && responseData.user) {
          console.log('✅ AuthContext: User found:', responseData.user.username);
          setUser(responseData.user);
          setIsAdmin(responseData.user.admin || false);
          
          // FIXED: Only notify other tabs about actual state changes
          // Store the actual auth state instead of just a timestamp
          if (typeof window !== 'undefined') {
            const authState = {
              user: responseData.user,
              admin: responseData.user.admin || false,
              timestamp: Date.now()
            };
            localStorage.setItem('auth_state_changed', JSON.stringify(authState));
            // Remove after a short delay to trigger the event
            setTimeout(() => {
              localStorage.removeItem('auth_state_changed');
            }, 50);
          }
        } else {
          console.log('❌ AuthContext: No user found');
          setUser(null);
          setIsAdmin(false);
          
          // FIXED: Notify other tabs about logout
          if (typeof window !== 'undefined') {
            const authState = {
              user: null,
              admin: false,
              timestamp: Date.now()
            };
            localStorage.setItem('auth_state_changed', JSON.stringify(authState));
            setTimeout(() => {
              localStorage.removeItem('auth_state_changed');
            }, 50);
          }
        }
      }
    } catch (error) {
      console.error('🚨 AuthContext: Auth check error:', error);
      setUser(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
      checkingUserRef.current = false;
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
      
      // FIXED: Notify other tabs about logout with actual state
      if (typeof window !== 'undefined') {
        const authState = {
          user: null,
          admin: false,
          timestamp: Date.now()
        };
        localStorage.setItem('auth_state_changed', JSON.stringify(authState));
        setTimeout(() => {
          localStorage.removeItem('auth_state_changed');
        }, 50);
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
    // Use debounced check for manual refreshes too
    debouncedCheckUser();
  }, [debouncedCheckUser]);

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