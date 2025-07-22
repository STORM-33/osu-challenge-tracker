import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import useSWR from 'swr';
import Layout from '../../components/Layout';
import ScoreTable from '../../components/ScoreTable';
import CombinedLeaderboard from '../../components/CombinedLeaderboard';
import { challengeQueries } from '../../lib/supabase';
import { ArrowLeft, Loader2, Users, Calendar, Music, Star, Trophy, CheckCircle, Clock, AlertCircle, Search, Filter, TrendingUp, Crown, Target, ChevronRight } from 'lucide-react';
import { generateRulesetName, generateRulesetDescription } from '../../lib/ruleset-name-generator';
import { syncConfig } from '../../lib/sync-config';
import { SyncStatusIndicator } from '../../components/SyncStatusIndicator';

// Enhanced fetcher that handles sync metadata
const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('API request failed');
  }
  const data = await res.json();
  return data.data || data;
};

// Constants from centralized config
const COMPLETION_BANNER_DURATION = syncConfig.thresholds.COMPLETION_BANNER_DURATION;

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

export default function ChallengeDetail() {
  const router = useRouter();
  const { roomId } = router.query;
  
  const { data: challengeData, error, mutate: refresh, isValidating } = useSWR(
    roomId ? `/api/challenges/${roomId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0 // No automatic refresh
    }
  );

  // Extract data from response
  const challenge = challengeData?.challenge;
  const rulesetInfo = challengeData?.ruleset_info;
  const rulesetWinner = challengeData?.ruleset_winner;
  const syncMetadata = challengeData?.sync_metadata;
  const loading = !challengeData && !error;

  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);


  // State for playlist selection and sorting
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [sortBy, setSortBy] = useState('difficulty');
  const [searchQuery, setSearchQuery] = useState('');

  // Set initial selected playlist when challenge loads
  useEffect(() => {
    if (challenge?.playlists?.length > 0 && !selectedPlaylistId) {
      setSelectedPlaylistId(challenge.playlists[0].id);
    }
  }, [challenge?.playlists, selectedPlaylistId]);

  const debouncedRefresh = () => {
    if (isValidating) return;
    refresh();
  };

  // Fetch combined leaderboard when we have a challenge with multiple maps that have scores
  const shouldShowCombinedLeaderboard = challenge && challenge.playlists && 
    challenge.playlists.filter(p => p.scores && p.scores.length > 0).length >= 2;

  const { data: combinedLeaderboard, isLoading: leaderboardLoading } = useSWR(
    shouldShowCombinedLeaderboard ? ['leaderboard', challenge.id] : null,
    () => challengeQueries.getChallengeLeaderboard(challenge.id),
    { revalidateOnFocus: false }
  );

  // Sort and filter playlists
  const getSortedAndFilteredPlaylists = () => {
    if (!challenge?.playlists) return [];
    
    let playlists = [...challenge.playlists];
    
    // Apply search filter
    if (searchQuery) {
      playlists = playlists.filter(p => 
        p.beatmap_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.beatmap_artist?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.beatmap_version?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply sorting
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

  // Check if this is a single playlist challenge
  const isSinglePlaylist = challenge?.playlists?.length === 1;

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
      <div className="glass-1 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 performance-card-orange">
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <Target className="w-4 h-4 text-orange-400 flex-shrink-0 icon-shadow-adaptive-sm" />
          <span className="text-white/90 text-shadow-adaptive-sm">
            <strong>Ruleset Active:</strong> <code className="glass-2 text-white px-1.5 py-0.5 rounded font-mono text-xs ml-1">{rulesetName}</code> - {rulesetDescription}
          </span>
        </div>
      </div>
    );
  };

  if (!roomId) return null;

  return (
    <Layout>
      <div className="min-h-screen py-4 sm:py-6 lg:py-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          {/* Sync Status Indicator */}
          <SyncStatusIndicator 
            syncMetadata={syncMetadata}
            isValidating={isValidating}
            showDebug={true} // process.env.NODE_ENV === 'development'
          />

          {/* Back button */}
          <div className="mb-4 sm:mb-6">
            <Link 
              href="/"
              className="group flex items-center gap-2 text-white/70 hover:text-white/90 font-medium text-shadow-adaptive-sm transition-all text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform icon-shadow-adaptive-sm" />
              Back to challenges
            </Link>
          </div>

          {loading ? (
            <div className="glass-1 rounded-2xl sm:rounded-3xl p-8 sm:p-16 text-center">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-white/70 mx-auto mb-3 sm:mb-4 icon-shadow-adaptive" />
              <p className="text-white/70 text-shadow-adaptive-sm text-sm sm:text-base">Loading challenge...</p>
            </div>
          ) : error || !challenge ? (
            <div className="glass-1 rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 glass-2">
                <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-400 icon-shadow-adaptive" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white/90 mb-3 sm:mb-4 text-shadow-adaptive">Failed to load challenge</h3>
              <p className="text-white/70 mb-4 sm:mb-6 text-shadow-adaptive-sm text-sm sm:text-base">There was an error loading this challenge.</p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <button
                  onClick={debouncedRefresh}
                  disabled={isValidating}
                  className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-b from-red-500 to-pink-500 text-white font-semibold rounded-full hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 text-sm sm:text-base"
                >
                  {isValidating ? 'Retrying...' : 'Try Again'}
                </button>
                <Link 
                  href="/"
                  className="px-4 py-2 sm:px-6 sm:py-3 glass-2 hover:glass-3 text-white font-semibold rounded-full transition-all text-sm sm:text-base"
                >
                  Back to challenges
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Challenge Header */}
              <div className="glass-1 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 shadow-xl">
                <div className="p-4 sm:p-6 lg:p-8">
                  <div className="flex justify-between items-start mb-3 sm:mb-4">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white text-shadow-adaptive">
                      {challenge.custom_name || challenge.name}
                    </h1>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6 text-white/80 mb-3 sm:mb-4 text-xs sm:text-sm">
                    <span className="flex items-center gap-1.5 sm:gap-2">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-300 icon-shadow-adaptive-sm" />
                      <span className="text-shadow-adaptive-sm">Hosted by <span className="font-medium text-white">{challenge.host}</span></span>
                    </span>
                    <span className="flex items-center gap-1.5 sm:gap-2">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-300 icon-shadow-adaptive-sm" />
                      <span className="font-medium text-white text-shadow-adaptive-sm">{challenge.participant_count}</span> participants
                    </span>
                    <span className="flex items-center gap-1.5 sm:gap-2">
                      <Music className="w-4 h-4 sm:w-5 sm:h-5 text-orange-300 icon-shadow-adaptive-sm" />
                      <span className="font-medium text-white text-shadow-adaptive-sm">{challenge.playlists?.length || 0}</span> {challenge.playlists?.length === 1 ? 'map' : 'maps'}
                    </span>
                    {challenge.start_date && challenge.end_date && (
                      <span className="flex items-center gap-1.5 sm:gap-2">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-green-300 icon-shadow-adaptive-sm" />
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

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${
                        challenge.is_active ? 'bg-green-400' : 'bg-gray-400'
                      }`}></span>
                      <span className="text-xs sm:text-sm text-white/90 text-shadow-adaptive-sm">
                        {challenge.is_active ? 'Active Challenge' : 'Inactive Challenge'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-white/70 text-shadow-adaptive-sm">
                        Last updated: {formatUTCDateTime(challenge.updated_at)}
                        {syncMetadata?.is_stale && challenge.is_active && (
                          <span className="text-yellow-300 font-medium flex items-center gap-1 ml-2">
                            <Clock className="w-3 h-3 icon-shadow-adaptive-sm" />
                            Data may be outdated
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <RulesetNote challenge={challenge} rulesetInfo={rulesetInfo} />

              {/* Combined Leaderboard - Special Treatment */}
              {shouldShowCombinedLeaderboard && (
                <div className="mb-6 sm:mb-8">
                  <div className="glass-2 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl border border-purple-400/30">
                    <div className="p-4 sm:p-6 border-b border-white/10" style={{
                      background: 'linear-gradient(to bottom, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.1))'
                    }}>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 sm:p-3 icon-gradient-purple rounded-lg sm:rounded-xl icon-container-purple">
                          <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white icon-shadow-adaptive" />
                        </div>
                        <div>
                          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white text-shadow-adaptive">Combined Leaderboard</h2>
                          <p className="text-white/80 text-xs sm:text-sm mt-0.5 text-shadow-adaptive-sm">
                            Total scores across all {challenge.playlists.length} maps - determines winners
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 sm:p-6">
                      <CombinedLeaderboard 
                        leaderboard={combinedLeaderboard || []} 
                        loading={leaderboardLoading}
                        totalMaps={challenge.playlists.length}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Individual Maps Section */}
              {isSinglePlaylist ? (
                // Single playlist - show scores directly
                <div className="glass-1 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl">
                  {/* Map header */}
                  {challenge.playlists[0] && (
                    <>
                      <div className="p-4 sm:p-6 border-b border-white/10">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-white text-shadow-adaptive mb-1">
                              {challenge.playlists[0].beatmap_title}
                            </h2>
                            <p className="text-white/80 text-sm sm:text-base text-shadow-adaptive-sm">
                              by {challenge.playlists[0].beatmap_artist} [{challenge.playlists[0].beatmap_version}]
                            </p>
                          </div>
                          {challenge.playlists[0].beatmap_difficulty && (
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${getDifficultyColor(challenge.playlists[0].beatmap_difficulty)} shadow-md`}>
                              <Star className="w-4 h-4 fill-current" />
                              <span>{challenge.playlists[0].beatmap_difficulty.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="p-4 sm:p-6">
                        {challenge.playlists[0].scores?.length > 0 ? (
                          <ScoreTable scores={challenge.playlists[0].scores} challenge={challenge} />
                        ) : (
                          <div className="text-center py-8 sm:py-12">
                            <Music className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-white/30 icon-shadow-adaptive" />
                            <p className="text-white/70 text-shadow-adaptive-sm text-sm sm:text-base">No scores submitted yet</p>
                            <p className="text-xs sm:text-sm text-white/60 mt-1 text-shadow-adaptive-sm">Be the first to set a score!</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                // Multiple playlists - show selection UI
                <div className="glass-1 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-white text-shadow-adaptive flex items-center gap-2 sm:gap-3">
                      <Music className="w-5 h-5 sm:w-7 sm:h-7 text-purple-400 icon-shadow-adaptive" />
                      Individual Maps
                    </h2>
                    
                    {/* Controls */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50 icon-shadow-adaptive-sm" />
                        <input
                          type="text"
                          placeholder="Search maps..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="glass-2 text-white text-sm pl-10 pr-4 py-2 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-purple-400 text-shadow-adaptive-sm placeholder-white/50 w-full sm:w-auto"
                        />
                      </div>
                      
                      {/* Sort */}
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-white/70 icon-shadow-adaptive-sm" />
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="glass-2 text-white text-sm px-3 py-2 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-purple-400 text-shadow-adaptive-sm bg-transparent"
                        >
                          <option value="difficulty" className="bg-gray-800 text-white">Sort by Difficulty</option>
                          <option value="participants" className="bg-gray-800 text-white">Sort by Participants</option>
                          <option value="alphabetical" className="bg-gray-800 text-white">Sort Alphabetically</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Playlist List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 max-h-[400px] overflow-y-auto scrollbar-glass">
                    {getSortedAndFilteredPlaylists().map((playlist, index) => {
                      const participantCount = playlist.scores?.length || 0;
                      const isSelected = playlist.id === selectedPlaylistId;
                      
                      return (
                        <button
                          key={playlist.id}
                          onClick={() => setSelectedPlaylistId(playlist.id)}
                          className={`group relative flex items-center gap-3 p-3 rounded-lg transition-all ${
                            isSelected 
                              ? 'glass-2 ring-2 ring-purple-400/60 transform scale-[1.02]' 
                              : 'glass-1 hover:glass-2'
                          }`}
                        >
                          {/* Map thumbnail */}
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                            {playlist.beatmap_cover_url ? (
                              <>
                                <img
                                  src={playlist.beatmap_cover_url}
                                  alt=""
                                  className="absolute inset-0 w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-b from-purple-600/40 to-pink-600/40 hidden items-center justify-center">
                                  <Music className="w-6 h-6 text-white/50 icon-shadow-adaptive-sm" />
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full bg-gradient-to-b from-purple-600/40 to-pink-600/40 flex items-center justify-center">
                                <Music className="w-6 h-6 text-white/50 icon-shadow-adaptive-sm" />
                              </div>
                            )}
                          </div>
                          
                          {/* Map info */}
                          <div className="flex-1 min-w-0 text-left">
                            <h3 className="font-semibold text-white text-sm line-clamp-1 text-shadow-adaptive mb-0.5">
                              {playlist.beatmap_title}
                            </h3>
                            <p className="text-xs text-white/70 line-clamp-1 text-shadow-adaptive-sm">
                              {playlist.beatmap_artist} [{playlist.beatmap_version}]
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              {playlist.beatmap_difficulty && (
                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${getDifficultyColor(playlist.beatmap_difficulty)}`}>
                                  <Star className="w-3 h-3 fill-current" />
                                  {playlist.beatmap_difficulty.toFixed(1)}
                                </div>
                              )}
                              <span className="text-xs text-white/60 flex items-center gap-1 text-shadow-adaptive-sm">
                                <Users className="w-3 h-3 icon-shadow-adaptive-sm" />
                                {participantCount}
                              </span>
                            </div>
                          </div>
                          
                          {/* Selection indicator */}
                          {isSelected && (
                            <ChevronRight className="w-5 h-5 text-purple-400 icon-shadow-adaptive" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Playlist Scores */}
                  <div className="border-t border-white/10 pt-6">
                    {selectedPlaylist ? (
                      <>
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-white mb-1 text-shadow-adaptive">
                            {selectedPlaylist.beatmap_title}
                          </h3>
                          <p className="text-sm text-white/80 text-shadow-adaptive-sm">
                            by {selectedPlaylist.beatmap_artist} [{selectedPlaylist.beatmap_version}]
                          </p>
                        </div>
                        {selectedPlaylist.scores?.length > 0 ? (
                          <ScoreTable scores={selectedPlaylist.scores} challenge={challenge} />
                        ) : (
                          <div className="text-center py-8">
                            <Music className="w-10 h-10 mx-auto mb-3 text-white/30 icon-shadow-adaptive" />
                            <p className="text-white/70 text-shadow-adaptive-sm">No scores submitted yet</p>
                            <p className="text-xs text-white/60 mt-1 text-shadow-adaptive-sm">Be the first to set a score!</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <Music className="w-10 h-10 mx-auto mb-3 text-white/30 icon-shadow-adaptive" />
                        <p className="text-white/70 text-shadow-adaptive-sm">Select a map to view scores</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Footer Status */}
              <div className="mt-8 sm:mt-12 text-center pb-4 sm:pb-8">
                <div className="inline-flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-3 glass-1 rounded-full shadow-md">
                  <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    syncMetadata?.sync_in_progress ? 'bg-blue-500 animate-pulse' : 
                    syncMetadata?.is_stale && challenge?.is_active ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  <p className="text-xs sm:text-sm text-white/90 font-medium text-shadow-adaptive-sm">
                    {syncMetadata?.sync_in_progress ? 'Fetching latest scores from osu!...' : 
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