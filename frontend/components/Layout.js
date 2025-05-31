import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Trophy, User, LogIn, LogOut, Home, Activity, Plus } from 'lucide-react';
import { auth } from '../lib/supabase';

export default function Layout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const userData = await auth.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-md border-b border-purple-500/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/">
              <a className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Trophy className="w-8 h-8 text-purple-400" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  osu! Challenge Tracker
                </h1>
              </a>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-6">
              <Link href="/">
                <a className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  router.pathname === '/' 
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                    : 'text-gray-400 hover:text-white'
                }`}>
                  <Home className="w-4 h-4" />
                  Challenges
                </a>
              </Link>

              <Link href="/admin">
                <a className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  router.pathname === '/admin'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                    : 'text-gray-400 hover:text-white'
                }`}>
                  <Plus className="w-4 h-4" />
                  Add
                </a>
              </Link>

              {user && (
                <Link href="/profile">
                  <a className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    router.pathname === '/profile'
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                      : 'text-gray-400 hover:text-white'
                  }`}>
                    <Activity className="w-4 h-4" />
                    My Scores
                  </a>
                </Link>
              )}

              {/* Auth Section */}
              {!loading && (
                <>
                  {!user ? (
                    <Link href="/api/auth/login">
                      <a className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors">
                        <LogIn className="w-4 h-4" />
                        Login with osu!
                      </a>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {user.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt={user.username}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                        <span className="text-sm font-medium">{user.username}</span>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="mt-20 border-t border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>osu! Challenge Tracker - Track your progress across community challenges</p>
          <p className="mt-2">Not affiliated with osu! or ppy Pty Ltd</p>
        </div>
      </footer>
    </div>
  );
}