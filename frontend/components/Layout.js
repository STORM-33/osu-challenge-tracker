import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { auth } from '../lib/supabase';
import { Trophy, User, LogIn, LogOut, BarChart3, Plus, Heart, Link as LinkIcon} from 'lucide-react';

export default function Layout({ children, backgroundImage = 'https://cdn.discordapp.com/attachments/1337805789175222362/1390848472772640820/image.png?ex=686a68d4&is=68691754&hm=2d8694a6e2ce59d179cbba2798d41070f48b64db06fc7b633fa5fb248cd1826a&' }) {

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

  return (
    <div className="min-h-screen bg-map-placeholder relative">
      {/* Background image layer */}
      {backgroundImage && (
        <div 
          className="fixed inset-0 -z-20 bg-cover bg-center transition-opacity duration-1000"
          style={{ 
            backgroundImage: `url(${backgroundImage})`,
            filter: 'blur(8px) brightness(0.7)'
          }}
        />
      )}
      
      {/* Header */}
      <header className="glass-card border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link 
              href="/"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div>
                <h1 className="text-xl font-bold text-neutral-800">
                  osu!Challengers
                </h1>
                <p className="text-xs text-neutral-600">Nexus</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-2">
              <Link 
                href="/"
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all font-medium ${
                  router.pathname === '/' 
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <Trophy className="w-4 h-4" />
                challenges
              </Link>

              {/* Season Leaderboard Link */}
              <Link 
                href="/leaderboard"
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all font-medium ${
                  router.pathname === '/leaderboard'
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                leaderboard
              </Link>

              {/* Partners Link */}
              <Link 
                href="/partners"
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all font-medium ${
                  router.pathname === '/partners'
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <LinkIcon className="w-4 h-4" />
                partners
              </Link>

              {/* Profile link - only show if user is logged in */}
              {user && (
                <Link 
                  href={`/profile/${user.id}`}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all font-medium ${
                    router.pathname === `/profile/${user.id}` || router.pathname.startsWith('/profile/')
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <User className="w-4 h-4" />
                  profile
                </Link>
              )}

              {/* Admin link - show if user exists and is admin */}
              {user && isAdmin && (
                <Link 
                  href="/admin"
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all font-medium ${
                    router.pathname === '/admin'
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  admin
                </Link>
              )}

              {/* Auth Section */}
              {loading ? (
                <div className="px-5 py-2.5 text-neutral-500">Loading...</div>
              ) : !user ? (
                <Link 
                  href="/api/auth/login"
                  className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-5 py-2.5 rounded-full transition-all font-medium ml-4"
                >
                  <LogIn className="w-4 h-4" />
                  log in with osu!
                </Link>
              ) : (
                <div className="flex items-center gap-4 ml-4">
                  <div className="flex items-center gap-2">
                    {user.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt={user.username}
                        className="w-8 h-8 rounded-full ring-2 ring-white"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-neutral-700 leading-tight">
                        {user.username}
                      </span>
                      {isAdmin && (
                        <span className="text-xs text-primary-600 leading-tight">
                          Admin
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-neutral-500 hover:text-neutral-700 transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
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
      <footer className="mt-20 border-t border-neutral-200 bg-white/60 backdrop-blur-sm py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-neutral-600 text-sm">
          <p className="font-medium">osu!Challengers Nexus - Track your progress across our community challenges!</p>
          <p className="mt-2 text-neutral-500">Not affiliated with osu! or ppy Pty Ltd</p>
        </div>
      </footer>
    </div>
  );
}