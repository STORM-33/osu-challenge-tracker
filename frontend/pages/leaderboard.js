import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import SeasonLeaderboard from '../components/SeasonLeaderboard';
import SeasonSelector from '../components/SeasonSelector';
import { Trophy, Info, BookOpen, TrendingUp, Zap, Target, BarChart3 } from 'lucide-react';

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
          {/* Header Section */}
          <div className="mb-12">
            <div className="flex items-start justify-between mb-8">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <BarChart3 className="w-10 h-10 text-white icon-shadow-adaptive-lg" />
                  
                  {/* Header */}
                  <h1 className="text-4xl font-bold text-white text-shadow-adaptive-lg">
                    Season Leaderboard
                  </h1>
                </div>
                
                {/* Description */}
                <p className="text-white text-lg max-w-2xl text-shadow-adaptive">
                  Rankings across all challenges in the season. Climb the ranks by participating in more challenges!
                </p>
              </div>
              
              {!currentUser && (
                <div className="glass-3 rounded-2xl p-6">
                  <p className="text-sm text-white/80 mb-3 font-medium">
                    Want to see your position?
                  </p>
                  <button
                    onClick={() => router.push('/api/auth/login')}
                    className="btn-primary"
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
              <div className="glass-1 rounded-2xl p-6 hover:shadow-xl transform hover:scale-105 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-xl icon-container-orange">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 text-shadow-adaptive-sm">
                  Current Season
                </h3>
                <p className="text-3xl font-black text-transparent bg-clip-text" style={{backgroundImage: 'linear-gradient(to right, #f3eba4, #f3eba4)'}}>
                  {selectedSeason.name}
                </p>
                <p className="text-sm text-white/85 mt-2 text-shadow-adaptive-sm">
                  {new Date(selectedSeason.start_date).toLocaleDateString()} - {new Date(selectedSeason.end_date).toLocaleDateString()}
                </p>
              </div>

              <div className="glass-1 rounded-2xl p-6 hover:shadow-xl transform hover:scale-105 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-xl icon-container-blue">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 text-shadow-adaptive-sm">
                  How It Works
                </h3>
                <p className="text-sm text-white/85 leading-relaxed text-shadow-adaptive-sm">
                  Your total score across all maps in all challenges during this season determines your ranking.
                </p>
              </div>

              <div className="glass-1 rounded-2xl p-6 hover:shadow-xl transform hover:scale-105 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-b from-emerald-400 to-green-600 rounded-xl icon-container-green">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 text-shadow-adaptive-sm">
                  Scoring System
                </h3>
                <p className="text-sm text-white/85 leading-relaxed text-shadow-adaptive-sm">
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
          <div className="mt-12 glass-1 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-xl icon-container-orange">
                <Info className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white text-shadow-adaptive">
                About Season Rankings
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass-2 rounded-xl p-6 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all">
                <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-shadow-adaptive">
                  <Zap className="w-5 h-5 text-white icon-shadow-adaptive-sm" />
                  Scoring System
                </h4>
                <ul className="space-y-2 text-sm text-white/90">
                  <li className="flex items-center gap-2">
                    <span className="text-white text-shadow-adaptive-sm">•</span>
                    <span className="text-shadow-adaptive-sm">Total score from all maps played</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-white text-shadow-adaptive-sm">•</span>
                    <span className="text-shadow-adaptive-sm">Participate in more challenges to climb</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-white text-shadow-adaptive-sm">•</span>
                    <span className="text-shadow-adaptive-sm">Every map completion counts</span>
                  </li>
                </ul>
              </div>
              
              <div className="glass-2 rounded-xl p-6 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all">
                <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-shadow-adaptive">
                  <TrendingUp className="w-5 h-5 text-white icon-shadow-adaptive-sm" />
                  Rankings Update
                </h4>
                <ul className="space-y-2 text-sm text-white/90">
                  <li className="flex items-center gap-2">
                    <span className="text-white text-shadow-adaptive-sm">•</span>
                    <span className="text-shadow-adaptive-sm">Real-time as scores are submitted</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-white text-shadow-adaptive-sm">•</span>
                    <span className="text-shadow-adaptive-sm">New challenges add to your total</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-white text-shadow-adaptive-sm">•</span>
                    <span className="text-shadow-adaptive-sm">Higher scores on replayed maps count</span>
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