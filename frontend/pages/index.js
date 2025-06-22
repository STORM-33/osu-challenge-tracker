import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import ChallengeCard from '../components/ChallengeCard';
import SeasonSelector from '../components/SeasonSelector';
import { Loader2, Trophy, History, Calendar, Sparkles, RefreshCw, ChevronDown, ChevronRight, Users, MapPin, Clock } from 'lucide-react';
import { seasonUtils } from '../lib/seasons';
import { useAutoUpdateActiveChallenges } from '../hooks/useAPI';

export default function Home() {
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [historicalChallenges, setHistoricalChallenges] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // History section state
  const [expandedSeasons, setExpandedSeasons] = useState(new Set());

  // Auto-update hook for active challenges
  const { isUpdating } = useAutoUpdateActiveChallenges(activeChallenges, {
    autoUpdate: true,
    delay: 3000,
    maxUpdates: 3,
    loading: loading
  });

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
        // Store challenges as flat array instead of grouped by season
        setHistoricalChallenges(data.challenges || []);
        // Auto-expand current season
        if (selectedSeason?.is_current) {
          setExpandedSeasons(new Set([selectedSeason.name]));
        }
      }
    } catch (err) {
      console.error('Historical challenges fetch error:', err);
    }
  };

  const handleSeasonChange = (season) => {
    setSelectedSeason(season);
  };

  const getChallengeType = (challenge) => {
    const mapCount = challenge.playlists?.length || 0;
    return mapCount === 1 ? 'weekly' : 'monthly';
  };

  const toggleSeasonExpansion = (seasonName) => {
    const newExpanded = new Set(expandedSeasons);
    if (newExpanded.has(seasonName)) {
      newExpanded.delete(seasonName);
    } else {
      newExpanded.add(seasonName);
    }
    setExpandedSeasons(newExpanded);
  };

  // Sort historical challenges
  const getFilteredChallenges = (challenges) => {
    return challenges
      .sort((a, b) => {
        // Sort by end date (most recent first), fallback to start date, then creation date
        const dateA = new Date(a.end_date || a.start_date || a.created_at || 0);
        const dateB = new Date(b.end_date || b.start_date || b.created_at || 0);
        return dateB.getTime() - dateA.getTime();
      });
  };

  // Group filtered challenges by their season for display
  const groupChallengesBySeason = (challenges) => {
    const grouped = {};
    challenges.forEach(challenge => {
      // Use the selected season data for grouping
      const seasonKey = selectedSeason?.name || 'Unknown Season';
      if (!grouped[seasonKey]) {
        grouped[seasonKey] = {
          season: selectedSeason,
          challenges: []
        };
      }
      grouped[seasonKey].challenges.push(challenge);
    });
    return grouped;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const needsUpdateCount = activeChallenges.filter(challenge => {
    if (!challenge.updated_at) return true;
    const lastUpdated = new Date(challenge.updated_at).getTime();
    return Date.now() - lastUpdated > 5 * 60 * 1000;
  }).length;

  const backgroundImage = null;

  // Get sorted challenges for display
  const filteredChallenges = getFilteredChallenges(historicalChallenges);

  return (
    <Layout backgroundImage={backgroundImage}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Active Challenges Section - Keep as is */}
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

          {isUpdating && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600 mr-3"></div>
                <div>
                  <p className="text-amber-800 font-medium">🔄 Refreshing challenge data...</p>
                  <p className="text-amber-600 text-sm">
                    Updating {needsUpdateCount} challenges that haven't been refreshed recently
                  </p>
                </div>
              </div>
            </div>
          )}

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
            <div className="grid gap-8">
              {activeChallenges.map(challenge => (
                <Link key={challenge.id} href={`/challenges/${challenge.room_id}`}>
                  <div className="transform transition-all duration-300">
                    <ChallengeCard 
                      challenge={challenge} 
                      size="large"
                      challengeType={getChallengeType(challenge)}
                      showBackground={true}
                      onUpdate={fetchInitialData}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Redesigned History Section */}
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

          {/* Selected Season Info Banner */}
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

          {/* Historical Challenges */}
          {filteredChallenges.length > 0 ? (
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              {/* Compact Table View */}
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
                      return (
                        <tr key={challenge.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="px-6 py-4">
                            <Link href={`/challenges/${challenge.room_id}`}>
                              <div className="cursor-pointer">
                                <div className="font-medium text-neutral-800 hover:text-primary-600 transition-colors">
                                  {challenge.name || `Challenge #${challenge.id}`}
                                </div>
                                {challenge.description && (
                                  <div className="text-sm text-neutral-500 truncate max-w-xs">
                                    {challenge.description}
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