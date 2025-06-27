import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import SeasonLeaderboard from '../components/SeasonLeaderboard';
import SeasonSelector from '../components/SeasonSelector';
import { Trophy, Sparkles, TrendingUp, Zap, Target } from 'lucide-react';

export default function SeasonLeaderboardPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch user authentication status
  useEffect(() => {
    const fetchUserStatus = async () => {
      try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        
        if (data.authenticated) {
          setCurrentUser(data.user);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      }
    };

    fetchUserStatus();
  }, []);

  // Fetch seasons
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const response = await fetch('/api/seasons');
        const data = await response.json();
        
        if (data.success) {
          setSeasons(data.seasons);
          
          // Set current season as default
          const currentSeason = data.seasons.find(season => season.is_current);
          if (currentSeason) {
            setSelectedSeason(currentSeason);
          } else if (data.seasons.length > 0) {
            setSelectedSeason(data.seasons[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching seasons:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSeasons();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading season data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header Section */}
          <div className="mb-12">
            <div className="flex items-start justify-between mb-8">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <Trophy className="w-10 h-10 text-purple-600" />
                    <Sparkles className="w-5 h-5 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
                  </div>
                  <h1 className="text-5xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Season Leaderboard
                  </h1>
                </div>
                <p className="text-gray-600 text-lg max-w-2xl">
                  Rankings across all challenges in the season. Climb the ranks by participating in more challenges!
                </p>
              </div>
              
              {!currentUser && (
                <div className="text-right glass-card-enhanced rounded-2xl p-6">
                  <p className="text-sm text-gray-600 mb-3 font-medium">
                    Want to see your position?
                  </p>
                  <button
                    onClick={() => router.push('/api/auth/login')}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-bold hover:shadow-lg transform hover:scale-105 transition-all"
                  >
                    Login with osu!
                  </button>
                </div>
              )}
            </div>

            {/* Season Selector */}
            {seasons.length > 0 && (
              <div className="mb-8">
                <SeasonSelector
                  seasons={seasons}
                  selectedSeason={selectedSeason}
                  onSeasonChange={setSelectedSeason}
                />
              </div>
            )}
          </div>

          {/* Stats Cards */}
          {selectedSeason && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="glass-card-enhanced rounded-2xl p-6 hover:shadow-xl transform hover:scale-105 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Current Season
                </h3>
                <p className="text-3xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {selectedSeason.name}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  {new Date(selectedSeason.start_date).toLocaleDateString()} - {new Date(selectedSeason.end_date).toLocaleDateString()}
                </p>
              </div>

              <div className="glass-card-enhanced rounded-2xl p-6 hover:shadow-xl transform hover:scale-105 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex -space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-75"></div>
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse delay-150"></div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  How It Works
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Your total score across all maps in all challenges during this season determines your ranking.
                </p>
              </div>

              <div className="glass-card-enhanced rounded-2xl p-6 hover:shadow-xl transform hover:scale-105 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <Target className="w-5 h-5 text-green-500 animate-spin-slow" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Scoring System
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  -- to be defined -- temporarily a sum of scores --
                </p>
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <SeasonLeaderboard 
            currentUser={currentUser}
            selectedSeason={selectedSeason}
          />

          {/* Additional Info */}
          <div className="mt-12 glass-card-enhanced bg-gradient-to-r from-purple-100/70 to-pink-100/70 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                About Season Rankings
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass-card rounded-xl p-6">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-500" />
                  Scoring System
                </h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-1">•</span>
                    <span>Total score from all maps played</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-1">•</span>
                    <span>Participate in more challenges to climb</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-1">•</span>
                    <span>Every map completion counts</span>
                  </li>
                </ul>
              </div>
              
              <div className="glass-card rounded-xl p-6">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Rankings Update
                </h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>Real-time as scores are submitted</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>New challenges add to your total</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>Higher scores on replayed maps count</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}