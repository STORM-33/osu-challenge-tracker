import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/AuthContext';
import { useSettings } from '../lib/SettingsContext';
import { Trophy, User, LogIn, LogOut, BarChart3, Plus, Heart, Link2, X, Menu, Home, Settings, ChevronDown } from 'lucide-react';

export default function Layout({ children, backgroundImage = '/default-bg.png' }) {
  const { user, loading, isAdmin, signOut } = useAuth(); 
  const { settings, getBackgroundStyle, loading: settingsLoading } = useSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [router.pathname]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      console.log('🚪 Starting logout...');
      await signOut();
      
      console.log('✅ Logout completed');
      setProfileDropdownOpen(false);
      
      if (router.pathname !== '/') {
        router.push('/');
      }
      
    } catch (error) {
      console.error('🚨 Logout error:', error);
      setProfileDropdownOpen(false);
      // Still redirect on error
      if (router.pathname !== '/') {
        router.push('/');
      }
    }
  };

  // Navigation items configuration
  const navItems = [
    { href: '/', label: 'home', icon: Home },
    { href: '/challenges', label: 'challenges', icon: Trophy },
    { href: '/leaderboard', label: 'leaderboard', icon: BarChart3 },
    { href: '/donate', label: 'donate', icon: Heart },
    { href: '/partners', label: 'partners', icon: Link2 },
  ];

  return (
    <div className="min-h-screen relative">
      {/* Background image layer - now using settings */}
      {settings.background_enabled ? (
        settings.donor_background_id ? (
          // Donor background
          <div 
            className="fixed inset-0 -z-20 bg-cover bg-center"
            style={getBackgroundStyle()}
          />
        ) : (
          // Color/gradient background
          <div 
            className="fixed inset-0 -z-20"
            style={getBackgroundStyle()}
          />
        )
      ) : (
        // Disabled background - use solid dark color
        <div 
          className="fixed inset-0 -z-20"
          style={{ backgroundColor: '#0a0a0a' }}
        />
      )}
      
      {/* Header with only grid pattern that fades */}
      <header className="relative z-40 overflow-visible">
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
              
              {/* Regular grid pattern - every line */}
              <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="translate(12, 12)">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" filter="url(#gridGlow)"/>
              </pattern>
              
              {/* Thicker grid pattern - every 5th line with offset */}
              <pattern id="thickGrid" width="120" height="120" patternUnits="userSpaceOnUse" patternTransform="translate(12, 12)">
                <path d="M 120 0 L 0 0 0 120" fill="none" stroke="white" strokeWidth="1.5" opacity="0.4" filter="url(#gridGlow)"/>
              </pattern>
            </defs>
            {/* Layer the regular grid first, then the thick grid on top */}
            <rect width="100%" height="100%" fill="url(#grid)" mask="url(#fadeMask)" />
            <rect width="100%" height="100%" fill="url(#thickGrid)" mask="url(#fadeMask)" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-4 relative">
          <div className="flex items-center justify-between">
            <Link 
              href="/"
              prefetch={false}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              {/* Replace with your PNG logo */}
              <img 
                src="/logo.png" 
                alt="osu!Challengers Nexus"
                className="h-12 md:h-16"
                onError={(e) => {
                  // Fallback to text if logo doesn't load
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div style={{ display: 'none' }}>
                <h1 className="text-lg md:text-xl font-bold text-white text-shadow-adaptive">
                  osu!Challengers
                </h1>
                <p className="text-xs text-white/70 text-shadow-adaptive-sm">Nexus</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2 relative">
              {navItems.map((item) => (
                <Link 
                  key={item.href}
                  href={item.href}
                  prefetch={false}
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

              {/* Auth Section */}
              {loading ? (
                <div className="px-5 py-2.5 text-white/50 text-shadow-adaptive-sm">Loading...</div>
              ) : !user ? (
                <Link 
                  href="/api/auth/login"
                  prefetch={false}
                  className="btn-primary ml-4 text-shadow-adaptive-sm flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4 icon-shadow-adaptive-sm" />
                  log in with osu!
                </Link>
              ) : (
                <div className="relative ml-4" ref={dropdownRef}>
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md bg-white/15 hover:bg-white/20 transition-all duration-300 border-2 border-white/20 hover:border-white/30"
                  >
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
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium text-white text-shadow-adaptive-sm leading-tight">
                        {user.username}
                      </span>
                      {isAdmin && (
                        <span className="text-xs text-primary-300 text-shadow-adaptive-sm leading-tight">
                          Admin
                        </span>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-white/70 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Profile Dropdown */}
                  {profileDropdownOpen && (
                    <div className="absolute top-full right-0 w-56 mt-2 season-dropdown rounded-2xl shadow-lg z-[100] backdrop-blur-lg">
                      <Link
                        href={`/profile/${user.id}`}
                        prefetch={false}
                        className="w-full px-5 py-3 text-left hover:bg-white/10 transition-colors border-b border-white/10 first:rounded-t-2xl flex items-center gap-3 text-white/90 hover:text-white"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <User className="w-4 h-4" />
                        <span className="font-medium text-sm text-shadow-adaptive-lg">View Profile</span>
                      </Link>
                      
                      {/* Settings Link */}
                      <Link
                        href="/settings"
                        prefetch={false}
                        className="w-full px-5 py-3 text-left hover:bg-white/10 transition-colors border-b border-white/10 flex items-center gap-3 text-white/90 hover:text-white"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <Settings className="w-4 h-4" />
                        <span className="font-medium text-sm text-shadow-adaptive-lg">Settings</span>
                      </Link>
                      
                      {isAdmin && (
                        <Link
                          href="/admin"
                          prefetch={false}
                          className="w-full px-5 py-3 text-left hover:bg-white/10 transition-colors border-b border-white/10 flex items-center gap-3 text-white/90 hover:text-white"
                          onClick={() => setProfileDropdownOpen(false)}
                        >
                          <Plus className="w-4 h-4" />
                          <span className="font-medium text-sm text-shadow-adaptive-lg">Admin</span>
                        </Link>
                      )}

                      <button
                        onClick={handleLogout}
                        className="w-full px-5 py-3 text-left hover:bg-white/10 transition-colors last:rounded-b-2xl flex items-center gap-3 text-white/90 hover:text-white"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="font-medium text-sm text-shadow-adaptive-lg">Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </nav>

            {/* Mobile Navigation */}
            <div className="md:hidden flex items-center gap-2">
              {/* User Avatar on Mobile */}
              {user && (
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
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-white/70 hover:text-white transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6 icon-shadow-adaptive-sm" />
                ) : (
                  <Menu className="w-6 h-6 icon-shadow-adaptive-sm" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-72 h-full bg-black/90 backdrop-blur-md border-l border-white/10">
              {/* Mobile Menu Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <img 
                    src="/logo.png" 
                    alt="osu!Challengers Nexus"
                    className="h-8 icon-shadow-adaptive"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div style={{ display: 'none' }}>
                    <h2 className="text-lg font-bold text-white text-shadow-adaptive">
                      osu!Challengers
                    </h2>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Mobile Menu Content */}
              <div className="p-4 space-y-2">
                {/* Navigation Items */}
                {navItems.map((item) => (
                  <Link 
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-base
                      ${router.pathname === item.href 
                        ? 'bg-white/20 text-white border border-white/20' 
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }
                    `}
                  >
                    <item.icon className="w-5 h-5 icon-shadow-adaptive-sm" />
                    {item.label}
                  </Link>
                ))}

                {/* Divider */}
                <div className="border-t border-white/10 my-4"></div>

                {/* Auth Section */}
                {loading ? (
                  <div className="px-4 py-3 text-white/50 text-base">Loading...</div>
                ) : !user ? (
                  <Link 
                    href="/api/auth/login"
                    prefetch={false}
                    className="flex items-center gap-3 px-4 py-3 bg-gradient-primary rounded-lg text-white font-medium transition-all duration-200 hover:opacity-90"
                  >
                    <LogIn className="w-5 h-5" />
                    log in with osu!
                  </Link>
                ) : (
                  <div className="space-y-3">
                    {/* User Info */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-lg">
                      {user.avatar_url ? (
                        <img 
                          src={user.avatar_url} 
                          alt={user.username}
                          className="w-10 h-10 rounded-full ring-2 ring-white/30"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-white">
                          <User className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <div className="text-white font-medium text-shadow-adaptive-sm">
                          {user.username}
                        </div>
                        {isAdmin && (
                          <div className="text-xs text-primary-300 text-shadow-adaptive-sm">
                            Admin
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Profile Actions */}
                    <Link 
                      href={`/profile/${user.id}`}
                      prefetch={false}
                      className="flex items-center gap-3 px-4 py-3 w-full text-left text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200 rounded-lg"
                    >
                      <User className="w-5 h-5 icon-shadow-adaptive-sm" />
                      view profile
                    </Link>

                    {/* Settings Link for Mobile */}
                    <Link 
                      href="/settings"
                      prefetch={false}
                      className="flex items-center gap-3 px-4 py-3 w-full text-left text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200 rounded-lg"
                    >
                      <Settings className="w-5 h-5 icon-shadow-adaptive-sm" />
                      settings
                    </Link>

                    {/* Admin Link */}
                    {isAdmin && (
                      <Link 
                        href="/admin"
                        prefetch={false}
                        className="flex items-center gap-3 px-4 py-3 w-full text-left text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200 rounded-lg"
                      >
                        <Plus className="w-5 h-5 icon-shadow-adaptive-sm" />
                        admin
                      </Link>
                    )}

                    {/* Logout Button */}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-3 w-full text-left text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200 rounded-lg"
                    >
                      <LogOut className="w-5 h-5 icon-shadow-adaptive-sm" />
                      logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="relative z-10">{children}</main>

      {/* Footer */}
      <footer className="mt-20 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="font-medium text-white text-shadow-adaptive text-sm md:text-base">
            osu!Challengers Nexus - Track your progress across our community challenges!
          </p>
          <p className="mt-2 text-white/90 text-shadow-adaptive-sm text-xs md:text-sm">
            Not affiliated with osu! or ppy Pty Ltd
          </p>
        </div>
      </footer>
    </div>
  );
}