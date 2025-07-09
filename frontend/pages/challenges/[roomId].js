// pages/challenges/[roomId].js - Redesigned with master-detail interface
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import useSWR from 'swr';
import Layout from '../../components/Layout';
import ScoreTable from '../../components/ScoreTable';
import CombinedLeaderboard from '../../components/CombinedLeaderboard';
import { challengeQueries } from '../../lib/supabase';
import { ArrowLeft, Loader2, Users, Calendar, Music, Star, Trophy, RefreshCw, CheckCircle, Clock, AlertCircle, ChevronDown, Filter, TrendingUp } from 'lucide-react';
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
  if (difficulty < 1.25) return 'text-blue-300 bg-blue-500';
  if (difficulty < 2.0) return 'text-cyan-300 bg-cyan-500';
  if (difficulty < 2.5) return 'text-green-300 bg-green-500';
  if (difficulty < 3.3) return 'text-lime-300 bg-lime-500';
  if (difficulty < 4.2) return 'text-yellow-300 bg-yellow-500';
  if (difficulty < 4.9) return 'text-orange-300 bg-orange-500';
  if (difficulty < 5.8) return 'text-red-300 bg-red-500';
  if (difficulty < 6.7) return 'text-pink-300 bg-pink-500';
  if (difficulty < 7.7) return 'text-purple-300 bg-purple-500';
  return 'text-indigo-300 bg-indigo-600';
};

const formatScore = (score) => {
  if (score >= 1000000) return (score / 1000000).toFixed(1) + 'M';
  if (score >= 1000) return (score / 1000).toFixed(0) + 'K';
  return score?.toLocaleString() || '0';
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

  // State for playlist selection and sorting
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [sortBy, setSortBy] = useState('difficulty'); // 'difficulty', 'participants', 'alphabetical'
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [completionBannerVisible, setCompletionBannerVisible] = useState(false);
  const [lastSyncCompleted, setLastSyncCompleted] = useState(false);

  // Set initial selected playlist when challenge loads
  useEffect(() => {
    if (challenge?.playlists?.length > 0 && !selectedPlaylistId) {
      setSelectedPlaylistId(challenge.playlists[0].id);
    }
  }, [challenge?.playlists, selectedPlaylistId]);

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

  // Sort playlists based on selected sorting method
  const getSortedPlaylists = () => {
    if (!challenge?.playlists) return [];
    
    const playlists = [...challenge.playlists];
    
    switch (sortBy) {
      case 'difficulty':
        return playlists.sort((a, b) => (a.beatmap_difficulty || 0) - (b.beatmap_difficulty || 0));
      case 'participants':
        return playlists.sort((a, b) => (b.scores?.length || 0) - (a.scores?.length || 0));
      case 'alphabetical':
        return playlists.sort((a, b) => (a.beatmap_title || '').localeCompare(b.beatmap_title || ''));
      default:
        return playlists;
    }
  };

  // Get currently selected playlist
  const selectedPlaylist = challenge?.playlists?.find(p => p.id === selectedPlaylistId);

  // Get playlist preview info
  const getPlaylistPreview = (playlist) => {
    const scores = playlist.scores || [];
    const participantCount = scores.length;
    const topScore = scores.length > 0 ? Math.max(...scores.map(s => s.score || 0)) : 0;
    const topPlayer = scores.find(s => s.score === topScore)?.users?.username;
    
    return {
      participantCount,
      topScore,
      topPlayer: topPlayer || 'No scores'
    };
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
      <div className="glass-1 rounded-2xl p-4 mb-6 performance-card-orange">
        <div className="flex items-center gap-2 text-sm">
          <Target className="w-4 h-4 text-orange-400 flex-shrink-0 icon-shadow-adaptive-sm" />
          <span className="text-white/90 text-shadow-adaptive-sm">
            <strong>Ruleset Active:</strong> <code className="glass-2 text-white px-1.5 py-0.5 rounded font-mono text-xs ml-1">{rulesetName}</code> - {rulesetDescription}
          </span>
        </div>
      </div>
    );
  };

  // Fixed Sync Status Indicator
  const SyncStatusIndicator = () => {
    const isSyncing = isBackgroundSyncing || isManualSyncing;
    
    if (isSyncing || completionBannerVisible) {
      return (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className="flex items-center gap-3 px-4 py-3 glass-2 rounded-full shadow-lg">
            {isSyncing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                <span className="text-sm text-white/90 font-medium text-shadow-adaptive-sm">
                  Syncing challenge data...
                </span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-green-400 icon-shadow-adaptive-sm" />
                <span className="text-sm text-white/90 font-medium text-shadow-adaptive-sm">
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
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Fixed Sync Status Indicator */}
          <SyncStatusIndicator />

          {/* Back button */}
          <div className="mb-8">
            <Link 
              href="/"
              className="group flex items-center gap-2 text-white/70 hover:text-white/90 font-medium text-shadow-adaptive-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform icon-shadow-adaptive-sm" />
              Back to challenges
            </Link>
          </div>

          {loading ? (
            <div className="glass-1 rounded-3xl p-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-white/70 mx-auto mb-4 icon-shadow-adaptive" />
              <p className="text-white/70 text-shadow-adaptive-sm">Loading challenge...</p>
            </div>
          ) : error || !challenge ? (
            <div className="glass-1 rounded-3xl p-12 text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 glass-2">
                <AlertCircle className="w-8 h-8 text-red-400 icon-shadow-adaptive" />
              </div>
              <h3 className="text-2xl font-bold text-white/90 mb-4 text-shadow-adaptive">Failed to load challenge</h3>
              <p className="text-white/70 mb-6 text-shadow-adaptive-sm">There was an error loading this challenge.</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={refresh}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold rounded-full hover:shadow-lg transform hover:scale-105 transition-all"
                >
                  Try Again
                </button>
                <Link 
                  href="/"
                  className="px-6 py-3 glass-2 hover:glass-3 text-white font-semibold rounded-full transition-all"
                >
                  Back to challenges
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Challenge Header */}
              <div className="relative overflow-hidden glass-1 rounded-3xl mb-8 shadow-2xl">
                {/* Enhanced gradient overlay */}
                <div 
                  className="absolute inset-0 opacity-70"
                  style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(139, 92, 246, 0.9) 50%, rgba(168, 85, 247, 0.9) 100%)'
                  }}
                />
                
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute -top-8 -right-8 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse-soft"></div>
                  <div className="absolute -bottom-8 -left-8 w-80 h-80 bg-white rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }}></div>
                </div>
                
                <div className="relative z-10 p-8 text-white">
                  <div className="flex justify-between items-start mb-4">
                    <h1 className="text-4xl lg:text-5xl font-black text-white text-shadow-adaptive">
                      {challenge.custom_name || challenge.name}
                    </h1>
                    {challenge.custom_name && (
                      <span className="px-3 py-1 glass-3 text-white/90 font-medium rounded-full text-sm text-shadow-adaptive-sm">
                        Custom Name
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-6 text-white/90 mb-4">
                    <span className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-300 icon-shadow-adaptive-sm" />
                      Hosted by <span className="font-medium text-white text-shadow-adaptive-sm">{challenge.host}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-300 icon-shadow-adaptive-sm" />
                      <span className="font-medium text-white text-shadow-adaptive-sm">{challenge.participant_count}</span> participants
                    </span>
                    <span className="flex items-center gap-2">
                      <Music className="w-5 h-5 text-orange-300 icon-shadow-adaptive-sm" />
                      <span className="font-medium text-white text-shadow-adaptive-sm">{challenge.playlists?.length || 0}</span> maps
                    </span>
                    {challenge.start_date && challenge.end_date && (
                      <span className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-green-300 icon-shadow-adaptive-sm" />
                        <span className="font-medium text-white text-shadow-adaptive-sm">
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

                  {/* Status and sync info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-3 h-3 rounded-full ${
                        challenge.is_active ? 'bg-green-400' : 'bg-gray-400'
                      }`}></span>
                      <span className="text-sm text-white/90 text-shadow-adaptive-sm">
                        {challenge.is_active ? 'Active Challenge' : 'Inactive Challenge'}
                      </span>
                    </div>
                    
                    <div className="text-xs text-white/80 flex items-center gap-4 text-shadow-adaptive-sm">
                      <span>
                        Last updated: {formatUTCDateTime(challenge.updated_at)}
                      </span>
                      {syncMetadata?.is_stale && challenge.is_active && (
                        <span className="text-yellow-300 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 icon-shadow-adaptive-sm" />
                          Data may be outdated
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <RulesetNote challenge={challenge} rulesetInfo={rulesetInfo} />

              {/* Combined Leaderboard - Featured prominently */}
              {shouldShowCombinedLeaderboard && (
                <div className="glass-1 rounded-3xl overflow-hidden mb-8 shadow-xl">
                  <div className="relative overflow-hidden">
                    <div 
                      className="absolute inset-0 opacity-80"
                      style={{
                        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.9) 0%, rgba(236, 72, 153, 0.9) 100%)'
                      }}
                    />
                    <div className="relative z-10 p-6">
                      <div className="flex items-center gap-3">
                        <Trophy className="w-8 h-8 text-white icon-shadow-adaptive" />
                        <div>
                          <h2 className="text-2xl font-bold text-white text-shadow-adaptive">Combined Leaderboard</h2>
                          <p className="text-white/90 text-sm mt-1 text-shadow-adaptive-sm">
                            Total scores across all {challenge.playlists.length} maps - determines winners
                          </p>
                        </div>
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

              {/* Individual Maps Section */}
              <div className="glass-1 rounded-3xl p-8 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white text-shadow-adaptive flex items-center gap-3">
                    <Music className="w-7 h-7 text-purple-400 icon-shadow-adaptive" />
                    Individual Maps
                  </h2>
                  
                  {/* Sort selector */}
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-white/70 icon-shadow-adaptive-sm" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="glass-2 text-white text-sm px-3 py-2 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-purple-400 text-shadow-adaptive-sm"
                    >
                      <option value="difficulty" className="bg-gray-800 text-white">Sort by Difficulty</option>
                      <option value="participants" className="bg-gray-800 text-white">Sort by Participants</option>
                      <option value="alphabetical" className="bg-gray-800 text-white">Sort Alphabetically</option>
                    </select>
                  </div>
                </div>

                {/* Horizontal Map Selector */}
                <div className="mb-8">
                  <div className="relative">
                    <div 
                      className="flex gap-4 overflow-x-auto scrollbar-glass pb-4"
                      onMouseEnter={() => {
                        document.body.style.overflowY = 'hidden';
                        document.body.style.paddingRight = '17px'; // Compensate for scrollbar width
                      }}
                      onMouseLeave={() => {
                        document.body.style.overflowY = 'auto';
                        document.body.style.paddingRight = '0px';
                      }}
                      onWheel={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.scrollLeft += e.deltaY;
                      }}
                    >
                      {getSortedPlaylists().map((playlist, index) => {
                        const preview = getPlaylistPreview(playlist);
                        const isSelected = playlist.id === selectedPlaylistId;
                        
                        return (
                          <button
                            key={playlist.id}
                            onClick={() => setSelectedPlaylistId(playlist.id)}
                            className={`group relative flex-shrink-0 w-80 transition-all duration-300 ${
                              isSelected 
                                ? 'transform scale-105' 
                                : 'hover:transform hover:scale-102'
                            }`}
                          >
                            <div 
                              className={`relative overflow-hidden rounded-2xl p-5 h-36 transition-all ${
                                isSelected 
                                  ? 'glass-2 performance-card-purple shadow-2xl' 
                                  : 'glass-1 hover:glass-2 shadow-lg hover:shadow-xl'
                              }`}
                            >
                              {/* Map Image Background */}
                              <div className="absolute inset-0">
                                {playlist.beatmap_cover_url ? (
                                  <>
                                    <div 
                                      className="absolute inset-0"
                                      style={{
                                        backgroundImage: `url(${playlist.beatmap_cover_url})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        filter: 'blur(1px) brightness(0.7)'
                                      }}
                                      onLoad={() => {
                                        // Image loaded, but we don't block anything
                                      }}
                                    />
                                    <div className={`absolute inset-0 ${
                                      isSelected 
                                        ? 'bg-gradient-to-br from-purple-600/70 via-purple-500/60 to-pink-600/70' 
                                        : 'bg-gradient-to-br from-blue-600/60 via-purple-600/50 to-purple-700/60'
                                    }`} />
                                  </>
                                ) : (
                                  <div className={`absolute inset-0 bg-gradient-to-br ${
                                    isSelected 
                                      ? 'from-purple-600 via-purple-500 to-pink-600' 
                                      : 'from-blue-600 via-purple-600 to-purple-700'
                                  }`} />
                                )}
                              </div>

                              {/* Content */}
                              <div className="relative z-10 h-full flex flex-col">
                                {/* Header with index and difficulty */}
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-xs font-bold text-white/90 text-shadow-adaptive px-2 py-1 glass-3 rounded-full">
                                    #{index + 1}
                                  </span>
                                  {playlist.beatmap_difficulty && (
                                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${getDifficultyColor(playlist.beatmap_difficulty)} shadow-md`}>
                                      <Star className="w-3 h-3 fill-current" />
                                      {playlist.beatmap_difficulty.toFixed(1)}
                                    </div>
                                  )}
                                </div>

                                {/* Map Info - Center */}
                                <div className="flex-1 flex flex-col justify-center">
                                  <h3 className="font-bold text-white text-lg mb-1 line-clamp-2 text-shadow-adaptive leading-tight">
                                    {playlist.beatmap_title}
                                  </h3>
                                  <p className="text-sm text-white/90 mb-1 line-clamp-1 text-shadow-adaptive-sm">
                                    by {playlist.beatmap_artist}
                                  </p>
                                  <p className="text-xs text-white/80 line-clamp-1 text-shadow-adaptive-sm">
                                    [{playlist.beatmap_version}]
                                  </p>
                                </div>

                                {/* Preview Stats - Bottom (More Compact) */}
                                <div className="text-center">
                                  <div className="inline-flex items-center gap-1 glass-3 rounded-full px-3 py-1 text-xs">
                                    <Users className="w-3 h-3 text-white/90 icon-shadow-adaptive-sm" />
                                    <span className="font-medium text-white/90 text-shadow-adaptive-sm">
                                      {preview.participantCount}
                                    </span>
                                    {preview.topScore > 0 && (
                                      <>
                                        <span className="text-white/60 mx-1">•</span>
                                        <span className="font-bold text-white text-shadow-adaptive-sm">
                                          {formatScore(preview.topScore)}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Fade edges for scroll indication */}
                    <div className="absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-black/30 to-transparent pointer-events-none rounded-l-2xl z-10"></div>
                    <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-black/30 to-transparent pointer-events-none rounded-r-2xl z-10"></div>
                  </div>
                </div>

                {/* Selected Playlist Table - Full Width */}
                <div className="w-full">
                  {selectedPlaylist ? (
                    <div className="glass-2 rounded-2xl overflow-hidden">
                      {/* Map header */}
                      <div className="relative overflow-hidden">
                        <div className="absolute inset-0">
                          {selectedPlaylist.beatmap_cover_url && (
                            <>
                              <div 
                                className="absolute inset-0 opacity-20"
                                style={{
                                  backgroundImage: `url(${selectedPlaylist.beatmap_cover_url})`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                  filter: 'blur(8px)',
                                  transform: 'scale(1.1)'
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/90 via-purple-500/80 to-pink-500/90" />
                            </>
                          )}
                          {!selectedPlaylist.beatmap_cover_url && (
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500" />
                          )}
                        </div>
                        
                        <div className="relative z-10 p-6 flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold mb-1 text-white text-shadow-adaptive">
                              {selectedPlaylist.beatmap_title}
                            </h3>
                            <p className="text-white/90 mb-2 text-shadow-adaptive-sm">
                              by {selectedPlaylist.beatmap_artist}
                            </p>
                            <div className="flex items-center gap-4 flex-wrap">
                              <span className="text-white/80 font-medium text-shadow-adaptive-sm">
                                [{selectedPlaylist.beatmap_version}]
                              </span>
                              {selectedPlaylist.beatmap_difficulty && (
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${getDifficultyColor(selectedPlaylist.beatmap_difficulty)}`}>
                                  <Star className="w-4 h-4 fill-current" />
                                  <span>{selectedPlaylist.beatmap_difficulty.toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-6">
                        {selectedPlaylist.scores?.length > 0 ? (
                          <ScoreTable scores={selectedPlaylist.scores} challenge={challenge} />
                        ) : (
                          <div className="text-center py-12">
                            <Music className="w-12 h-12 mx-auto mb-3 text-white/30 icon-shadow-adaptive" />
                            <p className="text-white/70 text-shadow-adaptive-sm">No scores submitted yet</p>
                            <p className="text-sm text-white/60 mt-1 text-shadow-adaptive-sm">Be the first to set a score!</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="glass-2 rounded-2xl p-12 text-center">
                      <Music className="w-12 h-12 mx-auto mb-4 text-white/30 icon-shadow-adaptive" />
                      <p className="text-white/70 text-shadow-adaptive-sm">Select a map to view scores</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Status */}
              <div className="mt-16 text-center pb-8">
                <div className="inline-flex items-center gap-3 px-6 py-3 glass-1 rounded-full shadow-md">
                  <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    isBackgroundSyncing || isManualSyncing ? 'bg-blue-500 animate-pulse' : 
                    syncMetadata?.is_stale && challenge?.is_active ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  <p className="text-sm text-white/90 font-medium text-shadow-adaptive-sm">
                    {isBackgroundSyncing || isManualSyncing ? 'Fetching latest scores from osu!...' : 
                     syncMetadata?.is_stale && challenge?.is_active ? 'Data updates available' : 'Data is up to date'}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}