import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import Layout from '../components/Layout';
import ChallengeCard from '../components/ChallengeCard';
import SeasonSelector from '../components/SeasonSelector';
import { Loader2, Trophy, History, Calendar, Sparkles, RefreshCw, ChevronDown, ChevronRight, Users, MapPin, Clock, Info, CheckCircle, AlertCircle } from 'lucide-react';
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

  // Enhanced API endpoint with auto-sync
  const activeChallengesEndpoint = useMemo(() => {
    const params = new URLSearchParams();
    params.append('active', 'true');
    params.append('auto_sync', 'true');
    return `/api/challenges?${params.toString()}`;
  }, []);

  // Use SWR for active challenges with background sync
  const {
    data: activeChallengesData,
    error,
    mutate: refreshActiveChallenges,
    isValidating
  } = useSWR(activeChallengesEndpoint, fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: false,
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

  // 🔧 FIXED: Updated to handle the correct API response structure
  const fetchHistoricalChallenges = async (seasonId) => {
    try {
      setLoadingHistorical(true);
      console.log('🔍 Fetching historical challenges for season:', seasonId);
      
      const response = await fetch(`/api/challenges?season_id=${seasonId}&active=false`);
      
      console.log('📡 Historical challenges response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Historical challenges fetch failed:', response.status, errorText);
        throw new Error(`Failed to fetch historical challenges: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 Historical challenges data structure:', data);
      
      // 🔧 FIXED: Handle the correct response structure
      let challenges = [];
      if (data.success && data.data && data.data.challenges) {
        challenges = data.data.challenges;
      } else if (data.challenges) {
        challenges = data.challenges;
      } else if (data.data && Array.isArray(data.data)) {
        challenges = data.data;
      }
      
      console.log(`✅ Loaded ${challenges.length} historical challenges`);
      console.log('🔍 Historical challenges preview:', challenges.slice(0, 2));
      setHistoricalChallenges(challenges);
      
      if (selectedSeason?.is_current) {
        setExpandedSeasons(new Set([selectedSeason.name]));
      }
    } catch (err) {
      console.error('🚨 Historical challenges fetch error:', err);
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
      // New syncs completed, show banner briefly
      setCompletionBannerVisible(true);
      
      const timer = setTimeout(() => {
        setCompletionBannerVisible(false);
      }, 4000);
      
      return () => clearTimeout(timer);
    }
    
    setLastBackgroundSyncs(syncSummary?.background_syncs_triggered || 0);
  }, [syncSummary?.background_syncs_triggered, syncSummary?.total_syncing, lastBackgroundSyncs]);

  // 🔧 FIXED: Improved sync status logic to only show when actually relevant
  const SyncStatusBanner = () => {
    if (!syncSummary) return null;

    const { total_syncing, background_syncs_triggered, auto_sync_enabled } = syncSummary;
    
    // Only show syncing banner if there are actually active syncs
    if (total_syncing > 0) {
      return (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
            <div>
              <p className="text-blue-800 font-medium">🔄 Fetching latest scores from osu!...</p>
              <p className="text-blue-600 text-sm">
                Updating {total_syncing} challenge{total_syncing !== 1 ? 's' : ''} with fresh data
              </p>
            </div>
          </div>
        </div>
      );
    }

    // 🔧 FIXED: Only show completion banner when controlled by state
    if (completionBannerVisible && background_syncs_triggered > 0) {
      return (
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            <div>
              <p className="text-green-800 font-medium">✅ Background updates completed!</p>
              <p className="text-green-600 text-sm">
                {background_syncs_triggered} challenge{background_syncs_triggered !== 1 ? 's' : ''} updated with latest data
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Don't show any banner if no active syncs and no recent completions
    return null;
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Active Challenges Section */}
        <div className="mb-16">
          <div className="flex items-start justify-between mb-10">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <Trophy className="w-8 h-8 text-primary-600" />
                  <Sparkles className="w-4 h-4 text-yellow-500 absolute -top-1 -right-1" />
                </div>
                <h1 className="text-4xl font-bold text-neutral-800">
                  Active Challenges
                </h1>
                {activeChallenges.length > 0 && (
                  <span className="px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 text-sm font-semibold rounded-full border border-green-200 shadow-sm">
                    {activeChallenges.length} Live
                  </span>
                )}
              </div>
              <p className="text-neutral-600 text-lg max-w-2xl">
                Jump into any of our currently active challenges and compete with players worldwide for the top spots!
              </p>
            </div>
            
            {/* About Challenges Button */}
            <div className="text-right flex-shrink-0 ml-8">
              <Link href="/about-challengers">
                <button className="flex items-center gap-3 px-6 py-3 glass-card hover:glass-card-enhanced text-neutral-700 font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 border border-neutral-200 hover:border-primary-300">
                  <Info className="w-5 h-5 text-primary-600" />
                  About Challengers
                </button>
              </Link>
              <p className="text-sm text-neutral-500 mt-2 max-w-[200px]">
                New here? Learn how challenges work!
              </p>
            </div>
          </div>

          {/* Sync Status Banner */}
          <SyncStatusBanner />

          {loading ? (
            <div className="flex items-center justify-center h-80 bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-3xl border border-neutral-200">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4" />
                <p className="text-neutral-600 font-medium">Loading challenges...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-3xl p-12 text-center border border-red-200">
              <div className="w-16 h-16 bg-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-red-700 mb-6 font-medium">Failed to load challenges: {error.message}</p>
              <button 
                onClick={refreshActiveChallenges}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-full transition-all hover:shadow-lg transform hover:scale-105"
              >
                Try Again
              </button>
            </div>
          ) : activeChallenges.length === 0 ? (
            <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-3xl p-16 text-center border border-neutral-200">
              <div className="w-20 h-20 bg-neutral-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-10 h-10 text-neutral-400" />
              </div>
              <h3 className="text-xl font-bold text-neutral-700 mb-3">No Active Challenges</h3>
              <p className="text-neutral-600 mb-2">Check back soon for new challenges!</p>
              <p className="text-sm text-neutral-500">New challenges are added regularly</p>
            </div>
          ) : (
            <div className="grid gap-8">
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

        {/* History Section */}
        <div className="border-t border-neutral-200 pt-16">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
              <History className="w-7 h-7 text-neutral-600" />
              <h2 className="text-3xl font-bold text-neutral-800">
                Challenge History
              </h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <SeasonSelector 
                onSeasonChange={handleSeasonChange}
                currentSeasonId={selectedSeason?.id}
              />
            </div>
          </div>

          {selectedSeason && (
            <div className="mb-8">
              <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl p-6 border border-primary-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-neutral-800 mb-2">
                      {selectedSeason.name}
                    </h3>
                    <p className="text-neutral-600">
                      {formatDate(selectedSeason.start_date)} - {formatDate(selectedSeason.end_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedSeason.is_current && (
                      <span className="px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 text-sm font-semibold rounded-full border border-green-200 shadow-sm">
                        Current Season
                      </span>
                    )}
                    <span className="px-3 py-1 bg-neutral-100 text-neutral-600 text-sm font-medium rounded-full">
                      {filteredChallenges.length} challenges
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {loadingHistorical ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : filteredChallenges.length > 0 ? (
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Challenge
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Maps
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Participants
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Ended
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredChallenges.map((challenge, index) => {
                      const challengeType = getChallengeType(challenge);
                      const displayName = challenge.custom_name || challenge.name;
                      
                      return (
                        <tr key={challenge.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="px-6 py-4">
                            <Link href={`/challenges/${challenge.room_id}`}>
                              <div className="cursor-pointer">
                                <div className="font-medium text-neutral-800 hover:text-primary-600 transition-colors">
                                  {displayName || `Challenge #${challenge.id}`}
                                </div>
                                {challenge.description && (
                                  <div className="text-sm text-neutral-500 truncate max-w-xs">
                                    {challenge.description}
                                  </div>
                                )}
                                {challenge.custom_name && (
                                  <div className="text-xs text-purple-600 font-medium mt-1">
                                    Custom Name
                                  </div>
                                )}
                              </div>
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              challengeType === 'weekly' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {challengeType}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-600">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {challenge.playlists?.length || 0}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-600">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {challenge.participant_count || 0}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-500">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
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
          ) : (
            <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-3xl p-16 text-center border border-neutral-200">
              <div className="w-20 h-20 bg-neutral-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <History className="w-10 h-10 text-neutral-400" />
              </div>
              <h3 className="text-xl font-bold text-neutral-700 mb-3">No Historical Challenges</h3>
              <p className="text-neutral-600 mb-2">
                {selectedSeason?.is_current 
                  ? 'Completed challenges will appear here as they finish'
                  : 'This season had no completed challenges'
                }
              </p>
              <p className="text-sm text-neutral-500">
                Challenge history helps track your progress over time
              </p>
            </div>
          )}
        </div>

        {/* Footer note with enhanced sync info */}
        <div className="mt-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 rounded-full border border-neutral-200">
            <div className={`w-2 h-2 rounded-full ${
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
          
          {/* Sync statistics for development */}
          {process.env.NODE_ENV === 'development' && syncSummary && (
            <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg max-w-md mx-auto">
              <div className="font-medium mb-2">Sync Debug Info:</div>
              <div>Auto-sync: {syncSummary.auto_sync_enabled ? 'Enabled' : 'Disabled'}</div>
              <div>Currently syncing: {syncSummary.total_syncing || 0}</div>
              <div>Stale challenges: {syncSummary.total_stale || 0}</div>
              <div>Background syncs triggered: {syncSummary.background_syncs_triggered || 0}</div>
            </div>
          )}
          
          {/* Manual refresh button */}
          <div className="mt-4">
            <button
              onClick={refreshActiveChallenges}
              disabled={isValidating}
              className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors flex items-center gap-1 mx-auto disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isValidating ? 'animate-spin' : ''}`} />
              Manual Refresh
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}