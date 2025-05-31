import { useRouter } from 'next/router';
import Link from 'next/link';
import useSWR from 'swr';
import Layout from '../../components/Layout';
import ScoreTable from '../../components/ScoreTable';
import { challengeQueries } from '../../lib/supabase';
import { ArrowLeft, Loader2, Users, Calendar, Music } from 'lucide-react';

const fetcher = (roomId) => challengeQueries.getChallengeDetails(roomId);

export default function ChallengeDetail() {
  const router = useRouter();
  const { roomId } = router.query;
  
  const { data: challenge, error, isLoading } = useSWR(
    roomId ? ['challenge', roomId] : null,
    () => fetcher(roomId),
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: false,
    }
  );

  if (!roomId) return null;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back button */}
        <Link href="/">
          <a className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to challenges
          </a>
        </Link>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : error || !challenge ? (
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">Failed to load challenge</p>
            <Link href="/">
              <a className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors inline-block">
                Back to challenges
              </a>
            </Link>
          </div>
        ) : (
          <>
            {/* Challenge header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-3">{challenge.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-gray-400">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  Hosted by {challenge.host}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {challenge.participant_count} participants
                </span>
                <span className="flex items-center gap-1">
                  <Music className="w-4 h-4" />
                  {challenge.playlists?.length || 0} maps
                </span>
                {challenge.start_date && challenge.end_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(challenge.start_date).toLocaleDateString()} - {new Date(challenge.end_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Playlists */}
            <div className="space-y-8">
              {challenge.playlists?.map((playlist, index) => (
                <div key={playlist.id} className="bg-black/30 rounded-xl p-6 border border-purple-500/30">
                  <div className="mb-4">
                    <h2 className="text-xl font-bold mb-1">
                      {index + 1}. {playlist.beatmap_title}
                    </h2>
                    <p className="text-gray-400">
                      by {playlist.beatmap_artist} • {playlist.beatmap_version}
                    </p>
                  </div>

                  {playlist.scores?.length > 0 ? (
                    <ScoreTable scores={playlist.scores} />
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      No scores submitted yet
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Update indicator */}
            <div className="mt-8 text-center text-sm text-gray-500">
              Data updates automatically every minute
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}