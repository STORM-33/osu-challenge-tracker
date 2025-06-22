import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Plus, Loader2, CheckCircle, AlertCircle, Settings, RefreshCw, Zap, Users, Calendar, Music } from 'lucide-react';
import { auth } from '../lib/supabase';
import { useChallengeAutoUpdate } from '../hooks/useAPI';
import { useRouter } from 'next/router';

// Fixed UTC time formatting function (same as challenge detail page)
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

// Helper to get UTC timestamp from UTC string (same as challenge detail page)
const getUTCTimestamp = (utcDateString) => {
  if (!utcDateString) return null;
  const utcString = utcDateString.endsWith('Z') ? utcDateString : `${utcDateString}Z`;
  return new Date(utcString).getTime();
}

export default function Admin() {
  const [roomId, setRoomId] = useState('');
  const [customName, setCustomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeChallenges, setActiveChallenges] = useState([]); 
  const [updateResults, setUpdateResults] = useState(null);
  const [updatingChallenges, setUpdatingChallenges] = useState(new Set());
  const router = useRouter();

  // Get the auto-update functions
  const { updateActiveChallenges, isUpdating } = useChallengeAutoUpdate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  // Load active challenges for admin management
  useEffect(() => {
    if (user?.admin) {
      loadActiveChallenges();
    }
  }, [user]);

  const checkAdminAccess = async () => {
    try {
      const userData = await auth.getCurrentUser();
      if (!userData) {
        router.push('/');
        return;
      }
      
      if (!userData.admin) {
        router.push('/');
        return;
      }
      
      setUser(userData);
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/');
    } finally {
      setCheckingAuth(false);
    }
  };

  // Function to load active challenges with proper refresh
  const loadActiveChallenges = async () => {
    try {
      const response = await fetch('/api/challenges?active=true');
      const data = await response.json();
      
      if (data.success) {
        setActiveChallenges(data.challenges || []);
      }
    } catch (error) {
      console.error('Failed to load active challenges:', error);
    }
  };

  // Function to update all active challenges
  const handleUpdateAllActive = async () => {
    if (activeChallenges.length === 0) {
      setUpdateResults({ success: false, error: 'No active challenges to update' });
      return;
    }

    const result = await updateActiveChallenges(activeChallenges, { 
      force: true, // Force update even if recently updated
      maxUpdates: 10
    });
    
    setUpdateResults(result);
    
    // Force refresh the challenges list after update (similar to challenge detail page)
    setTimeout(() => {
      loadActiveChallenges();
    }, 2000);
  };

  // Function to update a single challenge with proper refresh
  const handleUpdateSingleChallenge = async (roomId) => {
    // Add challenge to updating set
    setUpdatingChallenges(prev => new Set(prev).add(roomId));
    
    try {
      const response = await fetch('/api/update-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setUpdateResults({
          success: true,
          message: `Successfully updated challenge ${roomId}`,
          updated: 1,
          total: 1,
          skipped: 0
        });
        
        // Force refresh the challenges list immediately after update
        setTimeout(() => {
          loadActiveChallenges();
        }, 1000);
      } else {
        setUpdateResults({
          success: false,
          error: result.error || 'Update failed'
        });
      }
    } catch (error) {
      setUpdateResults({
        success: false,
        error: error.message
      });
    } finally {
      // Remove challenge from updating set
      setUpdatingChallenges(prev => {
        const newSet = new Set(prev);
        newSet.delete(roomId);
        return newSet;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!roomId.trim()) {
      setResult({ success: false, message: 'Please enter a room ID' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomId: parseInt(roomId),
          custom_name: customName.trim() || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: `Successfully added challenge: ${data.challenge.custom_name || data.challenge.name}`,
          challenge: data.challenge
        });
        setRoomId('');
        setCustomName('');
        
        // Refresh active challenges list
        setTimeout(() => {
          loadActiveChallenges();
        }, 1000);
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to add challenge'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-neutral-800">Admin Panel</h1>
          </div>
          <p className="text-neutral-600">
            Welcome, {user?.username}! Manage challenges and seasons from here.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Add Challenge Section */}
          <div className="glass-card rounded-xl p-6 border border-primary-200">
            <div className="flex items-center gap-2 mb-6">
              <Plus className="w-6 h-6 text-primary-600" />
              <h2 className="text-xl font-semibold text-neutral-800">Add New Challenge</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="roomId" className="block text-sm font-medium mb-2 text-neutral-700">
                  osu! Multiplayer Room ID *
                </label>
                <input
                  type="text"
                  id="roomId"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="e.g., 1392361"
                  className="w-full px-4 py-3 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                  disabled={loading}
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Find the room ID in the URL: osu.ppy.sh/multiplayer/rooms/<strong>1392361</strong>
                </p>
              </div>

              <div>
                <label htmlFor="customName" className="block text-sm font-medium mb-2 text-neutral-700">
                  Custom Display Name
                </label>
                <input
                  type="text"
                  id="customName"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Override the default room name (optional)"
                  className="w-full px-4 py-3 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                  disabled={loading}
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Leave empty to use the original room name from osu!
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !roomId.trim()}
                className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-neutral-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-all font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Adding Challenge...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Add Challenge
                  </>
                )}
              </button>
            </form>

            {result && (
              <div className={`mt-6 p-4 rounded-lg flex items-start gap-3 ${
                result.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={result.success ? 'text-green-800' : 'text-red-800'}>
                    {result.message}
                  </p>
                  {result.challenge && (
                    <div className="mt-2 text-sm text-neutral-600">
                      <p>Room ID: {result.challenge.room_id}</p>
                      <p>Host: {result.challenge.host}</p>
                      {result.challenge.custom_name && (
                        <p>Custom Name: {result.challenge.custom_name}</p>
                      )}
                      <p className="text-green-600 font-medium">✅ Active Challenge</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Active Challenge Management Section */}
          <div className="glass-card rounded-xl p-6 border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-neutral-800">Active Challenge Management</h2>
              </div>
              <button
                onClick={handleUpdateAllActive}
                disabled={isUpdating || activeChallenges.length === 0}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Update All</span>
                  </>
                )}
              </button>
            </div>
            {activeChallenges.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                <p className="text-neutral-500">No active challenges</p>
                <p className="text-sm text-neutral-400 mt-1">Add a new challenge to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeChallenges.map(challenge => {
                  // Fixed stale data detection using proper UTC comparison
                  const lastUpdated = getUTCTimestamp(challenge.updated_at);
                  const isStale = lastUpdated && (Date.now() - lastUpdated) > 10 * 60 * 1000; // 10 minutes
                  const needsUpdate = lastUpdated && (Date.now() - lastUpdated) > 5 * 60 * 1000; // 5 minutes
                  
                  return (
                    <div key={challenge.id} className="p-3 bg-white/80 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-1">
                            <h4 className="font-medium text-neutral-800 text-sm flex-1 leading-tight">{challenge.name}</h4>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-neutral-600">
                            <span>Room ID: <span className="font-mono">{challenge.room_id}</span></span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {challenge.host}
                            </span>
                            <span>{challenge.participant_count || 0} participants</span>
                            <span>{challenge.playlists?.length || 0} maps</span>
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">
                            Last updated: {formatUTCDateTime(challenge.updated_at)}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleUpdateSingleChallenge(challenge.room_id)}
                          disabled={isUpdating || updatingChallenges.has(challenge.room_id)}
                          className={`ml-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border flex items-center gap-1 ${
                            isStale 
                              ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100' 
                              : needsUpdate
                              ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                              : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {updatingChallenges.has(challenge.room_id) ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                          <span>Update</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Notes */}
        <div className="mt-8 p-4 bg-neutral-50 rounded-lg">
          <h4 className="font-medium text-neutral-800 mb-2">Important Notes:</h4>
          <ul className="text-sm text-neutral-600 space-y-1">
            <li>• Only public multiplayer rooms can be tracked</li>
            <li>• Data updates automatically when users view challenges (5-minute cooldown)</li>
            <li>• Use "Update All" to force refresh all active challenges</li>
            <li>• Custom names will override the original room name for display</li>
            <li>• New challenges are automatically assigned to the current season (6-month cycles)</li>
            <li>• Challenge data includes scores, rankings, and participant information</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}