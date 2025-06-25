import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import ChallengeCard from '../components/ChallengeCard';
import SeasonSelector from '../components/SeasonSelector';
import { Loader2, Trophy, History, Calendar, Sparkles, RefreshCw, ChevronDown, ChevronRight, Users, MapPin, Clock, Info } from 'lucide-react';
import { seasonUtils } from '../lib/seasons';
import globalUpdateTracker, { shouldUpdateChallenge, markChallengeUpdated } from '../lib/global-update-tracker';

export default function Home() {
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [historicalChallenges, setHistoricalChallenges] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Smart update states
  const [updatingChallenges, setUpdatingChallenges] = useState(new Set());
  const [allUpdatesComplete, setAllUpdatesComplete] = useState(false);
  
  // History section state
  const [expandedSeasons, setExpandedSeasons] = useState(new Set());

  // Constants
  const UPDATE_THRESHOLD = 4 * 60 * 1000; // 4 minutes in milliseconds

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
      
      // Step 1: Fetch fresh data from Supabase (fast)
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
        const challenges = activeChallengesData.challenges || [];
        setActiveChallenges(challenges);
        
        // Step 2: Check which challenges need osu! API updates
        await checkAndUpdateStaleData(challenges);
      }
      
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkAndUpdateStaleData = async (challenges) => {
    const challengesToUpdate = challenges.filter(challenge => shouldUpdateChallenge(challenge));

    if (challengesToUpdate.length === 0) {
      console.log('✅ All challenges are up to date (checked globally)');
      return;
    }

    console.log(`🔄 Found ${challengesToUpdate.length} challenges that need osu! API updates (global check)`);
    
    // Update challenges one by one to avoid API rate limits
    for (const challenge of challengesToUpdate) {
      await updateSingleChallenge(challenge);
      
      // Small delay between updates to be gentle on APIs
      if (challengesToUpdate.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setAllUpdatesComplete(true);
    setTimeout(() => setAllUpdatesComplete(false), 3000);
  };

  const updateSingleChallenge = async (challenge) => {
    const challengeId = challenge.room_id;
    
    try {
      // Add to updating set
      setUpdatingChallenges(prev => new Set([...prev, challengeId]));
      
      console.log(`🚀 Updating challenge ${challengeId} via osu! API...`);
      
      const response = await fetch('/api/update-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: challengeId })
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ Challenge ${challengeId} updated successfully`);
        
        // Mark as updated globally
        markChallengeUpdated(challengeId);
        
        // Refresh the challenge data from Supabase
        await refreshSingleChallengeData(challengeId);
      } else {
        console.error(`❌ Failed to update challenge ${challengeId}:`, result.error);
      }
    } catch (error) {
      console.error(`❌ Error updating challenge ${challengeId}:`, error);
    } finally {
      // Remove from updating set
      setUpdatingChallenges(prev => {
        const newSet = new Set(prev);
        newSet.delete(challengeId);
        return newSet;
      });
    }
  };

  const refreshSingleChallengeData = async (challengeId) => {
    try {
      const response = await fetch(`/api/challenges/${challengeId}`);
      if (!response.ok) return;
      
      const data = await response.json();
      if (data.success && data.challenge) {
        // Update the specific challenge in our state
        setActiveChallenges(prev => prev.map(c => 
          c.room_id === challengeId ? { ...c, ...data.challenge } : c
        ));
      }
    } catch (error) {
      console.error(`Failed to refresh challenge ${challengeId} data:`, error);
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
        setHistoricalChallenges(data.challenges || []);
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

  const backgroundImage = null;
  const filteredChallenges = getFilteredChallenges(historicalChallenges);
  const hasUpdatingChallenges = updatingChallenges.size > 0;

  return (
    <Layout backgroundImage={backgroundImage}>
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

          {/* Show updating status */}
          {hasUpdatingChallenges && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                <div>
                  <p className="text-blue-800 font-medium">🔄 Fetching latest scores from osu!...</p>
                  <p className="text-blue-600 text-sm">
                    Updating {updatingChallenges.size} challenge{updatingChallenges.size !== 1 ? 's' : ''} with fresh data
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Show completion status */}
          {allUpdatesComplete && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
              <div className="flex items-center">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-green-800 font-medium">✅ All challenges updated with latest data!</p>
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
              {activeChallenges.map(challenge => {
                const isUpdating = updatingChallenges.has(challenge.room_id);
                return (
                  <Link key={challenge.id} href={`/challenges/${challenge.room_id}`}>
                    <div className={`transform transition-all duration-300 ${isUpdating ? 'opacity-75' : ''}`}>
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

        {/* History Section - Keep as is */}
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

          {filteredChallenges.length > 0 ? (
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
                      // Add this line to prioritize custom names (same as ChallengeCard)
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
                              </div>
                            </Link>
                          </td>
                          {/* Rest of the table cells remain the same */}
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
            <div className={`w-2 h-2 rounded-full ${hasUpdatingChallenges ? 'bg-blue-500 animate-pulse' : 'bg-green-500 animate-pulse'}`}></div>
            <p className="text-sm text-neutral-600 font-medium">
              {hasUpdatingChallenges ? 'Fetching latest scores...' : 'Data updates when you visit the page'}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}