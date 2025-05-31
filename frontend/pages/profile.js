import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import UserStats from '../components/UserStats';
import { auth, challengeQueries } from '../lib/supabase';
import { Loader2, Trophy, TrendingUp, Target, Calendar } from 'lucide-react';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [scores, setScores] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Get current user
      const currentUser = await auth.getCurrentUser();
      if (!currentUser) {
        router.push('/');
        return;
      }
      
      setUser(currentUser);

      // Load user scores and stats
      const [userScores, userStats] = await Promise.all([
        challengeQueries.getUserScores(currentUser.id),
        challengeQueries.getUserStats(currentUser.id)
      ]);

      setScores(userScores);
      setStats(userStats);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">Please login to view your profile</p>
          <Link href="/api/auth/login">
            <a className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors inline-block">
              Login with osu!
            </a>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* User Profile Header */}
        <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4">
            {user.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt={user.username}
                className="w-20 h-20 rounded-full"
              />
            ) : (
              <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold">{user.username[0]}</span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold mb-1">{user.username}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                {user.country && <span>🌍 {user.country}</span>}
                {user.global_rank && <span>Global #{user.global_rank.toLocaleString()}</span>}
                {user.pp && <span>{user.pp.toFixed(0)}pp</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && <UserStats stats={stats} />}

        {/* Recent Scores */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Recent Challenge Scores</h2>
          
          {scores.length === 0 ? (
            <div className="text-center py-12 bg-black/30 rounded-xl border border-purple-500/30">
              <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No challenge scores yet</p>
              <Link href="/">
                <a className="text-purple-400 hover:text-purple-300 transition-colors">
                  Browse active challenges →
                </a>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {scores.map((score) => (
                <div 
                  key={score.id}
                  className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg p-4 hover:border-purple-400/50 transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-white">
                        {score.playlists?.beatmap_title || 'Unknown Beatmap'}
                      </h4>
                      <p className="text-sm text-gray-400">
                        {score.playlists?.challenges?.name || 'Unknown Challenge'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-purple-400">#{score.rank_position}</p>
                      <p className="text-xs text-gray-500">Rank</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Score</p>
                      <p className="font-mono font-semibold">{score.score.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Accuracy</p>
                      <p className={`font-semibold ${
                        score.accuracy >= 98 ? 'text-green-400' :
                        score.accuracy >= 95 ? 'text-yellow-400' :
                        'text-gray-400'
                      }`}>
                        {score.accuracy.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Combo</p>
                      <p className="font-semibold">{score.max_combo}x</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Date</p>
                      <p className="font-semibold">
                        {new Date(score.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  {score.playlists?.challenges?.room_id && (
                    <Link href={`/challenges/${score.playlists.challenges.room_id}`}>
                      <a className="text-purple-400 hover:text-purple-300 text-sm mt-2 inline-block transition-colors">
                        View challenge →
                      </a>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}