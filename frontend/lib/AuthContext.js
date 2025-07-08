import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkUser();

    // Listen for auth changes in other tabs
    const handleStorageChange = (e) => {
      if (e.key === 'auth_change') {
        checkUser();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const checkUser = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      console.log('🔍 AuthContext: Checking user...');
      
      const response = await fetch('/api/auth/status', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) {
          console.log('✅ AuthContext: User found:', data.user.username);
          setUser(data.user);
          setIsAdmin(data.user.admin || false);
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
  };

  const signOut = async () => {
    try {
      console.log('🚪 AuthContext: Signing out...');
      
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      setUser(null);
      setIsAdmin(false);
      
      // Notify other tabs
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_change', Date.now().toString());
        localStorage.removeItem('auth_change');
      }
      
      console.log('✅ AuthContext: Signed out successfully');
    } catch (error) {
      console.error('🚨 AuthContext: Logout error:', error);
      throw error;
    }
  };

  const refreshUser = () => {
    setLoading(true);
    return checkUser();
  };

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