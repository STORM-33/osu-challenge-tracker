// pages/challenges/[roomId].js - Updated with improved sync indicators
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import useSWR from 'swr';
import Layout from '../../components/Layout';
import ScoreTable from '../../components/ScoreTable';
import CombinedLeaderboard from '../../components/CombinedLeaderboard';
import { challengeQueries } from '../../lib/supabase';
import { ArrowLeft, Loader2, Users, Calendar, Music, Star, Trophy, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Crown, Target } from 'lucide-react';
import { generateRulesetName, generateRulesetDescription } from '../../lib/ruleset-name-generator';
import { useChallengeWithSync } from '../../hooks/useAPI';

// Constants
const UPDATE_THRESHOLD = 4 * 60 * 1000; // 4 minutes in milliseconds

const formatUTCDateTime = (utcDateString) => {
  if (!utcDateString) return 'N/A';
  
  const utcString = utcDateString.endsWith('Z') ? utcDateString : `${utcDateString}Z`;
  const date = new Date(utcString);
  
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Helper to get UTC timestamp from UTC string
const getUTCTimestamp = (utcDateString) => {
  if (!utcDateString) return null;
  const utcString = utcDateString.endsWith('Z') ? utcDateString : `${utcDateString}Z`;
  return new Date(utcString).getTime();
}

// Difficulty color function matching osu! colors
const getDifficultyColor = (difficulty) => {
  if (difficulty < 1.25) return 'text-blue-700 bg-blue-100 border-blue-200';
  if (difficulty < 2.0) return 'text-cyan-700 bg-cyan-100 border-cyan-200';
  if (difficulty < 2.5) return 'text-green-700 bg-green-100 border-green-200';
  if (difficulty < 3.3) return 'text-lime-700 bg-lime-100 border-lime-200';
  if (difficulty < 4.2) return 'text-yellow-700 bg-yellow-100 border-yellow-200';
  if (difficulty < 4.9) return 'text-orange-700 bg-orange-100 border-orange-200';
  if (difficulty < 5.8) return 'text-red-700 bg-red-100 border-red-200';
  if (difficulty < 6.7) return 'text-pink-700 bg-pink-100 border-pink-200';
  if (difficulty < 7.7) return 'text-purple-700 bg-purple-100 border-purple-200';
  return 'text-indigo-700 bg-indigo-100 border-indigo-200';
};

export default function ChallengeDetail() {
  const router = useRouter();
  const { roomId } = router.query;
  
  // Use the enhanced hook with background sync
  const {
    challenge,
    rulesetInfo,
    rulesetWinner,
    syncMetadata,
    loading,
    error,
    isBackgroundSyncing,
    syncError,
    refresh,
    triggerSync
  } = useChallengeWithSync(roomId, {
    autoRefresh: true,
    onSyncComplete: () => {
      console.log('✅ Background sync completed, data refreshed');
    }
  });

  // State for manual sync and completion tracking
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [completionBannerVisible, setCompletionBannerVisible] = useState(false);
  const [lastSyncCompleted, setLastSyncCompleted] = useState(false);

  // Track sync completion for banner
  useEffect(() => {
    if (lastSyncCompleted && !isBackgroundSyncing && !isManualSyncing) {
      setCompletionBannerVisible(true);
      
      const timer = setTimeout(() => {
        setCompletionBannerVisible(false);
      }, 4000);
      
      return () => clearTimeout(timer);
    }
    
    if (isBackgroundSyncing || isManualSyncing) {
      setLastSyncCompleted(true);
    }
  }, [isBackgroundSyncing, isManualSyncing, lastSyncCompleted]);

  // Fetch combined leaderboard when we have a challenge with multiple maps that have scores
  const shouldShowCombinedLeaderboard = challenge && challenge.playlists && 
    challenge.playlists.filter(p => p.scores && p.scores.length > 0).length >= 2;

  const { data: combinedLeaderboard, isLoading: leaderboardLoading } = useSWR(
    shouldShowCombinedLeaderboard ? ['leaderboard', challenge.id] : null,
    () => challengeQueries.getChallengeLeaderboard(challenge.id),
    { revalidateOnFocus: false }
  );

  // Manual sync handler
  const handleManualSync = async (force = false) => {
    setIsManualSyncing(true);
    
    try {
      const result = await triggerSync(force);
      
      if (result.success && result.queued) {
        // Success will be handled by the completion banner
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const RulesetNote = ({ challenge, rulesetInfo }) => {
    if (!challenge?.has_ruleset || !rulesetInfo?.required_mods) {
      return null;
    }

    const getRulesetName = () => {
      try {
        return generateRulesetName(rulesetInfo.required_mods, rulesetInfo.ruleset_match_type || 'exact');
      } catch (error) {
        console.warn('Error generating ruleset name:', error);
        return 'Custom Ruleset';
      }
    };

    const getRulesetDescription = () => {
      try {
        return generateRulesetDescription(rulesetInfo.required_mods, rulesetInfo.ruleset_match_type || 'exact');
      } catch (error) {
        console.warn('Error generating ruleset description:', error);
        return 'Custom ruleset is active';
      }
    };

    const rulesetName = getRulesetName();
    const rulesetDescription = getRulesetDescription();

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <Target className="w-4 h-4 text-yellow-600 flex-shrink-0" />
          <span className="text-yellow-800">
            <strong>Ruleset Active:</strong> <code className="bg-yellow-100 text-yellow-900 px-1.5 py-0.5 rounded font-mono text-xs">{rulesetName}</code> - {rulesetDescription}
          </span>
        </div>
      </div>
    );
  };

  // Fixed Sync Status Indicator (similar to main page)
  const SyncStatusIndicator = () => {
    const isSyncing = isBackgroundSyncing || isManualSyncing;
    
    // Only show if there's active syncing or recent completion
    if (isSyncing || completionBannerVisible) {
      return (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-right fade-in duration-300">
          <div className="flex items-center gap-3 px-4 py-3 bg-white/95 backdrop-blur-sm rounded-full border border-neutral-200 shadow-lg">
            {isSyncing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-neutral-700 font-medium">
                  Syncing challenge data...
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

  if (!roomId) return null;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Fixed Sync Status Indicator */}
        <SyncStatusIndicator />

        {/* Back button */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-6 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to challenges
        </Link>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : error || !challenge ? (
          <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-3xl p-12 text-center border border-red-200">
            <div className="w-16 h-16 bg-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-red-700 mb-6 font-medium">Failed to load challenge</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={refresh}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-full transition-all hover:shadow-lg transform hover:scale-105"
              >
                Try Again
              </button>
              <Link 
                href="/"
                className="bg-neutral-600 hover:bg-neutral-700 text-white font-semibold px-6 py-3 rounded-full transition-all hover:shadow-lg transform hover:scale-105"
              >
                Back to challenges
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Challenge header */}
            <div className="glass-card rounded-2xl p-8 mb-8">
              <div className="mb-6">
                <div className="flex justify-between items-start mb-3">
                  <h1 className="text-4xl font-bold text-neutral-800">
                    {challenge.custom_name || challenge.name}
                  </h1>
                  {challenge.custom_name && (
                    <span className="text-sm text-purple-600 font-medium bg-purple-100 px-2 py-1 rounded-full">
                      Custom Name
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-6 text-neutral-600">
                  <span className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary-500" />
                    Hosted by <span className="font-medium text-neutral-800">{challenge.host}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-500" />
                    <span className="font-medium text-neutral-800">{challenge.participant_count}</span> participants
                  </span>
                  <span className="flex items-center gap-2">
                    <Music className="w-5 h-5 text-orange-500" />
                    <span className="font-medium text-neutral-800">{challenge.playlists?.length || 0}</span> maps
                  </span>
                  {challenge.start_date && challenge.end_date && (
                    <span className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-green-500" />
                      <span className="font-medium text-neutral-800">
                        {new Date(challenge.start_date).toLocaleDateString(undefined, {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })} - {new Date(challenge.end_date).toLocaleDateString(undefined, {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </span>
                    </span>
                  )}
                </div>

                {/* Data freshness indicator */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      challenge.is_active ? 'bg-green-400' : 'bg-gray-400'
                    }`}></span>
                    <span className="text-sm text-gray-600">
                      {challenge.is_active ? 'Active Challenge' : 'Inactive Challenge'}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-500 flex items-center gap-4">
                    <span>
                      Last updated: {formatUTCDateTime(challenge.updated_at)}
                    </span>
                    {syncMetadata?.is_stale && challenge.is_active && (
                      <span className="text-yellow-600 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Data may be outdated
                      </span>
                    )}
                    {syncError && (
                      <span className="text-red-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Sync error: {syncError}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <RulesetNote challenge={challenge} rulesetInfo={rulesetInfo} />

            {/* Combined Leaderboard - Only show when there are 2+ maps with scores */}
            {shouldShowCombinedLeaderboard && (
              <div className="glass-card rounded-2xl overflow-hidden mb-8">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-8 h-8 text-white" />
                    <div>
                      <h2 className="text-2xl font-bold text-white">Combined Leaderboard</h2>
                      <p className="text-white/90 text-sm mt-1">
                        Total scores across all {challenge.playlists.length} maps
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <CombinedLeaderboard 
                    leaderboard={combinedLeaderboard || []} 
                    loading={leaderboardLoading}
                    totalMaps={challenge.playlists.length}
                  />
                </div>
              </div>
            )}

            {/* Playlists */}
            <div className="space-y-8">
              {challenge.playlists?.map((playlist, index) => (
                <div key={playlist.id} className="glass-card rounded-2xl overflow-hidden">
                  {/* Enhanced Map Header */}
                  <div className="relative overflow-hidden">
                    {/* Background with map cover */}
                    <div className="absolute inset-0">
                      {playlist.beatmap_cover_url && (
                        <>
                          <div 
                            className="absolute inset-0 opacity-20"
                            style={{
                              backgroundImage: `url(${playlist.beatmap_cover_url})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              filter: 'blur(8px)',
                              transform: 'scale(1.1)'
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/90 via-primary-500/80 to-purple-500/90" />
                        </>
                      )}
                      {!playlist.beatmap_cover_url && (
                        <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-purple-500" />
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="relative z-10 p-6 flex items-center justify-between">
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold mb-1 text-white">
                          {index + 1}. {playlist.beatmap_title}
                        </h2>
                        <p className="text-white/90 mb-2">
                          by {playlist.beatmap_artist}
                        </p>
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="text-white/80 font-medium">
                            [{playlist.beatmap_version}]
                          </span>
                          {playlist.beatmap_difficulty && (
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold transition-all duration-300 ${getDifficultyColor(playlist.beatmap_difficulty)}`}>
                              <Star className="w-4 h-4 fill-current" />
                              <span>{playlist.beatmap_difficulty.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Map thumbnail on the right for larger screens */}
                      {playlist.beatmap_cover_url && (
                        <div className="hidden md:block ml-6 flex-shrink-0">
                          <div className="relative group">
                            <img 
                              src={playlist.beatmap_list_url || playlist.beatmap_card_url || playlist.beatmap_cover_url}
                              alt={`${playlist.beatmap_title} cover`}
                              className="w-40 h-28 object-cover rounded-lg shadow-lg transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => {
                                if (e.target.src !== playlist.beatmap_cover_url) {
                                  e.target.src = playlist.beatmap_cover_url;
                                }
                              }}
                            />
                            <div className="absolute inset-0 rounded-lg ring-2 ring-white/20 group-hover:ring-white/40 transition-all duration-300" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    {playlist.scores?.length > 0 ? (
                      <ScoreTable scores={playlist.scores} challenge={challenge} />
                    ) : (
                      <div className="text-center py-8">
                        <Music className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                        <p className="text-neutral-500">No scores submitted yet</p>
                        <p className="text-sm text-neutral-400 mt-1">Be the first to set a score!</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Status - Similar to main page */}
            <div className="mt-20 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 rounded-full border border-neutral-200">
                <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  isBackgroundSyncing || isManualSyncing ? 'bg-blue-500 animate-pulse' : 
                  syncMetadata?.is_stale && challenge?.is_active ? 'bg-yellow-500' : 'bg-green-500'
                }`}></div>
                <p className="text-sm text-neutral-600 font-medium">
                  {isBackgroundSyncing || isManualSyncing ? 'Fetching latest scores from osu!...' : 
                   syncMetadata?.is_stale && challenge?.is_active ? 'Data updates available' : 'Data is up to date'}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}