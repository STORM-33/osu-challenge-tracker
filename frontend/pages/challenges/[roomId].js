import { useRouter } from 'next/router';
import Link from 'next/link';
import useSWR from 'swr';
import Layout from '../../components/Layout';
import ScoreTable from '../../components/ScoreTable';
import { challengeQueries } from '../../lib/supabase';
import { useAutoUpdateChallenge } from '../../hooks/useAPI';
import { ArrowLeft, Loader2, Users, Calendar, Music, Star } from 'lucide-react';

const fetcher = (roomId) => challengeQueries.getChallengeDetails(roomId);

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
  
  const { data: challenge, error, isLoading, mutate } = useSWR(
    roomId ? ['challenge', roomId] : null,
    () => fetcher(roomId),
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: false,
    }
  );

  // Auto-update hook with proper mutate callback
  const { isUpdating } = useAutoUpdateChallenge(challenge, {
    autoUpdate: true,
    delay: 2000,
    onUpdate: (updatedData) => {
      console.log('Before update - updated_at:', challenge?.updated_at);
      console.log('After update - updated_at:', updatedData?.updated_at);
      // Force refresh after update to get latest data including updated_at
      mutate();
    }
  });

  // Fixed stale data detection using proper UTC comparison
  const isDataStale = challenge && challenge.updated_at && challenge.is_active &&
    (Date.now() - getUTCTimestamp(challenge.updated_at)) > 10 * 60 * 1000;

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

        {/* Auto-update status indicator */}
        {isUpdating && (
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-blue-700">🔄 Refreshing challenge data...</span>
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

                {/* Fixed data freshness indicator */}
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
                    {isDataStale && (
                      <span className="text-yellow-600 ml-2">⚠️ Data may be outdated</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

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
              Data updates automatically when you visit this page
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}