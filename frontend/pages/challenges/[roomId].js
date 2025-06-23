import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import useSWR from 'swr';
import Layout from '../../components/Layout';
import ScoreTable from '../../components/ScoreTable';
import CombinedLeaderboard from '../../components/CombinedLeaderboard';
import { challengeQueries } from '../../lib/supabase';
import { ArrowLeft, Loader2, Users, Calendar, Music, Star, Trophy } from 'lucide-react';
import { shouldUpdateChallenge, markChallengeUpdated } from '../../lib/global-update-tracker';

const fetcher = (roomId) => challengeQueries.getChallengeDetails(roomId);
const leaderboardFetcher = ([_, challengeId]) => challengeQueries.getChallengeLeaderboard(challengeId);

// Constants
const UPDATE_THRESHOLD = 4 * 60 * 1000; // 4 minutes in milliseconds

// Fixed UTC time formatting function
const formatUTCDateTime = (utcDateString) => {
  if (!utcDateString) return 'N/A';
  
  // Ensure the string is treated as UTC by appending 'Z' if not present
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
  // Use osu!'s difficulty ranges but map to Tailwind classes
  if (difficulty < 1.25) return 'text-blue-700 bg-blue-100 border-blue-200'; // Easy (Blue)
  if (difficulty < 2.0) return 'text-cyan-700 bg-cyan-100 border-cyan-200'; // Easy-Normal (Cyan)
  if (difficulty < 2.5) return 'text-green-700 bg-green-100 border-green-200'; // Normal (Green)
  if (difficulty < 3.3) return 'text-lime-700 bg-lime-100 border-lime-200'; // Normal-Hard (Lime)
  if (difficulty < 4.2) return 'text-yellow-700 bg-yellow-100 border-yellow-200'; // Hard (Yellow)
  if (difficulty < 4.9) return 'text-orange-700 bg-orange-100 border-orange-200'; // Hard-Insane (Orange)
  if (difficulty < 5.8) return 'text-red-700 bg-red-100 border-red-200'; // Insane (Red)
  if (difficulty < 6.7) return 'text-pink-700 bg-pink-100 border-pink-200'; // Insane-Expert (Pink/Purple)
  if (difficulty < 7.7) return 'text-purple-700 bg-purple-100 border-purple-200'; // Expert (Purple)
  return 'text-indigo-700 bg-indigo-100 border-indigo-200'; // Expert+ (Dark Blue)
};

export default function ChallengeDetail() {
  const router = useRouter();
  const { roomId } = router.query;
  
  // Smart refresh states
  const [isUpdatingChallenge, setIsUpdatingChallenge] = useState(false);
  const [updateComplete, setUpdateComplete] = useState(false);
  
  const { data: challenge, error, isLoading, mutate } = useSWR(
    roomId ? ['challenge', roomId] : null,
    () => fetcher(roomId),
    {
      revalidateOnFocus: false,
      onSuccess: (data) => {
        // After getting data from Supabase, check if we need to update from osu! API
        if (data && data.is_active) {
          checkAndUpdateIfStale(data);
        }
      }
    }
  );

  // Fetch combined leaderboard when we have a challenge with multiple maps that have scores
  const shouldShowCombinedLeaderboard = challenge && challenge.playlists && 
    challenge.playlists.filter(p => p.scores && p.scores.length > 0).length >= 2;

  const { data: combinedLeaderboard, isLoading: leaderboardLoading } = useSWR(
    shouldShowCombinedLeaderboard ? ['leaderboard', challenge.id] : null,
    leaderboardFetcher,
    {
      revalidateOnFocus: false,
    }
  );

  // Check if challenge data needs updating from osu! API
  const checkAndUpdateIfStale = async (challengeData) => {
  if (!challengeData || !challengeData.is_active || isUpdatingChallenge) {
    return;
  }

  if (shouldUpdateChallenge(challengeData)) {
    console.log(`🔄 Challenge needs osu! API update (global check)`);
    await updateChallengeFromOsuAPI(challengeData.room_id);
  } else {
    console.log(`✅ Challenge is up to date (global check)`);
  }
};

  // Update challenge data from osu! API
  const updateChallengeFromOsuAPI = async (roomId) => {
  try {
    setIsUpdatingChallenge(true);
    
    console.log(`🚀 Calling osu! API to update challenge ${roomId}...`);
    
    const response = await fetch('/api/update-challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId })
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✅ Challenge ${roomId} updated successfully from osu! API`);
      
      // Mark as updated globally
      markChallengeUpdated(roomId);
      
      // Show success indicator
      setUpdateComplete(true);
      setTimeout(() => setUpdateComplete(false), 3000);
      
      // Refresh the data from Supabase
      await mutate();
    } else {
      console.error(`❌ Failed to update challenge ${roomId}:`, result.error);
    }
  } catch (error) {
    console.error(`❌ Error updating challenge ${roomId}:`, error);
  } finally {
    setIsUpdatingChallenge(false);
  }
};

  // Check if data appears stale (for UI indicator)
  const isDataStale = challenge && challenge.updated_at && challenge.is_active &&
    (Date.now() - getUTCTimestamp(challenge.updated_at)) > UPDATE_THRESHOLD;

  if (!roomId) return null;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back button */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-6 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to challenges
        </Link>

        {/* Update status indicators */}
        {isUpdatingChallenge && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
              <div>
                <p className="text-blue-800 font-medium">🔄 Fetching latest scores from osu!...</p>
                <p className="text-blue-600 text-sm">Getting fresh challenge data</p>
              </div>
            </div>
          </div>
        )}

        {updateComplete && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
            <div className="flex items-center">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-green-800 font-medium">✅ Challenge updated with latest data!</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : error || !challenge ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <p className="text-red-600 mb-4">Failed to load challenge</p>
            <Link 
              href="/"
              className="btn-primary inline-block"
            >
              Back to challenges
            </Link>
          </div>
        ) : (
          <>
            {/* Challenge header */}
            <div className="glass-card rounded-2xl p-8 mb-8">
              <div className="mb-6">
                <div className="flex justify-between items-start mb-3">
                  <h1 className="text-4xl font-bold text-neutral-800">{challenge.name}</h1>
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
                  
                  <div className="text-xs text-gray-500">
                    Last updated: {formatUTCDateTime(challenge.updated_at)}
                    {isDataStale && !isUpdatingChallenge && (
                      <span className="text-yellow-600 ml-2">⚠️ Data may be outdated</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

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
                              transform: 'scale(1.1)' // Prevent blur edges from showing
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
                                // Fallback to cover URL if list/card URLs fail
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
                      <ScoreTable scores={playlist.scores} />
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

            {/* Update indicator */}
            <div className="mt-8 text-center text-sm text-neutral-500">
              {isUpdatingChallenge ? 
                'Fetching latest data from osu!...' : 
                'Data updates automatically when you visit this page'
              }
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}