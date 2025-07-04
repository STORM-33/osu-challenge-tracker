import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import { Plus, Loader2, CheckCircle, AlertCircle, Settings, RefreshCw, Zap, Users, Calendar, Music, X, Pause, Play, Edit3, ArrowRight, Info, Users as PartnersIcon, ExternalLink, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react';
import { auth } from '../lib/supabase';
import { useRouter } from 'next/router';
import RulesetManager from '../components/RulesetManager';
import { Crown, Target } from 'lucide-react';

// Fixed UTC time formatting function
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

const getUTCTimestamp = (utcDateString) => {
  if (!utcDateString) return null;
  const utcString = utcDateString.endsWith('Z') ? utcDateString : `${utcDateString}Z`;
  return new Date(utcString).getTime();
}

// Import the name generator directly
import { generateRulesetName } from '../lib/ruleset-name-generator';

// Helper function to generate ruleset names
const generateRulesetDisplayName = (challenge) => {
  if (!challenge.has_ruleset || !challenge.required_mods || challenge.required_mods.length === 0) {
    return null;
  }

  try {
    // Use the imported function directly
    return generateRulesetName(
      challenge.required_mods, 
      challenge.ruleset_match_type || 'exact'
    );
  } catch (error) {
    console.warn('Error generating ruleset name:', error);
    
    // Fallback: simple concatenation of mod acronyms
    const modNames = challenge.required_mods.map(mod => mod.acronym).join('');
    const prefix = challenge.ruleset_match_type === 'at_least' ? 'AtLeast:' : 
                   challenge.ruleset_match_type === 'any_of' ? 'Any:' : '';
    return `${prefix}${modNames}`;
  }
};

export default function Admin() {
  const [roomId, setRoomId] = useState('');
  const [customName, setCustomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [updatingChallenges, setUpdatingChallenges] = useState(new Set());
  const [showRulesetManager, setShowRulesetManager] = useState(false);
  const [selectedChallengeForRuleset, setSelectedChallengeForRuleset] = useState(null);
  
  // Partner management state variables
  const [partners, setPartners] = useState([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    icon_url: '',
    link_url: '',
    description: '',
    is_active: true,
    display_order: 0
  });
  
  // Non-blocking bulk update state
  const [bulkUpdateState, setBulkUpdateState] = useState({
    isRunning: false,
    isPaused: false,
    progress: { current: 0, total: 0 },
    results: [],
    currentChallenge: null,
    canCancel: false
  });
  
  const bulkUpdateController = useRef(null);
  const router = useRouter();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (user?.admin) {
      loadActiveChallenges();
      loadPartners();
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

  const loadActiveChallenges = async () => {
    try {
      const response = await fetch('/api/challenges?active=true');
      const data = await response.json();
      if (data.success) {
        // Handle the nested structure - challenges are in data.data.challenges
        const challenges = data.data?.challenges || data.challenges || [];
        setActiveChallenges(challenges);
        console.log('Active challenges loaded:', challenges.length);
      } else {
        console.error('API returned error:', data.error);
      }
    } catch (error) {
      console.error('Failed to load active challenges:', error);
    }
  };

  // Partner management functions
  const loadPartners = async () => {
    try {
      setLoadingPartners(true);
      const response = await fetch('/api/admin/partners');
      const data = await response.json();
      
      if (data.success) {
        const partners = data.data?.partners || data.partners || [];
        console.log('✅ Partners loaded successfully:', partners.length);
        setPartners(partners);
      } else {
        console.error('API returned error:', data.error);
        setResult({
          success: false,
          message: data.error || 'Failed to load partners'
        });
      }
    } catch (error) {
      console.error('Failed to load partners:', error);
      setResult({
        success: false,
        message: 'Network error loading partners'
      });
    } finally {
      setLoadingPartners(false);
    }
  };

  const handlePartnerSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Always use the index endpoint
      const url = '/api/partners';
      const method = editingPartner ? 'PUT' : 'POST';
      
      // For editing, include the ID in the body
      const body = editingPartner 
        ? { ...partnerForm, id: editingPartner.id }
        : partnerForm;
      
      console.log(`🔄 ${method} request to ${url}`, body);
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP Error:', response.status, errorText);
        
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error?.message || errorData.error || errorData.message || errorText;
        } catch {
          errorMessage = errorText || `HTTP ${response.status} error`;
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('📦 Response data:', data);
      
      if (data.success !== false) {
        setResult({
          success: true,
          message: editingPartner 
            ? 'Partner updated successfully'
            : 'Partner created successfully'
        });
        
        // Reset form
        setShowPartnerForm(false);
        setEditingPartner(null);
        setPartnerForm({
          name: '',
          icon_url: '',
          link_url: '',
          description: '',
          is_active: true,
          display_order: 0
        });
        
        // Reload partners
        setTimeout(() => {
          loadPartners();
        }, 500);
        
      } else {
        throw new Error(data.error || 'Failed to save partner');
      }
      
    } catch (error) {
      console.error('❌ Partner submit error:', error);
      
      setResult({
        success: false,
        message: error.message || 'Network error. Please try again.'
      });
    }
  };

  const handleTogglePartnerStatus = async (partner) => {
    try {
      // Use the index endpoint with PUT method, including ID in body
      const response = await fetch('/api/partners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: partner.id,
          is_active: !partner.is_active 
        })
      });
      
      if (response.ok) {
        loadPartners(); // Reload the partners list
      } else {
        const errorText = await response.text();
        console.error('Toggle status error:', errorText);
        
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error?.message || errorData.error || errorData.message || errorText;
        } catch {
          errorMessage = errorText || 'Failed to update partner status';
        }
        
        setResult({
          success: false,
          message: errorMessage
        });
      }
    } catch (error) {
      console.error('Toggle partner status error:', error);
      setResult({
        success: false,
        message: error.message || 'Network error. Please try again.'
      });
    }
  };

  const handleDeletePartner = async (partnerId) => {
    if (!confirm('Are you sure you want to delete this partner?')) {
      return;
    }
    
    try {
      // For delete, we'll need to add DELETE support to the index endpoint or use admin endpoint
      // Let's use the admin endpoint for bulk operations with a single item
      const response = await fetch('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'delete',
          partnerIds: [partnerId] // Array with single ID
        })
      });
      
      if (response.ok) {
        setResult({
          success: true,
          message: 'Partner deleted successfully'
        });
        loadPartners();
      } else {
        const errorText = await response.text();
        console.error('Delete error:', errorText);
        
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error?.message || errorData.error || errorData.message || errorText;
        } catch {
          errorMessage = errorText || 'Failed to delete partner';
        }
        
        setResult({
          success: false,
          message: errorMessage
        });
      }
    } catch (error) {
      console.error('Delete partner error:', error);
      setResult({
        success: false,
        message: error.message || 'Network error. Please try again.'
      });
    }
  };

  const handleUpdateAllActive = async () => {
    if (activeChallenges.length === 0) {
      setResult({ success: false, error: 'No active challenges to update' });
      return;
    }

    // Create abort controller for cancellation
    bulkUpdateController.current = new AbortController();
    
    setBulkUpdateState({
      isRunning: true,
      isPaused: false,
      progress: { current: 0, total: activeChallenges.length },
      results: [],
      currentChallenge: null,
      canCancel: true
    });
    
    try {
      let updated = 0;
      let failed = 0;
      const results = [];
      
      console.log(`🔄 Starting non-blocking bulk update of ${activeChallenges.length} challenges`);
      
      for (let i = 0; i < activeChallenges.length; i++) {
        const challenge = activeChallenges[i];
        
        // Check if cancelled
        if (bulkUpdateController.current?.signal.aborted) {
          console.log('🛑 Bulk update cancelled by user');
          break;
        }
        
        // Update current challenge
        setBulkUpdateState(prev => ({
          ...prev,
          currentChallenge: challenge,
          progress: { current: i, total: activeChallenges.length }
        }));
        
        // Wait for pause if needed
        while (bulkUpdateState.isPaused && !bulkUpdateController.current?.signal.aborted) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        try {
          console.log(`🚀 Updating challenge ${challenge.room_id} (${i + 1}/${activeChallenges.length})`);
          
          const response = await fetch('/api/update-challenge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId: challenge.room_id }),
            signal: bulkUpdateController.current?.signal
          });
          
          const result = await response.json();
          
          const challengeResult = {
            roomId: challenge.room_id,
            name: challenge.name,
            success: result.success,
            error: result.error,
            timestamp: new Date().toISOString()
          };
          
          if (result.success) {
            updated++;
            console.log(`✅ Challenge ${challenge.room_id} updated successfully`);
          } else {
            failed++;
            console.error(`❌ Challenge ${challenge.room_id} failed:`, result.error);
          }
          
          results.push(challengeResult);
          
          // Update progress in real-time
          setBulkUpdateState(prev => ({
            ...prev,
            results: [...prev.results, challengeResult],
            progress: { current: i + 1, total: activeChallenges.length }
          }));
          
          // Non-blocking delay - allows UI to remain responsive
          if (i < activeChallenges.length - 1) { // Don't delay after last item
            for (let delay = 0; delay < 2000; delay += 100) {
              if (bulkUpdateController.current?.signal.aborted) break;
              
              // Check for pause during delay
              if (!bulkUpdateState.isPaused) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }
          }
          
        } catch (error) {
          if (error.name === 'AbortError') {
            console.log('🛑 Challenge update aborted');
            break;
          }
          
          failed++;
          console.error(`❌ Error updating challenge ${challenge.room_id}:`, error);
          
          const errorResult = {
            roomId: challenge.room_id,
            name: challenge.name,
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          };
          
          results.push(errorResult);
          
          setBulkUpdateState(prev => ({
            ...prev,
            results: [...prev.results, errorResult]
          }));
        }
      }
      
      // Final state update
      setBulkUpdateState(prev => ({
        ...prev,
        isRunning: false,
        currentChallenge: null,
        canCancel: false
      }));
      
      // Set final result
      setResult({
        success: updated > 0,
        updated,
        failed,
        total: activeChallenges.length,
        cancelled: bulkUpdateController.current?.signal.aborted,
        message: bulkUpdateController.current?.signal.aborted 
          ? `Update cancelled. Processed ${updated + failed}/${activeChallenges.length} challenges`
          : `Updated ${updated}/${activeChallenges.length} challenges successfully`,
        results
      });
      
      // Refresh the challenges list after updates
      if (updated > 0) {
        setTimeout(() => {
          loadActiveChallenges();
        }, 2000);
      }
      
    } catch (error) {
      setBulkUpdateState(prev => ({
        ...prev,
        isRunning: false,
        currentChallenge: null,
        canCancel: false
      }));
      
      setResult({
        success: false,
        error: error.message
      });
    }
  };

  const handleManageRuleset = (challenge) => {
    setSelectedChallengeForRuleset(challenge);
    setShowRulesetManager(true);
  };

  const handleRulesetSuccess = (message) => {
    setResult({
      success: true,
      message: message
    });
    setShowRulesetManager(false);
    setSelectedChallengeForRuleset(null);
    
    // Refresh challenges list
    setTimeout(() => {
      loadActiveChallenges();
    }, 1000);
  };

  // Pause/Resume functionality
  const toggleBulkUpdatePause = () => {
    setBulkUpdateState(prev => ({
      ...prev,
      isPaused: !prev.isPaused
    }));
  };

  // Cancel functionality
  const cancelBulkUpdate = () => {
    if (bulkUpdateController.current) {
      bulkUpdateController.current.abort();
    }
  };

  const handleUpdateSingleChallenge = async (roomId) => {
    setUpdatingChallenges(prev => new Set(prev).add(roomId));
    
    try {
      const response = await fetch('/api/update-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setResult({
          success: true,
          message: `Successfully updated challenge ${roomId}`,
          updated: 1,
          total: 1,
          skipped: 0
        });
        
        setTimeout(() => {
          loadActiveChallenges();
        }, 1000);
      } else {
        setResult({
          success: false,
          error: result.error || 'Update failed'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    } finally {
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

            {/* Manage Challenge Names Link */}
            <div className="mt-6 pt-6 border-t border-neutral-200">
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Challenge Management</h3>
              <Link href="/admin/challenges">
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 hover:shadow-md transition-all duration-300 cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                        <Edit3 className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-neutral-800">Manage Challengew</h4>
                        <p className="text-xs text-neutral-600">Edit names and rulesets for all challenges</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-purple-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            </div>

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
                    {/* Safe display of message - handle both string and object cases */}
                    {(() => {
                      if (typeof result.message === 'string') {
                        return result.message;
                      }
                      if (typeof result.error === 'string') {
                        return result.error;
                      }
                      if (typeof result.error === 'object' && result.error?.message) {
                        return result.error.message;
                      }
                      return 'An error occurred';
                    })()}
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
                  {result.updated !== undefined && (
                    <div className="mt-2 text-sm text-neutral-600">
                      <p>Updated: {result.updated} challenges</p>
                      {result.failed > 0 && (
                        <p>Failed: {result.failed} challenges</p>
                      )}
                      {result.cancelled && (
                        <p className="text-orange-600 font-medium">⏸️ Operation was cancelled</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Active Challenge Management Section */}
          <div className="glass-card rounded-xl p-6 border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-neutral-800">Active Challenge Management</h2>
              </div>
              
              {/* Enhanced bulk update controls */}
              <div className="flex items-center gap-2">
                {bulkUpdateState.isRunning && (
                  <>
                    <button
                      onClick={toggleBulkUpdatePause}
                      className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      {bulkUpdateState.isPaused ? (
                        <>
                          <Play className="w-3 h-3" />
                          Resume
                        </>
                      ) : (
                        <>
                          <Pause className="w-3 h-3" />
                          Pause
                        </>
                      )}
                    </button>
                    <button
                      onClick={cancelBulkUpdate}
                      className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </>
                )}
                
                <button
                  onClick={handleUpdateAllActive}
                  disabled={bulkUpdateState.isRunning || activeChallenges.length === 0}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                >
                  {bulkUpdateState.isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {bulkUpdateState.isPaused ? 'Paused' : 'Updating'} 
                        ({bulkUpdateState.progress.current}/{bulkUpdateState.progress.total})
                      </span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Update All</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Progress indicator for bulk updates */}
            {bulkUpdateState.isRunning && (
              <div className="mb-4 p-4 bg-blue-100 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-800">
                    {bulkUpdateState.isPaused ? '⏸️ Paused' : '🔄 Updating Challenges'}
                  </span>
                  <span className="text-sm text-blue-600">
                    {bulkUpdateState.progress.current}/{bulkUpdateState.progress.total}
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(bulkUpdateState.progress.current / bulkUpdateState.progress.total) * 100}%` 
                    }}
                  ></div>
                </div>
                
                {bulkUpdateState.currentChallenge && (
                  <p className="text-xs text-blue-700">
                    Current: {bulkUpdateState.currentChallenge.name} (Room {bulkUpdateState.currentChallenge.room_id})
                  </p>
                )}
              </div>
            )}

            {/* Main content area that grows to fill space */}
            <div className="flex-1">
              {activeChallenges.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                  <p className="text-neutral-500">No active challenges</p>
                  <p className="text-sm text-neutral-400 mt-1">Add a new challenge to get started!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeChallenges.slice(0, 5).map(challenge => {
                    const lastUpdated = getUTCTimestamp(challenge.updated_at);
                    const isStale = lastUpdated && (Date.now() - lastUpdated) > 10 * 60 * 1000;
                    const needsUpdate = lastUpdated && (Date.now() - lastUpdated) > 5 * 60 * 1000;
                    const rulesetName = generateRulesetDisplayName(challenge);
                    
                    return (
                      <div key={challenge.id} className="p-3 bg-white/80 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 mb-1">
                              <h4 className="font-medium text-neutral-800 text-sm flex-1 leading-tight">
                                {challenge.custom_name || challenge.name}
                                {challenge.custom_name && (
                                  <span className="ml-2 text-xs text-purple-600 font-medium">(Custom)</span>
                                )}
                                {/* Ruleset indicator with generated name */}
                                {challenge.has_ruleset && rulesetName && (
                                  <span className="ml-2 inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                                    <Crown className="w-3 h-3" />
                                    {rulesetName}
                                  </span>
                                )}
                              </h4>
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
                          
                          <div className="flex items-center gap-2 ml-3">
                            {/* Ruleset Management Button */}
                            <button
                              onClick={() => handleManageRuleset(challenge)}
                              disabled={bulkUpdateState.isRunning}
                              className="px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                              title="Manage Ruleset"
                            >
                              <Target className="w-3 h-3" />
                              <span>Ruleset</span>
                            </button>
                            
                            {/* Update Button */}
                            <button
                              onClick={() => handleUpdateSingleChallenge(challenge.room_id)}
                              disabled={bulkUpdateState.isRunning || updatingChallenges.has(challenge.room_id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border flex items-center gap-1 ${
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
                      </div>
                    );
                  })}
                  
                  {activeChallenges.length > 5 && (
                    <div className="text-center pt-3 border-t border-neutral-200">
                      <Link href="/admin/challenges?status=active">
                        <span className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer">
                          View all {activeChallenges.length} active challenges →
                        </span>
                      </Link>
                    </div>
                  )}
                </div>
              )}
              
            </div>

            {/* Moved Notes Section - Always at bottom */}
            <div className="mt-auto pt-6 border-t border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-blue-600" />
                <h4 className="font-medium text-neutral-800">Challenge Management Notes</h4>
              </div>
              <div className="text-sm text-neutral-600 space-y-1.5 bg-blue-50/50 rounded-lg p-3">
                <p>• Only public multiplayer rooms can be tracked</p>
                <p>• Data updates automatically when users view challenges (4-minute cooldown)</p>
                <p>• Use "Update All" to force refresh all active challenges (can be paused/cancelled)</p>
                <p>• New challenges are automatically assigned to the current season (6-month cycles)</p>
                <p>• Use "Manage Challenges" to edit names and rulesets for all challenges (active + inactive)</p>
                <p>• Ruleset names are auto-generated from selected mods and settings</p>
              </div>
            </div>
          </div>

          {/* Partners Management Section */}
          <div className="glass-card rounded-xl p-6 border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <PartnersIcon className="w-6 h-6 text-purple-600" />
                <h2 className="text-xl font-semibold text-neutral-800">Partners Management</h2>
              </div>
              
              <button
                onClick={() => {
                  setShowPartnerForm(true);
                  setEditingPartner(null);
                  setPartnerForm({
                    name: '',
                    icon_url: '',
                    link_url: '',
                    description: '',
                    is_active: true,
                    display_order: partners.length
                  });
                }}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Partner
              </button>
            </div>

            {/* Partner Form Modal */}
            {showPartnerForm && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                  <h3 className="text-lg font-semibold text-neutral-800 mb-4">
                    {editingPartner ? 'Edit Partner' : 'Add New Partner'}
                  </h3>
                  
                  <form onSubmit={handlePartnerSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Partner Name *
                      </label>
                      <input
                        type="text"
                        value={partnerForm.name}
                        onChange={(e) => setPartnerForm({...partnerForm, name: e.target.value})}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-purple-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Icon URL *
                      </label>
                      <input
                        type="url"
                        value={partnerForm.icon_url}
                        onChange={(e) => setPartnerForm({...partnerForm, icon_url: e.target.value})}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-purple-500"
                        placeholder="https://example.com/icon.png"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Link URL *
                      </label>
                      <input
                        type="url"
                        value={partnerForm.link_url}
                        onChange={(e) => setPartnerForm({...partnerForm, link_url: e.target.value})}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-purple-500"
                        placeholder="https://example.com"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={partnerForm.description}
                        onChange={(e) => setPartnerForm({...partnerForm, description: e.target.value})}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-purple-500"
                        rows="2"
                        maxLength="500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Display Order
                      </label>
                      <input
                        type="number"
                        value={partnerForm.display_order}
                        onChange={(e) => setPartnerForm({...partnerForm, display_order: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-purple-500"
                        min="0"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={partnerForm.is_active}
                        onChange={(e) => setPartnerForm({...partnerForm, is_active: e.target.checked})}
                        className="w-4 h-4 text-purple-600"
                      />
                      <label htmlFor="is_active" className="text-sm font-medium text-neutral-700">
                        Active (visible on partners page)
                      </label>
                    </div>
                    
                    <div className="flex gap-3 mt-6">
                      <button
                        type="submit"
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        {editingPartner ? 'Update' : 'Create'} Partner
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPartnerForm(false);
                          setEditingPartner(null);
                        }}
                        className="flex-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Partners List */}
            {loadingPartners ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto" />
              </div>
            ) : partners.length === 0 ? (
              <div className="text-center py-8">
                <PartnersIcon className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                <p className="text-neutral-500">No partners yet</p>
                <p className="text-sm text-neutral-400 mt-1">Add your first partner!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {partners.map((partner) => (
                  <div key={partner.id} className="p-4 bg-white/80 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={partner.icon_url}
                          alt={partner.name}
                          className="w-12 h-12 rounded-lg object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(partner.name)}&background=9333ea&color=fff&size=96`;
                          }}
                        />
                        <div>
                          <h4 className="font-medium text-neutral-800">{partner.name}</h4>
                          <div className="flex items-center gap-3 text-xs text-neutral-600">
                            <a href={partner.link_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-purple-600">
                              <ExternalLink className="w-3 h-3" />
                              {new URL(partner.link_url).hostname}
                            </a>
                            <span>Order: {partner.display_order}</span>
                            <span className={`px-2 py-0.5 rounded-full ${partner.is_active ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'}`}>
                              {partner.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTogglePartnerStatus(partner)}
                          className={`p-2 rounded-lg transition-colors ${
                            partner.is_active 
                              ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' 
                              : 'bg-green-50 text-green-700 hover:bg-green-100'
                          }`}
                          title={partner.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {partner.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        
                        <button
                          onClick={() => {
                            setEditingPartner(partner);
                            setPartnerForm({
                              name: partner.name,
                              icon_url: partner.icon_url,
                              link_url: partner.link_url,
                              description: partner.description || '',
                              is_active: partner.is_active,
                              display_order: partner.display_order
                            });
                            setShowPartnerForm(true);
                          }}
                          className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDeletePartner(partner.id)}
                          className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="text-center pt-3 border-t border-neutral-200">
                  <Link href="/partners">
                    <span className="text-sm text-purple-600 hover:text-purple-700 font-medium cursor-pointer">
                      View partners page →
                    </span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Ruleset Manager Modal */}
        {showRulesetManager && selectedChallengeForRuleset && (
          <RulesetManager
            challengeId={selectedChallengeForRuleset.id}
            onClose={() => {
              setShowRulesetManager(false);
              setSelectedChallengeForRuleset(null);
            }}
            onSuccess={handleRulesetSuccess}
          />
        )}
      </div>
    </Layout>
  );
}