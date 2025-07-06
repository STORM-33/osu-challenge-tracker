import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import SeasonLeaderboard from '../components/SeasonLeaderboard';
import SeasonSelector from '../components/SeasonSelector';
import { Trophy, Sparkles, BookOpen, TrendingUp, Zap, Target, BarChart3 } from 'lucide-react';

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
        <Loading.FullPage message="Loading season data..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header Section - Using proper gradient text glow */}
          <div className="mb-12">
            <div className="flex items-start justify-between mb-8">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <BarChart3 className="w-10 h-10 text-primary-600 icon-adaptive-shadow" />
                    <Sparkles className="w-5 h-5 text-yellow-500 absolute -top-1 -right-1 icon-adaptive-shadow" />
                  </div>
                  
                  {/* Header */}
                  <h1 
                    className="text-4xl font-bold white text-neutral-800 text-white/90 text-adaptive-shadow"
                    data-text="Season Leaderboard"
                  >
                    Season Leaderboard
                  </h1>
                </div>
                
                {/* Description with glow */}
                <p className="text-neutral-600 text-lg max-w-2xl text-white/75 text-adaptive-shadow">
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
                    <BookOpen className="w-6 h-6 text-white" />
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
                    <Target className="w-6 h-6 text-white" />
                  </div>
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

          {/* Additional Info - Updated for transparency */}
          <div className="mt-12 glass-card-enhanced bg-gradient-to-r from-purple-100/50 to-pink-100/50 rounded-2xl p-8 backdrop-blur-lg border border-purple-200/60">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <h3 
                className="text-2xl font-bold text-gray-900 gradient-text-glow"
                data-text="About Season Rankings"
              >
                About Season Rankings
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass-card rounded-xl p-6 backdrop-blur-md border border-purple-100/60">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-500 icon-glow-sm" />
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
              
              <div className="glass-card rounded-xl p-6 backdrop-blur-md border border-blue-100/60">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500 icon-glow-sm" />
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