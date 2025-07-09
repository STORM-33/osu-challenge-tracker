import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import { Plus, Loader2, CheckCircle, AlertCircle, Settings, RefreshCw, Zap, Users, Calendar, Music, X, Pause, Play, Edit3, ArrowRight, Info, Link as PartnersIcon, ExternalLink, Trash2, Eye, EyeOff, GripVertical, Sparkles, BarChart3 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
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
  const { user, loading, isAdmin } = useAuth();
  const [roomId, setRoomId] = useState('');
  const [customName, setCustomName] = useState('');
  const [loading2, setLoading2] = useState(false);
  const [result, setResult] = useState(null);
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
    if (!loading) { // Wait for auth to load
      if (!user) {
        router.push('/');
        return;
      }
      
      if (!user.admin) {
        router.push('/');
        return;
      }
      
      // If we get here, user is admin - load data
      loadActiveChallenges();
      loadPartners();
    }
  }, [user, loading, router]);

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
      console.log('🗑️ Deleting partner ID:', partnerId, 'Type:', typeof partnerId);
      
      // Ensure partnerId is a number and send as array
      const partnerIdNumber = typeof partnerId === 'string' ? parseInt(partnerId) : partnerId;
      
      // Validate that we have a valid number
      if (isNaN(partnerIdNumber) || partnerIdNumber <= 0) {
        throw new Error('Invalid partner ID');
      }
      
      const requestBody = {
        operation: 'delete',
        partnerIds: [partnerIdNumber] // ✅ Correctly formatted as array
      };
      
      console.log('📦 Request body:', JSON.stringify(requestBody));
      
      const response = await fetch('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      console.log('📡 Delete response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Delete successful:', data);
        
        setResult({
          success: true,
          message: 'Partner deleted successfully'
        });
        
        // Reload partners list
        loadPartners();
      } else {
        const errorText = await response.text();
        console.error('❌ Delete error:', errorText);
        
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
      console.error('❌ Delete partner error:', error);
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

    setLoading2(true);
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
      setLoading2(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="glass-card-enhanced rounded-2xl p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
            <p className="text-neutral-600 mt-4 text-center">Checking admin access...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user || !user.admin) {
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Enhanced Header Section */}
          <div className="mb-12">
            <div className="flex items-start justify-between mb-8">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <Settings className="w-10 h-10 text-primary-600 icon-adaptive-shadow" />
                    <Sparkles className="w-5 h-5 text-yellow-500 absolute -top-1 -right-1 icon-adaptive-shadow" />
                  </div>
                  
                  {/* Header with adaptive text shadow */}
                  <h1 
                    className="text-4xl font-bold text-neutral-800 text-white/90 text-adaptive-shadow"
                    data-text="Admin Panel"
                  >
                    Admin Panel
                  </h1>
                </div>
                
                {/* Description */}
                <p className="text-neutral-600 text-lg max-w-2xl text-white/85 text-adaptive-shadow">
                  Welcome, {user?.username}! Manage challenges, partners, and system settings from your control center.
                </p>
              </div>
            </div>
          </div>

          {/* Enhanced Result Message */}
          {result && (
            <div className={`mb-8 glass-card-enhanced rounded-2xl p-6 border-l-4 ${
              result.success 
                ? 'border-green-500 bg-gradient-to-r from-green-50/80 to-emerald-50/80' 
                : 'border-red-500 bg-gradient-to-r from-red-50/80 to-pink-50/80'
            }`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                ) : (
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                )}
                <div className="flex-1">
                  <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
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
                    <div className="mt-3 p-3 bg-white/60 rounded-lg text-sm text-neutral-700">
                      <div className="grid grid-cols-2 gap-2">
                        <p><span className="font-medium">Room ID:</span> {result.challenge.room_id}</p>
                        <p><span className="font-medium">Host:</span> {result.challenge.host}</p>
                        {result.challenge.custom_name && (
                          <p className="col-span-2"><span className="font-medium">Custom Name:</span> {result.challenge.custom_name}</p>
                        )}
                      </div>
                      <p className="text-green-600 font-medium mt-2 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Active Challenge
                      </p>
                    </div>
                  )}
                  {result.updated !== undefined && (
                    <div className="mt-3 p-3 bg-white/60 rounded-lg text-sm text-neutral-700">
                      <div className="flex items-center justify-between">
                        <span>Updated: <span className="font-bold text-green-600">{result.updated}</span> challenges</span>
                        {result.failed > 0 && (
                          <span>Failed: <span className="font-bold text-red-600">{result.failed}</span></span>
                        )}
                      </div>
                      {result.cancelled && (
                        <p className="text-orange-600 font-medium mt-2 flex items-center gap-1">
                          <X className="w-4 h-4" />
                          Operation was cancelled
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Enhanced Add Challenge Section */}
            <div className="glass-card-enhanced rounded-2xl p-8 border border-primary-200/60 bg-gradient-to-br from-primary-50/80 to-blue-50/80 backdrop-blur-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-primary-500 to-blue-500 rounded-xl">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-neutral-800">Add New Challenge</h2>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
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
                    className="w-full px-4 py-3 bg-white/80 border border-neutral-300/60 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all backdrop-blur-sm"
                    disabled={loading}
                  />
                  <p className="text-xs text-neutral-500 mt-2 bg-white/40 rounded-lg px-3 py-2">
                    💡 Find the room ID in the URL: osu.ppy.sh/multiplayer/rooms/<strong>1392361</strong>
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
                    className="w-full px-4 py-3 bg-white/80 border border-neutral-300/60 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all backdrop-blur-sm"
                    disabled={loading}
                  />
                  <p className="text-xs text-neutral-500 mt-2 bg-white/40 rounded-lg px-3 py-2">
                    ✨ Leave empty to use the original room name from osu!
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !roomId.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-700 hover:to-blue-700 disabled:from-neutral-400 disabled:to-neutral-500 disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl transition-all font-medium shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
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

              {/* Enhanced Manage Challenge Names Link */}
              <div className="mt-8 pt-6 border-t border-primary-200/60">
                <h3 className="text-sm font-medium text-neutral-700 mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Challenge Management
                </h3>
                <Link href="/admin/challenges">
                  <div className="glass-card rounded-xl p-4 hover:shadow-xl transform hover:scale-105 transition-all duration-300 cursor-pointer group bg-gradient-to-r from-purple-50/80 to-indigo-50/80 border border-purple-200/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center group-hover:shadow-lg transition-all">
                          <Edit3 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-neutral-800">Manage Challenges</h4>
                          <p className="text-xs text-neutral-600">Edit names and rulesets for all challenges</p>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-purple-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Enhanced Active Challenge Management Section */}
            <div className="glass-card-enhanced rounded-2xl p-8 border border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 backdrop-blur-lg flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-neutral-800">Active Challenge Management</h2>
                </div>
                
                {/* Enhanced bulk update controls */}
                <div className="flex items-center gap-3">
                  {bulkUpdateState.isRunning && (
                    <>
                      <button
                        onClick={toggleBulkUpdatePause}
                        className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        {bulkUpdateState.isPaused ? (
                          <>
                            <Play className="w-4 h-4" />
                            Resume
                          </>
                        ) : (
                          <>
                            <Pause className="w-4 h-4" />
                            Pause
                          </>
                        )}
                      </button>
                      <button
                        onClick={cancelBulkUpdate}
                        className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={handleUpdateAllActive}
                    disabled={bulkUpdateState.isRunning || activeChallenges.length === 0}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
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

              {/* Enhanced Progress indicator for bulk updates */}
              {bulkUpdateState.isRunning && (
                <div className="mb-6 glass-card rounded-xl p-6 border border-blue-200/60 bg-gradient-to-r from-blue-100/80 to-indigo-100/80">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                      {bulkUpdateState.isPaused ? (
                        <>
                          <Pause className="w-4 h-4" />
                          Paused
                        </>
                      ) : (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Updating Challenges
                        </>
                      )}
                    </span>
                    <span className="text-sm text-blue-600 font-medium">
                      {bulkUpdateState.progress.current}/{bulkUpdateState.progress.total}
                    </span>
                  </div>
                  
                  {/* Enhanced Progress bar */}
                  <div className="w-full bg-blue-200/60 rounded-full h-3 mb-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all duration-300 shadow-sm"
                      style={{ 
                        width: `${(bulkUpdateState.progress.current / bulkUpdateState.progress.total) * 100}%` 
                      }}
                    ></div>
                  </div>
                  
                  {bulkUpdateState.currentChallenge && (
                    <p className="text-xs text-blue-700 bg-white/60 rounded-lg px-3 py-2">
                      <span className="font-medium">Currently updating:</span> {bulkUpdateState.currentChallenge.name} (Room {bulkUpdateState.currentChallenge.room_id})
                    </p>
                  )}
                </div>
              )}

              {/* Enhanced Main content area */}
              <div className="flex-1">
                {activeChallenges.length === 0 ? (
                  <div className="text-center py-12 glass-card rounded-xl bg-white/40">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-neutral-300 to-neutral-400 rounded-2xl flex items-center justify-center">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-neutral-600 font-medium mb-2">No active challenges</p>
                    <p className="text-sm text-neutral-500">Add a new challenge to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeChallenges.slice(0, 5).map(challenge => {
                      const lastUpdated = getUTCTimestamp(challenge.updated_at);
                      const isStale = lastUpdated && (Date.now() - lastUpdated) > 10 * 60 * 1000;
                      const needsUpdate = lastUpdated && (Date.now() - lastUpdated) > 5 * 60 * 1000;
                      const rulesetName = generateRulesetDisplayName(challenge);
                      
                      return (
                        <div key={challenge.id} className="glass-card rounded-xl p-4 bg-white/60 border border-neutral-200/60 hover:border-neutral-300/60 hover:shadow-lg transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 mb-2">
                                <h4 className="font-semibold text-neutral-800 text-sm flex-1 leading-tight">
                                  {challenge.custom_name || challenge.name}
                                  {challenge.custom_name && (
                                    <span className="ml-2 inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                                      <Sparkles className="w-3 h-3" />
                                      Custom
                                    </span>
                                  )}
                                  {/* Enhanced Ruleset indicator */}
                                  {challenge.has_ruleset && rulesetName && (
                                    <span className="ml-2 inline-flex items-center gap-1 text-xs bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 px-2 py-1 rounded-full font-medium border border-yellow-200/60">
                                      <Crown className="w-3 h-3" />
                                      {rulesetName}
                                    </span>
                                  )}
                                </h4>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-neutral-600 mb-2">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
                                  Room ID: <span className="font-mono font-medium">{challenge.room_id}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {challenge.host}
                                </span>
                                <span className="flex items-center gap-1">
                                  <BarChart3 className="w-3 h-3" />
                                  {challenge.participant_count || 0} participants
                                </span>
                                <span className="flex items-center gap-1">
                                  <Music className="w-3 h-3" />
                                  {challenge.playlists?.length || 0} maps
                                </span>
                              </div>
                              <div className="text-xs text-neutral-500 bg-white/40 rounded-lg px-2 py-1 inline-block">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                Last updated: {formatUTCDateTime(challenge.updated_at)}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              {/* Enhanced Ruleset Management Button */}
                              <button
                                onClick={() => handleManageRuleset(challenge)}
                                disabled={bulkUpdateState.isRunning}
                                className="px-3 py-2 bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 border border-yellow-200/60 rounded-xl hover:from-yellow-100 hover:to-amber-100 hover:shadow-lg transform hover:scale-105 transition-all text-xs font-medium flex items-center gap-1 disabled:opacity-50 disabled:transform-none"
                                title="Manage Ruleset"
                              >
                                <Target className="w-3 h-3" />
                                <span>Ruleset</span>
                              </button>
                              
                              {/* Enhanced Update Button */}
                              <button
                                onClick={() => handleUpdateSingleChallenge(challenge.room_id)}
                                disabled={bulkUpdateState.isRunning || updatingChallenges.has(challenge.room_id)}
                                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border flex items-center gap-1 shadow-sm hover:shadow-lg transform hover:scale-105 disabled:transform-none ${
                                  isStale 
                                    ? 'bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 border-yellow-200/60 hover:from-yellow-100 hover:to-amber-100' 
                                    : needsUpdate
                                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200/60 hover:from-blue-100 hover:to-indigo-100'
                                    : 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200/60 hover:from-green-100 hover:to-emerald-100'
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
                      <div className="text-center pt-4 border-t border-blue-200/60">
                        <Link href="/admin/challenges?status=active">
                          <span className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer flex items-center justify-center gap-2 hover:gap-3 transition-all">
                            View all {activeChallenges.length} active challenges 
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Enhanced Notes Section */}
              <div className="mt-auto pt-6 border-t border-blue-200/60">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg">
                    <Info className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="font-semibold text-neutral-800">Challenge Management Notes</h4>
                </div>
                <div className="text-sm text-neutral-600 space-y-2 glass-card rounded-xl p-4 bg-blue-50/50 border border-blue-200/60">
                  <p className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>Only public multiplayer rooms can be tracked</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>Data updates automatically when users view challenges (4-minute cooldown)</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>Use "Update All" to force refresh all active challenges (can be paused/cancelled)</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>New challenges are automatically assigned to the current season (6-month cycles)</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>Use "Manage Challenges" to edit names and rulesets for all challenges</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>Ruleset names are auto-generated from selected mods and settings</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Enhanced Partners Management Section */}
            <div className="glass-card-enhanced rounded-2xl p-8 border border-purple-200/60 bg-gradient-to-br from-purple-50/80 to-pink-50/80 backdrop-blur-lg col-span-1 lg:col-span-2">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                    <PartnersIcon className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-neutral-800">Partners Management</h2>
                </div>
                
                <button
                  onClick={() => {
                    setShowPartnerForm(true);
                    setEditingPartner(null);
                    setPartnerForm({
                      name: '',
                      icon_url: '',
                      description: '',
                      is_active: true,
                      display_order: partners.length
                    });
                  }}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Plus className="w-4 h-4" />
                  Add Partner
                </button>
              </div>

              {/* Enhanced Partner Form Modal */}
              {showPartnerForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="glass-card-enhanced rounded-3xl p-8 max-w-md w-full shadow-2xl border border-purple-200/60 bg-gradient-to-br from-white/95 to-purple-50/95">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                        <PartnersIcon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-neutral-800">
                        {editingPartner ? 'Edit Partner' : 'Add New Partner'}
                      </h3>
                    </div>
                    
                    <form onSubmit={handlePartnerSubmit} className="space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Partner Name *
                        </label>
                        <input
                          type="text"
                          value={partnerForm.name}
                          onChange={(e) => setPartnerForm({...partnerForm, name: e.target.value})}
                          className="w-full px-4 py-3 border border-neutral-300/60 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white/80 backdrop-blur-sm"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Icon URL *
                        </label>
                        <input
                          type="url"
                          value={partnerForm.icon_url}
                          onChange={(e) => setPartnerForm({...partnerForm, icon_url: e.target.value})}
                          className="w-full px-4 py-3 border border-neutral-300/60 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white/80 backdrop-blur-sm"
                          placeholder="https://example.com/icon.png"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Description
                        </label>
                        <textarea
                          value={partnerForm.description}
                          onChange={(e) => setPartnerForm({...partnerForm, description: e.target.value})}
                          className="w-full px-4 py-3 border border-neutral-300/60 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white/80 backdrop-blur-sm"
                          rows="3"
                          maxLength="500"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Display Order
                          </label>
                          <input
                            type="number"
                            value={partnerForm.display_order}
                            onChange={(e) => setPartnerForm({...partnerForm, display_order: parseInt(e.target.value) || 0})}
                            className="w-full px-4 py-3 border border-neutral-300/60 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white/80 backdrop-blur-sm"
                            min="0"
                          />
                        </div>
                        
                        <div className="flex items-end">
                          <label className="flex items-center gap-3 w-full p-3 bg-purple-50/60 rounded-xl border border-purple-200/60 cursor-pointer hover:bg-purple-100/60 transition-colors">
                            <input
                              type="checkbox"
                              checked={partnerForm.is_active}
                              onChange={(e) => setPartnerForm({...partnerForm, is_active: e.target.checked})}
                              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                            <span className="text-sm font-medium text-neutral-700">Active</span>
                          </label>
                        </div>
                      </div>
                      
                      <div className="flex gap-3 mt-8">
                        <button
                          type="submit"
                          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          {editingPartner ? 'Update' : 'Create'} Partner
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPartnerForm(false);
                            setEditingPartner(null);
                          }}
                          className="flex-1 bg-gradient-to-r from-neutral-200 to-neutral-300 hover:from-neutral-300 hover:to-neutral-400 text-neutral-700 px-6 py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Enhanced Partners List */}
              {loadingPartners ? (
                <div className="text-center py-12 glass-card rounded-xl bg-white/40">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
                  <p className="text-neutral-600">Loading partners...</p>
                </div>
              ) : partners.length === 0 ? (
                <div className="text-center py-12 glass-card rounded-xl bg-white/40">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-neutral-300 to-neutral-400 rounded-2xl flex items-center justify-center">
                    <PartnersIcon className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-neutral-600 font-medium mb-2">No partners yet</p>
                  <p className="text-sm text-neutral-500">Add your first partner to get started!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {partners.map((partner) => (
                    <div key={partner.id} className="glass-card rounded-xl p-6 bg-white/60 border border-neutral-200/60 hover:border-neutral-300/60 hover:shadow-lg transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <img
                              src={partner.icon_url}
                              alt={partner.name}
                              className="w-16 h-16 rounded-xl object-cover shadow-lg"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(partner.name)}&background=9333ea&color=fff&size=128`;
                              }}
                            />
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${partner.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          </div>
                          <div>
                            <h4 className="font-semibold text-neutral-800 text-lg">{partner.name}</h4>
                            <div className="flex items-center gap-4 text-sm text-neutral-600 mt-1">
                              <span className="flex items-center gap-1">
                                <GripVertical className="w-4 h-4" />
                                Order: {partner.display_order}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${partner.is_active ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'}`}>
                                {partner.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            {partner.description && (
                              <p className="text-sm text-neutral-600 mt-2 max-w-md">{partner.description}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleTogglePartnerStatus(partner)}
                            className={`p-3 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 ${
                              partner.is_active 
                                ? 'bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 hover:from-yellow-100 hover:to-amber-100' 
                                : 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 hover:from-green-100 hover:to-emerald-100'
                            }`}
                            title={partner.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {partner.is_active ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                          
                          <button
                            onClick={() => {
                              setEditingPartner(partner);
                              setPartnerForm({
                                name: partner.name,
                                icon_url: partner.icon_url,
                                description: partner.description || '',
                                is_active: partner.is_active,
                                display_order: partner.display_order
                              });
                              setShowPartnerForm(true);
                            }}
                            className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                          >
                            <Edit3 className="w-5 h-5" />
                          </button>
                          
                          <button
                            onClick={() => handleDeletePartner(partner.id)}
                            className="p-3 bg-gradient-to-r from-red-50 to-pink-50 text-red-700 rounded-xl hover:from-red-100 hover:to-pink-100 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="text-center pt-6 border-t border-purple-200/60">
                    <Link href="/partners">
                      <span className="text-sm text-purple-600 hover:text-purple-700 font-medium cursor-pointer flex items-center justify-center gap-2 hover:gap-3 transition-all">
                        View partners page 
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
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