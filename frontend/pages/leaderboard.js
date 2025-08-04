import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import SeasonLeaderboard from '../components/SeasonLeaderboard';
import SeasonSelector from '../components/SeasonSelector';
import { Trophy, Info, BookOpen, TrendingUp, Zap, Target, BarChart3 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export default function SeasonLeaderboardPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const response = await fetch('/api/seasons');
        const data = await response.json();
        
        if (data.success) {
          const seasonsData = data.data?.seasons || data.seasons || [];
          setSeasons(seasonsData);
          
          // Set current season as default
          const currentSeason = seasonsData.find(season => season.is_current);
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

  if (authLoading || loading) {
    return (
      <Layout>
        <Loading.FullPage message="Loading season data..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen py-4 sm:py-6 lg:py-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          {/* Header Section - Mobile First */}
          <div className="mb-8 sm:mb-10 lg:mb-12">
            <div className="mb-6 sm:mb-8">
              <div className="text-center sm:text-left">
                {/* Icon and Title - Stacked on mobile, inline on larger screens */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 mb-4">
                  <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 text-white icon-shadow-adaptive-lg" />
                  
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white text-shadow-adaptive-lg">
                    Season Leaderboard
                  </h1>
                </div>
                
                {/* Description - Mobile optimized */}
                <p className="text-white text-sm sm:text-base lg:text-lg max-w-none sm:max-w-2xl text-shadow-adaptive px-4 sm:px-0">
                  Rankings across all challenges in the season. Climb the ranks by participating in more challenges!
                </p>
              </div>
            </div>

            {/* Season Selector - Mobile First */}
            {seasons.length > 0 && (
              <div className="mb-6 sm:mb-8">
                <SeasonSelector
                  seasons={seasons}
                  selectedSeason={selectedSeason}
                  onSeasonChange={setSelectedSeason}
                />
              </div>
            )}
          </div>

          {/* Stats Cards - Mobile Compact */}
          {selectedSeason && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-10 lg:mb-12">
              {/* Current Season Card */}
              <div className="glass-1 rounded-lg sm:rounded-2xl p-3 sm:p-6">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <div className="p-1.5 sm:p-3 icon-gradient-orange rounded-md sm:rounded-xl icon-container-orange">
                    <Trophy className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-sm sm:text-lg font-semibold text-white mb-1 sm:mb-2 text-shadow-adaptive-sm">
                  Current Season
                </h3>
                <p className="text-lg sm:text-2xl lg:text-3xl font-black text-transparent bg-clip-text" style={{backgroundImage: 'linear-gradient(to right, #f3eba4, #f3eba4)'}}>
                  {selectedSeason.name}
                </p>
                <p className="text-xs sm:text-sm text-white/85 mt-1 sm:mt-2 text-shadow-adaptive-sm">
                  {new Date(selectedSeason.start_date).toLocaleDateString()} - {new Date(selectedSeason.end_date).toLocaleDateString()}
                </p>
              </div>

              {/* How It Works Card */}
              <div className="glass-1 rounded-lg sm:rounded-2xl p-3 sm:p-6">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <div className="p-1.5 sm:p-3 icon-gradient-blue rounded-md sm:rounded-xl icon-container-blue">
                    <BookOpen className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-sm sm:text-lg font-semibold text-white mb-1 sm:mb-2 text-shadow-adaptive-sm">
                  How It Works
                </h3>
                <p className="text-xs sm:text-sm text-white/85 leading-relaxed text-shadow-adaptive-sm">
                  Your total score across all maps in all challenges during this season determines your ranking.
                </p>
              </div>

              {/* Scoring System Card */}
              <div className="glass-1 rounded-lg sm:rounded-2xl p-3 sm:p-6 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <div className="p-1.5 sm:p-3 icon-gradient-green rounded-md sm:rounded-xl icon-container-green">
                    <Target className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-sm sm:text-lg font-semibold text-white mb-1 sm:mb-2 text-shadow-adaptive-sm">
                  Scoring System
                </h3>
                <p className="text-xs sm:text-sm text-white/85 leading-relaxed text-shadow-adaptive-sm">
                  -- to be defined -- temporarily a sum of scores --
                </p>
              </div>
            </div>
          )}


          {/* Leaderboard Component */}
          <SeasonLeaderboard 
            currentUser={currentUser}
            selectedSeason={selectedSeason}
          />

          {/* Additional Info */}
          <div className="mt-8 sm:mt-10 lg:mt-12 glass-1 rounded-xl sm:rounded-2xl p-3 sm:p-6 lg:p-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-6">
              <div className="p-1.5 sm:p-3 icon-gradient-orange rounded-lg sm:rounded-xl icon-container-orange">
                <Info className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <h3 className="text-base sm:text-xl lg:text-2xl font-bold text-white text-shadow-adaptive">
                About Season Rankings
              </h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 lg:gap-8">
              {/* Scoring System Info */}
              <div className="glass-1 rounded-lg sm:rounded-xl p-3 sm:p-6 shadow-lg">
                <h4 className="font-bold text-white mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 text-shadow-adaptive text-sm sm:text-base">
                  <Zap className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white icon-shadow-adaptive-sm" />
                  Scoring System
                </h4>
                <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-white/90">
                  <li className="flex items-start gap-1.5 sm:gap-2">
                    <span className="text-white text-shadow-adaptive-sm mt-0.5">•</span>
                    <span className="text-shadow-adaptive-sm">Total score from all maps played</span>
                  </li>
                  <li className="flex items-start gap-1.5 sm:gap-2">
                    <span className="text-white text-shadow-adaptive-sm mt-0.5">•</span>
                    <span className="text-shadow-adaptive-sm">Participate in more challenges to climb</span>
                  </li>
                  <li className="flex items-start gap-1.5 sm:gap-2">
                    <span className="text-white text-shadow-adaptive-sm mt-0.5">•</span>
                    <span className="text-shadow-adaptive-sm">Every map completion counts</span>
                  </li>
                </ul>
              </div>
              
              {/* Rankings Update Info */}
              <div className="glass-1 rounded-lg sm:rounded-xl p-3 sm:p-6 shadow-lg">
                <h4 className="font-bold text-white mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 text-shadow-adaptive text-sm sm:text-base">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white icon-shadow-adaptive-sm" />
                  Rankings Update
                </h4>
                <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-white/90">
                  <li className="flex items-start gap-1.5 sm:gap-2">
                    <span className="text-white text-shadow-adaptive-sm mt-0.5">•</span>
                    <span className="text-shadow-adaptive-sm">Real-time as scores are submitted</span>
                  </li>
                  <li className="flex items-start gap-1.5 sm:gap-2">
                    <span className="text-white text-shadow-adaptive-sm mt-0.5">•</span>
                    <span className="text-shadow-adaptive-sm">New challenges add to your total</span>
                  </li>
                  <li className="flex items-start gap-1.5 sm:gap-2">
                    <span className="text-white text-shadow-adaptive-sm mt-0.5">•</span>
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