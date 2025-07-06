import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { auth } from '../lib/supabase';
import { Trophy, User, LogIn, LogOut, BarChart3, Plus, Heart, Link2, X} from 'lucide-react';

export default function Layout({ children, backgroundImage = '/default-bg.png' }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const userData = await auth.getCurrentUser();
      
      if (userData) {
        setUser(userData);
        setIsAdmin(userData?.admin || false);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    } catch (error) {
      setUser(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setIsAdmin(false);
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Navigation items configuration
  const navItems = [
    { href: '/', label: 'challenges', icon: Trophy },
    { href: '/leaderboard', label: 'leaderboard', icon: BarChart3 },
    { href: '/partners', label: 'partners', icon: Link2 },
  ];

  return (
    <div className="min-h-screen relative">
      {/* Background image layer */}
      <div 
        className="fixed inset-0 -z-20 bg-cover bg-center"
        style={{ 
          backgroundImage: `url(${backgroundImage})`,
          filter: 'blur(8px) brightness(0.8)'
        }}
      />
      
      {/* Header with only grid pattern that fades */}
      <header className="relative z-50 overflow-hidden">
        {/* Only the grid pattern with fade - no background panels */}
        <div className="absolute inset-0">
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              {/* Glow filter for the grid lines */}
              <filter id="gridGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="0.8" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              {/* Gradient mask that makes grid lines fade from top to bottom */}
              <linearGradient id="gridFade" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor: 'white', stopOpacity: 1}} />
                <stop offset="70%" style={{stopColor: 'white', stopOpacity: 0.3}} />
                <stop offset="100%" style={{stopColor: 'white', stopOpacity: 0}} />
              </linearGradient>
              
              <mask id="fadeMask">
                <rect width="100%" height="100%" fill="url(#gridFade)" />
              </mask>
              
              <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" filter="url(#gridGlow)"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" mask="url(#fadeMask)" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-4 relative">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link 
              href="/"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              {/* Replace with your PNG logo */}
              <img 
                src="/logo.png" 
                alt="osu!Challengers Nexus"
                className="h-10 icon-shadow-adaptive"
                onError={(e) => {
                  // Fallback to text if logo doesn't load
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div style={{ display: 'none' }}>
                <h1 className="text-xl font-bold text-white text-shadow-adaptive">
                  osu!Challengers
                </h1>
                <p className="text-xs text-white/70 text-shadow-adaptive-sm">Nexus</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-2">
              {navItems.map((item) => (
                <Link 
                  key={item.href}
                  href={item.href}
                  className={
                    router.pathname === item.href 
                      ? 'nav-pill-active text-shadow-adaptive-sm'
                      : 'nav-pill-inactive text-shadow-adaptive-sm'
                  }
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="w-4 h-4 icon-shadow-adaptive-sm" />
                    {item.label}
                  </div>
                </Link>
              ))}

              {/* Profile link - only show if user is logged in */}
              {user && (
                <Link 
                  href={`/profile/${user.id}`}
                  className={
                    router.pathname === `/profile/${user.id}` || router.pathname.startsWith('/profile/')
                      ? 'nav-pill-active text-shadow-adaptive-sm'
                      : 'nav-pill-inactive text-shadow-adaptive-sm'
                  }
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 icon-shadow-adaptive-sm" />
                    profile
                  </div>
                </Link>
              )}

              {/* Admin link - show if user exists and is admin */}
              {user && isAdmin && (
                <Link 
                  href="/admin"
                  className={
                    router.pathname === '/admin'
                      ? 'nav-pill-active text-shadow-adaptive-sm'
                      : 'nav-pill-inactive text-shadow-adaptive-sm'
                  }
                >
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 icon-shadow-adaptive-sm" />
                    admin
                  </div>
                </Link>
              )}

              {/* Auth Section */}
              {loading ? (
                <div className="px-5 py-2.5 text-white/50 text-shadow-adaptive-sm">Loading...</div>
              ) : !user ? (
                <Link 
                  href="/api/auth/login"
                  className="btn-primary ml-4 text-shadow-adaptive-sm flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4 icon-shadow-adaptive-sm" />
                  log in with osu!
                </Link>
              ) : (
                <div className="flex items-center gap-4 ml-4">
                  <div className="flex items-center gap-2">
                    {user.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt={user.username}
                        className="w-8 h-8 rounded-full ring-2 ring-white/30"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center text-white">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white text-shadow-adaptive-sm leading-tight">
                        {user.username}
                      </span>
                      {isAdmin && (
                        <span className="text-xs text-primary-300 text-shadow-adaptive-sm leading-tight">
                          Admin
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-white/70 hover:text-white transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4 icon-shadow-adaptive-sm" />
                  </button>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">{children}</main>

      {/* Footer */}
      <footer className="mt-20 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="font-medium text-white text-shadow-adaptive">
            osu!Challengers Nexus - Track your progress across our community challenges!
          </p>
          <p className="mt-2 text-white/90 text-shadow-adaptive-sm">
            Not affiliated with osu! or ppy Pty Ltd
          </p>
        </div>
      </footer>
    </div>
  );
}