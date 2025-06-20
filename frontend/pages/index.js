import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import ChallengeCard from '../components/ChallengeCard';
import SeasonSelector from '../components/SeasonSelector';
import { Loader2, Trophy, History, Calendar, Sparkles } from 'lucide-react';
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
        <div className="mb-16">
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
          <p className="text-neutral-600 text-lg mb-10 max-w-2xl">
            Jump into any of our currently active challenges and compete with players worldwide for the top spots!
          </p>

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
                <Trophy className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-red-700 mb-6 font-medium">Failed to load challenges: {error}</p>
              <button 
                onClick={fetchInitialData}
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
            /* Responsive grid for active challenges */
            <div className="grid gap-8">
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

        {/* History Section */}
        <div className="border-t border-neutral-200 pt-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
            <div className="flex items-center gap-3">
              <History className="w-7 h-7 text-neutral-600" />
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
            <div className="mb-8">
              <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-2xl p-6 border border-primary-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-neutral-800 mb-2">
                      {selectedSeason.name}
                    </h3>
                    <p className="text-neutral-600">
                      {new Date(selectedSeason.start_date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })} 
                      {' - '}
                      {new Date(selectedSeason.end_date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                  {selectedSeason.is_current && (
                    <span className="px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 text-sm font-semibold rounded-full border border-green-200 shadow-sm self-start">
                      Current Season
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Historical challenges organized by season */}
          {Object.keys(historicalChallenges).length > 0 ? (
            <div className="space-y-12">
              {Object.entries(historicalChallenges).map(([seasonName, { season, challenges }]) => (
                <div key={seasonName} className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-primary-500" />
                    <h3 className="text-2xl font-bold text-neutral-800">{seasonName}</h3>
                    <span className="px-3 py-1 bg-neutral-100 text-neutral-600 text-sm font-medium rounded-full border border-neutral-200">
                      {challenges.length} challenge{challenges.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {/* Responsive grid for historical challenges */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {challenges.map(challenge => (
                      <Link key={challenge.id} href={`/challenges/${challenge.room_id}`}>
                        <div className="h-full">
                          <ChallengeCard 
                            challenge={challenge} 
                            size="small"
                            challengeType={getChallengeType(challenge)}
                            showSeasonBadge={true}
                          />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
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

        {/* Footer note */}
        <div className="mt-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 rounded-full border border-neutral-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-neutral-600 font-medium">
              Challenge data updates automatically
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}