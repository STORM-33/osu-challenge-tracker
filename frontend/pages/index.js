import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import ChallengeCard from '../components/ChallengeCard';
import SeasonSelector from '../components/SeasonSelector';
import { 
  Loader2, Trophy, History, Calendar, Sparkles, RefreshCw, 
  ChevronDown, ChevronRight, Users, MapPin, Clock, Info, 
  CheckCircle, AlertCircle, Zap, TrendingUp, Star, Activity,
  Target, Flame
} from 'lucide-react';
import { seasonUtils } from '../lib/seasons';
import { challengeQueries } from '../lib/supabase';

// Enhanced fetcher that handles sync metadata
const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('API request failed');
  }
  const data = await res.json();
  return data.data || data;
};

export default function Home() {
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [historicalChallenges, setHistoricalChallenges] = useState([]);
  const [loadingHistorical, setLoadingHistorical] = useState(false);
  const [expandedSeasons, setExpandedSeasons] = useState(new Set());
  const [quickStats, setQuickStats] = useState(null);

  // Enhanced API endpoint with auto-sync
  const activeChallengesEndpoint = useMemo(() => {
    const params = new URLSearchParams();
    params.append('active', 'true');
    params.append('auto_sync', 'false');
    return `/api/challenges?${params.toString()}`;
  }, []);

  // Use SWR for active challenges with background sync
  const {
    data: activeChallengesData,
    error,
    mutate: refreshActiveChallenges,
    isValidating
  } = useSWR(activeChallengesEndpoint, fetcher, {
    refreshInterval: 300000, // Refresh every 5 minutes
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 5000, // Dedupe requests within 5 seconds
    onSuccess: (data) => {
      if (data?.sync_summary) {
        console.log('Sync summary:', data.sync_summary);
      }
    }
  });

  const activeChallenges = activeChallengesData?.challenges || [];
  const syncSummary = activeChallengesData?.sync_summary;
  const loading = !activeChallengesData && !error;

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedSeason && selectedSeason.id) {
      fetchHistoricalChallenges(selectedSeason.id);
    }
  }, [selectedSeason]);

  // Calculate quick stats when active challenges change
  useEffect(() => {
    if (activeChallenges.length > 0) {
      const totalParticipants = activeChallenges.reduce((sum, c) => sum + (c.participant_count || 0), 0);
      const totalMaps = activeChallenges.reduce((sum, c) => sum + (c.playlists?.length || 0), 0);
      
      setQuickStats({
        totalParticipants,
        totalMaps,
      });
    }
  }, [activeChallenges]);

  const fetchInitialData = async () => {
    try {
      const seasonResponse = await fetch('/api/seasons/current');
      if (seasonResponse.ok) {
        const seasonData = await seasonResponse.json();
        if (seasonData.success && seasonData.season) {
          setCurrentSeason(seasonData.season);
          setSelectedSeason(seasonData.season);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const fetchQuickStats = async () => {
    try {
      // Calculate stats from available data instead of calling a potentially non-existent endpoint
      const totalParticipants = activeChallenges.reduce((sum, c) => sum + (c.participant_count || 0), 0);
      const totalMaps = activeChallenges.reduce((sum, c) => sum + (c.playlists?.length || 0), 0);
      
      setQuickStats({
        totalParticipants,
        totalMaps,
        // We can calculate more stats here if needed
      });
    } catch (err) {
      console.error('Stats calculation error:', err);
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
      if (data.success && data.data && data.data.challenges) {
        challenges = data.data.challenges;
      } else if (data.challenges) {
        challenges = data.challenges;
      } else if (data.data && Array.isArray(data.data)) {
        challenges = data.data;
      }
      
      setHistoricalChallenges(challenges);
      
      if (selectedSeason?.is_current) {
        setExpandedSeasons(new Set([selectedSeason.name]));
      }
    } catch (err) {
      console.error('Historical challenges fetch error:', err);
      setHistoricalChallenges([]);
    } finally {
      setLoadingHistorical(false);
    }
  };

  const handleSeasonChange = (season) => {
    setSelectedSeason(season);
  };

  const getChallengeType = (challenge) => {
    const mapCount = challenge.playlists?.length || 0;
    return mapCount === 1 ? 'weekly' : 'monthly';
  };

  const getFilteredChallenges = (challenges) => {
    return challenges
      .sort((a, b) => {
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

  // State for tracking when to show completion banner
  const [completionBannerVisible, setCompletionBannerVisible] = useState(false);
  const [lastBackgroundSyncs, setLastBackgroundSyncs] = useState(0);

  // Track completion of background syncs
  useEffect(() => {
    if (syncSummary?.background_syncs_triggered > lastBackgroundSyncs && syncSummary?.total_syncing === 0) {
      setCompletionBannerVisible(true);
      
      const timer = setTimeout(() => {
        setCompletionBannerVisible(false);
      }, 4000);
      
      return () => clearTimeout(timer);
    }
    
    setLastBackgroundSyncs(syncSummary?.background_syncs_triggered || 0);
  }, [syncSummary?.background_syncs_triggered, syncSummary?.total_syncing, lastBackgroundSyncs]);

  const SyncStatusIndicator = () => {
    if (!syncSummary) return null;

    const { total_syncing, background_syncs_triggered } = syncSummary;
    
    // Only show if there's active syncing or recent completion
    if (total_syncing > 0 || (completionBannerVisible && background_syncs_triggered > 0)) {
      return (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-right fade-in duration-300">
          <div className="flex items-center gap-3 px-4 py-3 glass-card rounded-full border border-neutral-200 shadow-lg backdrop-blur-lg">
            {total_syncing > 0 ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-neutral-700 font-medium">
                  Syncing {total_syncing} challenge{total_syncing !== 1 ? 's' : ''}
                </span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-neutral-700 font-medium">
                  Sync complete
                </span>
              </>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <Layout>
        <Loading.FullPage message="Loading challenges..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen">
        {/* Sync Status Indicator - Fixed positioned */}
        <SyncStatusIndicator />
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Active Challenges Section */}
          <div className="mb-16">
            <div className="flex items-start justify-between mb-10">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="relative">
                    <Trophy className="w-8 h-8 text-primary-600 icon-glow" />
                    <Sparkles className="w-4 h-4 text-yellow-500 absolute -top-1 -right-1 icon-glow-sm" />
                  </div>
                  <h1 className="text-4xl font-bold text-neutral-800 text-glow">
                    Active Challenges
                  </h1>
                  {activeChallenges.length > 0 && (
                    <span className="px-4 py-2 glass-card bg-gradient-to-r from-green-100/80 to-emerald-100/80 text-green-700 text-sm font-semibold rounded-full border border-green-200/60 shadow-sm backdrop-blur-md">
                      {activeChallenges.length} Live
                    </span>
                  )}
                </div>
                <p className="text-neutral-600 text-lg max-w-2xl text-glow-sm">
                  Jump into any of our currently active challenges and compete with players worldwide for the top spots!
                </p>
              </div>
              
              {/* About Challenges Button */}
              <div className="text-right flex-shrink-0 ml-8">
                <Link href="/about-challengers">
                  <button className="flex items-center gap-3 px-6 py-3 glass-card bg-gradient-to-r from-primary-50/80 to-purple-50/80 hover:glass-card-enhanced text-neutral-700 font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 border border-primary-200/60 hover:border-primary-300/60 shadow-sm hover:shadow-md backdrop-blur-md">
                    <Info className="w-5 h-5 text-primary-600 icon-glow-sm" />
                    About Challengers
                  </button>
                </Link>
                <p className="text-sm text-neutral-500 mt-2 max-w-[200px] text-glow-sm">
                  New here? Learn how challenges work!
                </p>
              </div>
            </div>

            {/* Challenges Display Area */}
            <div className="relative">
              {/* Subtle Loading Indicator */}
              {loading && (
                <div className="absolute top-4 right-4 z-10">
                  <div className="flex items-center gap-2 px-4 py-2 glass-card rounded-full border border-neutral-200/60 shadow-sm backdrop-blur-md">
                    <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                    <span className="text-sm text-neutral-600 font-medium">Loading challenges</span>
                  </div>
                </div>
              )}

              {/* Content */}
              {error ? (
                <div className="glass-card-enhanced bg-gradient-to-br from-red-50/80 to-rose-100/80 rounded-3xl p-12 text-center border border-red-200/60 backdrop-blur-lg">
                  <div className="w-16 h-16 bg-red-200/80 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                    <AlertCircle className="w-8 h-8 text-red-600 icon-glow" />
                  </div>
                  <p className="text-red-700 mb-6 font-medium text-glow">Failed to load challenges: {error.message}</p>
                  <button 
                    onClick={refreshActiveChallenges}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-full transition-all hover:shadow-lg transform hover:scale-105"
                  >
                    Try Again
                  </button>
                </div>
              ) : activeChallenges.length === 0 && !loading ? (
                <div className="glass-card-enhanced bg-gradient-to-br from-neutral-50/80 to-neutral-100/80 rounded-3xl p-16 text-center border border-neutral-200/60 backdrop-blur-lg">
                  <div className="w-20 h-20 bg-neutral-200/80 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                    <Trophy className="w-10 h-10 text-neutral-400 icon-glow" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-700 mb-3 text-glow">No Active Challenges</h3>
                  <p className="text-neutral-600 mb-2 text-glow-sm">Check back soon for new challenges!</p>
                  <p className="text-sm text-neutral-500 text-glow-sm">New challenges are added regularly</p>
                </div>
              ) : (
                <div className={`grid gap-8 transition-opacity duration-300 ${loading ? 'opacity-60' : 'opacity-100'}`}>
                  {activeChallenges.map(challenge => {
                    const isUpdating = challenge.sync_metadata?.sync_in_progress;
                    const isStale = challenge.sync_metadata?.is_stale;
                    
                    return (
                      <Link key={challenge.id} href={`/challenges/${challenge.room_id}`}>
                        <div className={`transform transition-all duration-300 ${
                          isUpdating ? 'opacity-75' : ''
                        } ${isStale ? 'ring-2 ring-yellow-200' : ''}`}>
                          <ChallengeCard 
                            challenge={challenge} 
                            size="large"
                            challengeType={getChallengeType(challenge)}
                            showBackground={true}
                            isUpdating={isUpdating}
                          />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* History Section */}
          <div className="mt-20">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-3">
                <History className="w-8 h-8 text-neutral-600 icon-glow" />
                <h2 className="text-4xl font-bold text-neutral-800 text-glow">
                  Challenge History
                </h2>
              </div>
              <SeasonSelector 
                onSeasonChange={handleSeasonChange}
                currentSeasonId={selectedSeason?.id}
              />
            </div>

            {selectedSeason && (
              <div className="mb-8">
                <div className="glass-card-enhanced rounded-2xl p-6 border border-purple-200/60 backdrop-blur-lg shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-bold text-neutral-800 mb-2 text-glow">
                        {selectedSeason.name}
                      </h3>
                      <p className="text-neutral-600 text-glow-sm">
                        {formatDate(selectedSeason.start_date)} - {formatDate(selectedSeason.end_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {selectedSeason.is_current && (
                        <span className="px-4 py-2 glass-card bg-gradient-to-r from-green-100/80 to-emerald-100/80 text-green-700 text-sm font-semibold rounded-full border border-green-200/60 shadow-sm backdrop-blur-md">
                          Current Season
                        </span>
                      )}
                      <span className="px-4 py-2 glass-card text-neutral-600 text-sm font-medium rounded-full shadow-sm backdrop-blur-md border border-neutral-200/60">
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
                <div className="absolute inset-0 glass-card-subtle backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
                  <Loading.Section message="Loading history..." />
                </div>
              )}

              {filteredChallenges.length > 0 ? (
                <div className="glass-card-enhanced rounded-2xl border border-neutral-200/60 overflow-hidden shadow-xl backdrop-blur-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="glass-card-subtle border-b border-neutral-200/60 backdrop-blur-md">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-neutral-700 uppercase tracking-wider">
                            Challenge
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-neutral-700 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-neutral-700 uppercase tracking-wider">
                            Maps
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-neutral-700 uppercase tracking-wider">
                            Participants
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-neutral-700 uppercase tracking-wider">
                            Ended
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100/60 backdrop-blur-sm">
                        {filteredChallenges.map((challenge) => {
                          const challengeType = getChallengeType(challenge);
                          const displayName = challenge.custom_name || challenge.name;
                          
                          return (
                            <tr key={challenge.id} className="hover:bg-white/20 transition-all group">
                              <td className="px-6 py-4">
                                <Link href={`/challenges/${challenge.room_id}`}>
                                  <div className="cursor-pointer">
                                    <div className="font-semibold text-neutral-800 group-hover:text-purple-600 transition-colors">
                                      {displayName || `Challenge #${challenge.id}`}
                                    </div>
                                    {challenge.description && (
                                      <div className="text-sm text-neutral-500 truncate max-w-xs mt-1">
                                        {challenge.description}
                                      </div>
                                    )}
                                  </div>
                                </Link>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${
                                  challengeType === 'weekly' 
                                    ? 'bg-gradient-to-r from-blue-100/80 to-cyan-100/80 text-blue-700 border border-blue-200/60' 
                                    : 'bg-gradient-to-r from-purple-100/80 to-pink-100/80 text-purple-700 border border-purple-200/60'
                                }`}>
                                  {challengeType}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-neutral-600">
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-purple-500 icon-glow-sm" />
                                  <span className="font-medium">{challenge.playlists?.length || 0}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-neutral-600">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-blue-500 icon-glow-sm" />
                                  <span className="font-medium">{challenge.participant_count || 0}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-neutral-500">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-gray-400 icon-glow-sm" />
                                  {challenge.end_date ? formatDate(challenge.end_date) : 'N/A'}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : !loadingHistorical && (
                <div className="glass-card-enhanced rounded-3xl p-16 text-center border border-neutral-200/60 shadow-xl backdrop-blur-lg">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-200/60 to-gray-300/60 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                    <History className="w-10 h-10 text-gray-500 icon-glow" />
                  </div>
                  <h3 className="text-2xl font-bold text-neutral-700 mb-3 text-glow">No Historical Challenges</h3>
                  <p className="text-neutral-600 mb-2 text-glow-sm">
                    {selectedSeason?.is_current 
                      ? 'Completed challenges will appear here as they finish'
                      : 'This season had no completed challenges'
                    }
                  </p>
                  <p className="text-sm text-neutral-500 text-glow-sm">
                    Challenge history helps track your progress over time
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Status Indicator */}
          <div className="mt-20 text-center">
            <div className="inline-flex items-center gap-2 px-6 py-3 glass-card rounded-full shadow-lg border border-neutral-200/60 backdrop-blur-lg">
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                syncSummary?.total_syncing > 0 ? 'bg-blue-500 animate-pulse' : 
                syncSummary?.auto_sync_enabled ? 'bg-green-500' : 'bg-gray-500'
              }`}></div>
              <p className="text-sm text-neutral-600 font-medium">
                {syncSummary?.total_syncing > 0 ? 
                  `Fetching latest scores (${syncSummary.total_syncing} active)...` : 
                  syncSummary?.auto_sync_enabled ? 
                    'Auto-sync enabled - data updates automatically' :
                    'Data updates when you visit challenges'
                }
              </p>
            </div>
            
            {/* Manual refresh button */}
            <div className="mt-4">
              <button
                onClick={refreshActiveChallenges}
                disabled={isValidating}
                className="text-xs text-neutral-500 text-glow-sm hover:text-neutral-700 transition-colors flex items-center gap-1 mx-auto disabled:opacity-50 hover:bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm"
              >
                <RefreshCw className={`w-3 h-3 icon-glow-sm ${isValidating ? 'animate-spin' : ''}`} />
                Manual Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}