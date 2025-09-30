import { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import ChallengeCard from '../components/ChallengeCard';
import SeasonSelector from '../components/SeasonSelector';
import { 
  Trophy, History, Sparkles, RefreshCw, 
  Users, Music, Clock, AlertCircle
} from 'lucide-react';

const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('API request failed');
  }
  const data = await res.json();
  return data.data || data;
};

export default function ChallengesPage() {
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [historicalChallenges, setHistoricalChallenges] = useState([]);
  const [loadingHistorical, setLoadingHistorical] = useState(false);

  // Fetch active challenges with simple SWR
  const {
    data: activeChallengesData,
    error,
    mutate: refreshActiveChallenges,
    isValidating
  } = useSWR('/api/challenges?active=true', fetcher, {
    refreshInterval: 300000, // Auto-refresh every 5 minutes
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 60000,
  });

  const activeChallenges = activeChallengesData?.challenges || [];
  const summary = activeChallengesData?.summary;
  const loading = !activeChallengesData && !error;

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedSeason?.id) {
      fetchHistoricalChallenges(selectedSeason.id);
    }
  }, [selectedSeason]);

  const fetchInitialData = async () => {
    try {
      const seasonResponse = await fetch('/api/seasons/current');
      if (seasonResponse.ok) {
        const seasonData = await seasonResponse.json();
        if (seasonData.success) {
          const responseData = seasonData.data || seasonData;
          if (responseData.season) {
            setCurrentSeason(responseData.season);
            setSelectedSeason(responseData.season);
          }
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const fetchHistoricalChallenges = async (seasonId) => {
    try {
      setLoadingHistorical(true);
      const response = await fetch(`/api/challenges?season_id=${seasonId}&active=false`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch historical challenges: ${response.status}`);
      }
      
      const data = await response.json();
      
      let challenges = [];
      if (data.success && data.data?.challenges) {
        challenges = data.data.challenges;
      } else if (data.challenges) {
        challenges = data.challenges;
      } else if (data.data && Array.isArray(data.data)) {
        challenges = data.data;
      }
      
      setHistoricalChallenges(challenges);
    } catch (err) {
      console.error('Historical challenges fetch error:', err);
      setHistoricalChallenges([]);
    } finally {
      setLoadingHistorical(false);
    }
  };

  const getChallengeType = (challenge) => {
    const mapCount = challenge.playlists?.length || 0;
    return mapCount === 1 ? 'weekly' : 'monthly';
  };

  const getFilteredChallenges = (challenges) => {
    return challenges.sort((a, b) => {
      const dateA = new Date(a.end_date || a.start_date || a.created_at || 0);
      const dateB = new Date(b.end_date || b.start_date || b.created_at || 0);
      return dateB.getTime() - dateA.getTime();
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const filteredChallenges = getFilteredChallenges(historicalChallenges);

  if (loading) {
    return (
      <Layout>
        <Loading.FullPage message="Loading challenges..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen py-4 sm:py-6 lg:py-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          
          {/* Active Challenges Section */}
          <div className="mb-8 sm:mb-12 lg:mb-16">
            <div className="mb-6 sm:mb-8 lg:mb-10">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-8">
                <div className="text-center lg:text-left">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 mb-4">
                    <div className="relative">
                      <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-white icon-shadow-adaptive-lg" />
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 absolute -top-1 -right-1 icon-shadow-adaptive-sm" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white text-shadow-adaptive-lg">
                      Active Challenges
                    </h1>
                  </div>
                  <p className="text-white/85 text-sm sm:text-base lg:text-lg max-w-none lg:max-w-2xl text-shadow-adaptive px-4 sm:px-0">
                    Jump into any of our currently active challenges and compete with players worldwide for the top spots!
                  </p>
                </div>
              </div>
            </div>

            {/* Data Freshness Info */}
            {summary && (
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Clock className="w-4 h-4 icon-shadow-adaptive-sm" />
                  <span className="text-shadow-adaptive-sm">
                    {summary.fresh || 0} fresh, {summary.stale || 0} updating
                  </span>
                </div>
                <button
                  onClick={refreshActiveChallenges}
                  disabled={isValidating}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/70 hover:text-white transition-colors glass-1 rounded-full disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 icon-shadow-adaptive-sm ${isValidating ? 'animate-spin' : ''}`} />
                  {isValidating ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            )}

            {/* Challenges Display */}
            <div className="relative">
              {error ? (
                <div className="glass-1 rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center shadow-xl">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-400 icon-shadow-adaptive" />
                  </div>
                  <p className="text-red-300 mb-6 font-medium text-shadow-adaptive text-sm sm:text-base">
                    Failed to load challenges: {error.message}
                  </p>
                  <button 
                    onClick={refreshActiveChallenges}
                    disabled={isValidating}
                    className="px-4 py-2 sm:px-6 sm:py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all hover:shadow-lg transform hover:scale-105 text-sm sm:text-base"
                  >
                    {isValidating ? 'Retrying...' : 'Try Again'}
                  </button>
                </div>
              ) : activeChallenges.length === 0 ? (
                <div className="glass-1 rounded-2xl sm:rounded-3xl p-8 sm:p-16 text-center shadow-xl">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-white/70 icon-shadow-adaptive" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white/90 mb-3 text-shadow-adaptive">
                    No Active Challenges
                  </h3>
                  <p className="text-white/70 mb-2 text-shadow-adaptive-sm text-sm sm:text-base">
                    Check back soon for new challenges!
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:gap-6 lg:gap-8">
                  {activeChallenges.map(challenge => (
                    <Link key={challenge.id} href={`/challenges/${challenge.room_id}`}>
                      <div className="transform transition-all duration-300">
                        <ChallengeCard 
                          challenge={challenge} 
                          size="large"
                          challengeType={getChallengeType(challenge)}
                          showBackground={true}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* History Section */}
          <div className="mt-12 sm:mt-16 lg:mt-20">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 sm:mb-8 gap-4">
              <div className="flex items-center gap-3 justify-center lg:justify-start">
                <History className="w-6 h-6 sm:w-8 sm:h-8 text-white icon-shadow-adaptive" />
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white text-shadow-adaptive">
                  Challenge History
                </h2>
              </div>
              <SeasonSelector 
                onSeasonChange={setSelectedSeason}
                currentSeasonId={selectedSeason?.id}
              />
            </div>

            {selectedSeason && (
              <div className="mb-6 sm:mb-8">
                <div className="glass-1 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg sm:text-2xl font-bold text-white mb-2 text-shadow-adaptive">
                        {selectedSeason.name}
                      </h3>
                      <p className="text-white/80 text-shadow-adaptive-sm text-sm sm:text-base">
                        {formatDate(selectedSeason.start_date)} - {formatDate(selectedSeason.end_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {selectedSeason.is_current && (
                        <span className="px-3 py-1 sm:px-4 sm:py-2 badge-icon-green text-xs sm:text-sm font-semibold rounded-full">
                          Current Season
                        </span>
                      )}
                      <span className="px-3 py-1 sm:px-4 sm:py-2 badge-icon-orange text-xs sm:text-sm font-medium rounded-full">
                        {filteredChallenges.length} challenges
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Historical Challenges Table */}
            <div className="relative">
              {loadingHistorical && (
                <div className="absolute inset-0 glass-2 z-10 flex items-center justify-center rounded-2xl">
                  <Loading.Section message="Loading history..." />
                </div>
              )}

              {filteredChallenges.length > 0 ? (
                <div className="glass-1 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl">
                  <div className="p-2">
                    <div className="streak-card-current rounded-xl sm:rounded-2xl overflow-hidden">
                      <div className="grid grid-cols-[3fr_1fr] sm:grid-cols-[3fr_1fr_1fr] lg:grid-cols-[4fr_1fr_1fr_1fr_1fr] gap-0 items-center">
                        <div className="px-3 py-3 sm:px-4 sm:py-3 lg:px-6 lg:py-4 text-left text-xs font-bold text-white/90 uppercase tracking-wider text-shadow-adaptive-sm">
                          Challenge
                        </div>
                        <div className="px-3 py-3 sm:px-4 sm:py-3 lg:px-6 lg:py-4 text-center text-xs font-bold text-white/90 uppercase tracking-wider text-shadow-adaptive-sm">
                          Type
                        </div>
                        <div className="hidden sm:block px-3 py-3 sm:px-4 sm:py-3 lg:px-6 lg:py-4 ml-3 text-left text-xs font-bold text-white/90 uppercase tracking-wider text-shadow-adaptive-sm">
                          Maps
                        </div>
                        <div className="hidden lg:block px-3 py-3 sm:px-4 sm:py-3 lg:px-6 lg:py-4 text-left text-xs font-bold text-white/90 uppercase tracking-wider text-shadow-adaptive-sm">
                          Participants
                        </div>
                        <div className="hidden lg:block px-3 py-3 sm:px-4 sm:py-3 lg:px-6 lg:py-4 text-left text-xs font-bold text-white/90 uppercase tracking-wider text-shadow-adaptive-sm">
                          Ended
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-white/10"></div>
                  
                  <div className="divide-y divide-white/10">
                    {filteredChallenges.map((challenge) => {
                      const challengeType = getChallengeType(challenge);
                      const displayName = challenge.custom_name || challenge.name;
                      
                      return (
                        <div key={challenge.id} className="grid grid-cols-[3fr_1fr] sm:grid-cols-[3fr_1fr_1fr] lg:grid-cols-[4fr_1fr_1fr_1fr_1fr] gap-0 hover:bg-white/5 transition-all group items-center">
                          <div className="px-3 py-3 sm:px-4 sm:py-3 lg:px-6 lg:py-4 text-left">
                            <Link href={`/challenges/${challenge.room_id}`}>
                              <div className="cursor-pointer">
                                <div className="font-semibold text-white group-hover:text-purple-300 transition-colors text-shadow-adaptive text-sm sm:text-base">
                                  {displayName || `Challenge #${challenge.id}`}
                                </div>
                                <div className="sm:hidden mt-2 flex flex-wrap gap-2 text-xs">
                                  <span className="inline-flex items-center gap-1 text-white/60">
                                    <Music className="w-3 h-3 text-purple-400" />
                                    {challenge.playlists?.length || 0} maps
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-white/60">
                                    <Users className="w-3 h-3 text-blue-400" />
                                    {challenge.participant_count || 0}
                                  </span>
                                </div>
                              </div>
                            </Link>
                          </div>
                          <div className="px-3 py-3 sm:px-4 sm:py-3 lg:px-6 lg:py-4 flex justify-center items-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`inline-flex items-center text-s ${
                                challengeType === 'weekly' 
                                  ? 'challenge-badge-weekly' 
                                  : challengeType === 'monthly'
                                  ? 'challenge-badge-monthly'
                                  : 'challenge-badge-custom'
                              }`}>
                                {challengeType}
                              </span>
                              <div className="sm:hidden flex items-center gap-1 text-xs text-white/60">
                                <Clock className="w-3 h-3 text-gray-400" />
                                {challenge.end_date ? formatDate(challenge.end_date) : 'N/A'}
                              </div>
                            </div>
                          </div>
                          <div className="hidden sm:block px-3 py-3 sm:px-4 sm:py-3 lg:px-6 lg:py-4 ml-3 text-xl text-white/90 text-shadow-adaptive-sm">
                            <div className="flex items-center gap-2">
                              <Music className="w-4 h-4 sm:w-5 sm:h-5 text-white icon-shadow-adaptive-sm flex-shrink-0" />
                              <span className="font-medium">{challenge.playlists?.length || 0}</span>
                            </div>
                          </div>
                          <div className="hidden lg:block px-3 py-3 sm:px-4 sm:py-3 lg:px-6 lg:py-4 text-xl text-white/90 text-shadow-adaptive-sm">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white icon-shadow-adaptive-sm flex-shrink-0" />
                              <span className="font-medium">{challenge.participant_count || 0}</span>
                            </div>
                          </div>
                          <div className="hidden lg:block px-3 py-3 sm:px-4 sm:py-3 lg:px-6 lg:py-4 text-sm text-white/90 text-shadow-adaptive-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-white/90 icon-shadow-adaptive-sm flex-shrink-0" />
                              <span>{challenge.end_date ? formatDate(challenge.end_date) : 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : !loadingHistorical && (
                <div className="glass-1 rounded-2xl sm:rounded-3xl p-8 sm:p-16 text-center shadow-xl">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <History className="w-8 h-8 sm:w-10 sm:h-10 text-white/70 icon-shadow-adaptive" />
                  </div>
                  <h3 className="text-lg sm:text-2xl font-bold text-white/90 mb-3 text-shadow-adaptive">
                    No Historical Challenges
                  </h3>
                  <p className="text-white/70 mb-2 text-shadow-adaptive-sm text-sm sm:text-base">
                    {selectedSeason?.is_current 
                      ? 'Completed challenges will appear here as they finish'
                      : 'This season had no completed challenges'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 sm:mt-16 lg:mt-20 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-3 sm:px-6 sm:py-3 glass-1 rounded-xl sm:rounded-2xl shadow-lg">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <p className="text-xs sm:text-sm text-white/80 font-medium text-shadow-adaptive-sm">
                Data updates automatically every 5 minutes
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
