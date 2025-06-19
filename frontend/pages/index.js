import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import ChallengeCard from '../components/ChallengeCard';
import SeasonSelector from '../components/SeasonSelector';
import { Loader2, Trophy, History, Calendar } from 'lucide-react';
import { seasonUtils } from '../lib/seasons';

export default function Home() {
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [historicalChallenges, setHistoricalChallenges] = useState({});
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      setLoading(true);
      
      // Fetch current season and active challenges
      const [seasonResponse, activeChallengesResponse] = await Promise.all([
        fetch('/api/seasons/current'),
        fetch('/api/challenges?active=true')
      ]);
      
      if (!seasonResponse.ok || !activeChallengesResponse.ok) {
        throw new Error('Failed to fetch initial data');
      }
      
      const [seasonData, activeChallengesData] = await Promise.all([
        seasonResponse.json(),
        activeChallengesResponse.json()
      ]);
      
      if (seasonData.success && seasonData.season) {
        setCurrentSeason(seasonData.season);
        setSelectedSeason(seasonData.season);
      }
      
      if (activeChallengesData.success) {
        setActiveChallenges(activeChallengesData.challenges || []);
      }
      
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalChallenges = async (seasonId) => {
    try {
      const response = await fetch(`/api/challenges?season_id=${seasonId}&active=false`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch historical challenges');
      }
      
      const data = await response.json();
      
      if (data.success) {
        const grouped = seasonUtils.groupChallengesBySeason(data.challenges || []);
        setHistoricalChallenges(grouped);
      }
    } catch (err) {
      console.error('Historical challenges fetch error:', err);
    }
  };

  const handleSeasonChange = (season) => {
    setSelectedSeason(season);
  };

  // Check if challenge is weekly (1 map) or monthly (multiple maps)
  const getChallengeType = (challenge) => {
    const mapCount = challenge.playlists?.length || 0;
    return mapCount === 1 ? 'weekly' : 'monthly';
  };

  // No background image for the page itself
  const backgroundImage = null;

  return (
    <Layout backgroundImage={backgroundImage}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Active Challenges Section */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-6 h-6 text-primary-600" />
            <h1 className="text-4xl font-bold text-neutral-800">
              Active Challenges
            </h1>
            {activeChallenges.length > 0 && (
              <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                {activeChallenges.length} Active
              </span>
            )}
          </div>
          <p className="text-neutral-600 text-lg mb-8">
            Join any of our currently active challenges and compete for the top spots!
          </p>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : error ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <p className="text-red-600 mb-4">Failed to load challenges: {error}</p>
              <button 
                onClick={fetchInitialData}
                className="btn-primary"
              >
                Retry
              </button>
            </div>
          ) : activeChallenges.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Trophy className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600 mb-6 text-lg">No active challenges at the moment</p>
              <p className="text-neutral-500 text-sm">Check back soon for new challenges!</p>
            </div>
          ) : (
            /* Large cards for active challenges - each takes full width or half width */
            <div className="space-y-6">
              {activeChallenges.map(challenge => (
                <Link key={challenge.id} href={`/challenges/${challenge.room_id}`}>
                  <div className="group">
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

        {/* History Section */}
        <div className="border-t border-neutral-200 pt-12">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <History className="w-6 h-6 text-neutral-600" />
              <h2 className="text-3xl font-bold text-neutral-800">
                Challenge History
              </h2>
            </div>
            <SeasonSelector 
              onSeasonChange={handleSeasonChange}
              currentSeasonId={selectedSeason?.id}
            />
          </div>

          {selectedSeason && (
            <div className="mb-6">
              <div className="glass-card rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-neutral-800">
                      {selectedSeason.name}
                    </h3>
                    <p className="text-sm text-neutral-600">
                      {new Date(selectedSeason.start_date).toLocaleDateString()} - {new Date(selectedSeason.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedSeason.is_current && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                      Current Season
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Historical challenges organized by season */}
          {Object.keys(historicalChallenges).length > 0 ? (
            <div className="space-y-8">
              {Object.entries(historicalChallenges).map(([seasonName, { season, challenges }]) => (
                <div key={seasonName}>
                  <h3 className="text-xl font-semibold text-neutral-700 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {seasonName}
                    <span className="text-sm text-neutral-500 font-normal">
                      ({challenges.length} challenge{challenges.length !== 1 ? 's' : ''})
                    </span>
                  </h3>
                  {/* Small cards for historical challenges */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {challenges.map(challenge => (
                      <Link key={challenge.id} href={`/challenges/${challenge.room_id}`}>
                        <ChallengeCard 
                          challenge={challenge} 
                          size="small"
                          challengeType={getChallengeType(challenge)}
                          showSeasonBadge={true}
                        />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-12 text-center">
              <History className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600 mb-2">No challenges found for this season</p>
              <p className="text-neutral-500 text-sm">
                {selectedSeason?.is_current 
                  ? 'Challenges will appear here as they are completed'
                  : 'This season had no completed challenges'
                }
              </p>
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="mt-16 text-center">
          <p className="text-sm text-neutral-500">
            Challenge data updates automatically
          </p>
        </div>
      </div>
    </Layout>
  );
}