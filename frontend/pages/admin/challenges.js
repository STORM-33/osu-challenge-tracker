import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import SeasonSelector from '../../components/SeasonSelector';
import RulesetManager from '../../components/RulesetManager';
import { 
  Loader2, Settings, Search, Filter, Edit2, Save, RotateCcw, 
  CheckCircle, AlertCircle, Users, Calendar, Clock, MapPin,
  ChevronLeft, ChevronRight, X, Eye, EyeOff, Crown, Target, Trash2
} from 'lucide-react';
import { auth } from '../../lib/supabase';
import { useRouter } from 'next/router';

// Import the name generator directly
import { generateRulesetName } from '../../lib/ruleset-name-generator';

// Helper function to generate ruleset names
const generateRulesetDisplayName = (challenge) => {
  if (!challenge.has_ruleset || !challenge.required_mods || challenge.required_mods.length === 0) {
    return null;
  }

  try {
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

export default function AdminChallenges() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({});
  const [pagination, setPagination] = useState({});
  const [result, setResult] = useState(null);
  
  // Editing state
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [savingChanges, setSavingChanges] = useState(new Set());
  
  // Delete state
  const [challengeToDelete, setChallengeToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  // Ruleset management state
  const [showRulesetManager, setShowRulesetManager] = useState(false);
  const [selectedChallengeForRuleset, setSelectedChallengeForRuleset] = useState(null);
  
  // Filters and search (removed sorting options)
  const [filters, setFilters] = useState({
    search: '',
    status: '', // 'active', 'inactive', ''
    season_id: '',
    hasCustomName: '', // 'true', 'false', ''
    hasRuleset: '', // 'true', 'false', ''
    limit: 25,
    offset: 0
  });

  const router = useRouter();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (user?.admin) {
      loadChallenges();
    }
  }, [user, filters]);

  const checkAdminAccess = async () => {
    try {
      const userData = await auth.getCurrentUser();
      if (!userData?.admin) {
        router.push('/admin');
        return;
      }
      setUser(userData);
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/admin');
    } finally {
      setCheckingAuth(false);
    }
  };

  const loadChallenges = async () => {
    console.log('🔄 Loading challenges with filters:', filters);

    try {
      setLoading(true);

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          params.append(key, value.toString());
        }
      });

      console.log('📡 Making API request to:', `/api/admin/challenges?${params}`);
      const response = await fetch(`/api/admin/challenges?${params}`);

      console.log('📥 API response status:', response.status);

      if (!response.ok) {
        console.error('❌ API response not ok:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Handle both old and new format
      const responseData = data.data || data;

      console.log('📊 API response data:', {
        success: data.success,
        challengeCount: responseData.challenges?.length || 0,
        summary: responseData.summary,
        pagination: responseData.pagination
      });

      if (data.success) {
        setChallenges(responseData.challenges || []);
        setPagination(responseData.pagination || {});
        setSummary(responseData.summary || {});
        console.log('✅ Challenges loaded successfully');
      } else {
        console.error('❌ API returned error:', data.error);
        setResult({
          success: false,
          error: data.error || 'Failed to load challenges'
        });
      }
    } catch (error) {
      console.error('🚨 Network/API error:', error);
      setResult({
        success: false,
        error: `Network error: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFilters = (newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      offset: 0 // Reset to first page when filters change
    }));
  };

  const changePage = (newOffset) => {
    setFilters(prev => ({ ...prev, offset: newOffset }));
  };

  const startEditing = (challenge) => {
    setEditingChallenge(challenge.room_id);
    setEditingName(challenge.custom_name || challenge.name);
  };

  const cancelEditing = () => {
    setEditingChallenge(null);
    setEditingName('');
  };

  // Delete functions
  const startDelete = (challenge) => {
    setChallengeToDelete(challenge);
    setDeleteConfirmText('');
  };

  const cancelDelete = () => {
    setChallengeToDelete(null);
    setDeleteConfirmText('');
  };

  const confirmDelete = async () => {
    if (!challengeToDelete) return;
    
    const expectedText = `DELETE ${challengeToDelete.room_id}`;
    if (deleteConfirmText !== expectedText) {
      setResult({
        success: false,
        error: `Please type "${expectedText}" to confirm deletion`
      });
      return;
    }

    setDeleting(true);
    
    try {
      const response = await fetch('/api/admin/challenges', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: challengeToDelete.room_id
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: data.message
        });

        // Remove from local state
        setChallenges(prev => prev.filter(c => c.room_id !== challengeToDelete.room_id));
        
        // Update summary
        setSummary(prev => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
          active: challengeToDelete.is_active ? Math.max(0, prev.active - 1) : prev.active,
          inactive: !challengeToDelete.is_active ? Math.max(0, prev.inactive - 1) : prev.inactive,
          withCustomNames: challengeToDelete.custom_name ? Math.max(0, prev.withCustomNames - 1) : prev.withCustomNames,
          withoutCustomNames: !challengeToDelete.custom_name ? Math.max(0, prev.withoutCustomNames - 1) : prev.withoutCustomNames,
          withRulesets: challengeToDelete.has_ruleset ? Math.max(0, prev.withRulesets - 1) : prev.withRulesets,
          withoutRulesets: !challengeToDelete.has_ruleset ? Math.max(0, prev.withoutRulesets - 1) : prev.withoutRulesets
        }));

        cancelDelete();
      } else {
        setResult({
          success: false,
          error: data.error || 'Failed to delete challenge'
        });
      }
    } catch (error) {
      console.error('Error deleting challenge:', error);
      setResult({
        success: false,
        error: 'Network error. Please try again.'
      });
    } finally {
      setDeleting(false);
    }
  };

  // Ruleset management functions
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
      loadChallenges();
    }, 1000);
  };

  const saveChallengeName = async (roomId) => {
    if (!editingName.trim()) {
      setResult({
        success: false,
        error: 'Name cannot be empty'
      });
      return;
    }

    setSavingChanges(prev => new Set([...prev, roomId]));
    
    try {
      const response = await fetch('/api/admin/challenges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          customName: editingName.trim()
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: `Successfully updated "${data.challenge.custom_name || data.challenge.name}"`
        });

        // Update local state
        setChallenges(prev => prev.map(challenge => 
          challenge.room_id === roomId 
            ? { ...challenge, ...data.challenge }
            : challenge
        ));

        setEditingChallenge(null);
        setEditingName('');
        
        // Update summary
        setSummary(prev => ({
          ...prev,
          withCustomNames: prev.withCustomNames + (data.changes.oldValue ? 0 : 1)
        }));
      } else {
        setResult({
          success: false,
          error: data.error || 'Failed to update challenge name'
        });
      }
    } catch (error) {
      console.error('Error updating challenge name:', error);
      setResult({
        success: false,
        error: 'Network error. Please try again.'
      });
    } finally {
      setSavingChanges(prev => {
        const newSet = new Set(prev);
        newSet.delete(roomId);
        return newSet;
      });
    }
  };

  const resetChallengeName = async (roomId) => {
    setSavingChanges(prev => new Set([...prev, roomId]));
    
    try {
      const response = await fetch('/api/admin/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          action: 'reset_name'
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: `Reset "${data.challenge.name}" to original name`
        });

        // Update local state
        setChallenges(prev => prev.map(challenge => 
          challenge.room_id === roomId 
            ? { ...challenge, ...data.challenge }
            : challenge
        ));
        
        // Update summary
        setSummary(prev => ({
          ...prev,
          withCustomNames: Math.max(0, prev.withCustomNames - 1),
          withoutCustomNames: prev.withoutCustomNames + 1
        }));
      } else {
        setResult({
          success: false,
          error: data.error || 'Failed to reset challenge name'
        });
      }
    } catch (error) {
      console.error('Error resetting challenge name:', error);
      setResult({
        success: false,
        error: 'Network error. Please try again.'
      });
    } finally {
      setSavingChanges(prev => {
        const newSet = new Set(prev);
        newSet.delete(roomId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDisplayName = (challenge) => {
    return challenge.custom_name || challenge.name;
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/admin" className="text-primary-600 hover:text-primary-700 transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <Settings className="w-8 h-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-neutral-800">Challenge Management</h1>
          </div>
          <p className="text-neutral-600">
            Edit challenge names, manage rulesets, and configure display settings across all seasons. Challenges are sorted by date ended (most recent first).
          </p>
        </div>

        {/* Enhanced Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
            <div className="text-2xl font-bold text-blue-700">{summary.total || 0}</div>
            <div className="text-sm text-blue-600">Total Challenges</div>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
            <div className="text-2xl font-bold text-green-700">{summary.active || 0}</div>
            <div className="text-sm text-green-600">Active</div>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
            <div className="text-2xl font-bold text-purple-700">{summary.withCustomNames || 0}</div>
            <div className="text-sm text-purple-600">Custom Names</div>
          </div>
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-xl border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-700">{summary.withRulesets || 0}</div>
            <div className="text-sm text-yellow-600">With Rulesets</div>
          </div>
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
            <div className="text-2xl font-bold text-orange-700">{summary.inactive || 0}</div>
            <div className="text-sm text-orange-600">Inactive</div>
          </div>
        </div>

        {/* Enhanced Filters */}
<div className="bg-white rounded-xl border border-neutral-200 p-6 mb-6">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    
    {/* Status Filter */}
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-2">
        Status
      </label>
      <select
        value={filters.status}
        onChange={(e) => updateFilters({ status: e.target.value })}
        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
      >
        <option value="">All Challenges</option>
        <option value="active">Active Only</option>
        <option value="inactive">Inactive Only</option>
      </select>
    </div>
    
    {/* Custom Name Filter */}
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-2">
        Name Type
      </label>
      <select
        value={filters.hasCustomName}
        onChange={(e) => updateFilters({ hasCustomName: e.target.value })}
        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
      >
        <option value="">All Names</option>
        <option value="true">Custom Names Only</option>
        <option value="false">Original Names Only</option>
      </select>
    </div>
    
    {/* Ruleset Filter */}
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-2">
        Ruleset
      </label>
      <select
        value={filters.hasRuleset}
        onChange={(e) => updateFilters({ hasRuleset: e.target.value })}
        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
      >
        <option value="">All Challenges</option>
        <option value="true">With Rulesets</option>
        <option value="false">No Rulesets</option>
      </select>
    </div>
    
    {/* Season Filter - Now on the right */}
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-2">
        Season
      </label>
      <SeasonSelector 
        onSeasonChange={(season) => updateFilters({ season_id: season?.id || '' })}
        currentSeasonId={filters.season_id}
        showAllOption={true}
      />
    </div>
  </div>
</div>

        {/* Results */}
        {result && (
          <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
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
                {result.message || result.error}
              </p>
            </div>
            <button 
              onClick={() => setResult(null)}
              className="text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : challenges.length === 0 ? (
            <div className="text-center py-12">
              <Filter className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
              <p className="text-neutral-500">No challenges found matching your filters</p>
              <button 
                onClick={() => updateFilters({ search: '', status: '', season_id: '', hasCustomName: '', hasRuleset: '' })}
                className="mt-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Room ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Challenge Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Participants
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Date Ended
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {challenges.map((challenge) => {
                      const isEditing = editingChallenge === challenge.room_id;
                      const isSaving = savingChanges.has(challenge.room_id);
                      const rulesetName = generateRulesetDisplayName(challenge);
                      
                      return (
                        <tr key={challenge.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-mono text-neutral-600">
                            {challenge.room_id}
                          </td>
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                  placeholder="Enter challenge name..."
                                  maxLength="500"
                                  disabled={isSaving}
                                />
                                <button
                                  onClick={() => saveChallengeName(challenge.room_id)}
                                  disabled={isSaving || !editingName.trim()}
                                  className="px-3 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1"
                                >
                                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  disabled={isSaving}
                                  className="px-3 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white rounded-md text-xs font-medium transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <div className="font-medium text-neutral-800">
                                    {getDisplayName(challenge)}
                                    {challenge.custom_name && (
                                      <span className="ml-2 text-xs text-purple-600 font-medium bg-purple-100 px-2 py-0.5 rounded-full">
                                        Custom
                                      </span>
                                    )}
                                    {/* Ruleset indicator with generated name */}
                                    {challenge.has_ruleset && rulesetName && (
                                      <span className="ml-2 inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                                        <Crown className="w-3 h-3" />
                                        {rulesetName}
                                      </span>
                                    )}
                                  </div>
                                  {challenge.custom_name && (
                                    <div className="text-sm text-neutral-500 mt-1">
                                      Original: {challenge.name}
                                    </div>
                                  )}
                                  {challenge.seasons && (
                                    <div className="text-xs text-neutral-400 mt-1">
                                      {challenge.seasons.name}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              challenge.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {challenge.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-600">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4 text-neutral-400" />
                              {challenge.participant_count || 0}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-500">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-neutral-400" />
                              {challenge.end_date ? formatDate(challenge.end_date) : 'Still active'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              {!isEditing && (
                                <>
                                  {/* Ruleset Management Button */}
                                  <button
                                    onClick={() => handleManageRuleset(challenge)}
                                    disabled={isSaving}
                                    className="p-2 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 rounded-md transition-colors disabled:opacity-50"
                                    title="Manage Ruleset"
                                  >
                                    <Target className="w-4 h-4" />
                                  </button>
                                  
                                  <button
                                    onClick={() => startEditing(challenge)}
                                    disabled={isSaving}
                                    className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
                                    title="Edit challenge name"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  {challenge.custom_name && (
                                    <button
                                      onClick={() => resetChallengeName(challenge.room_id)}
                                      disabled={isSaving}
                                      className="p-2 text-orange-500 hover:text-orange-700 hover:bg-orange-50 rounded-md transition-colors disabled:opacity-50"
                                      title="Reset to original name"
                                    >
                                      {isSaving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <RotateCcw className="w-4 h-4" />
                                      )}
                                    </button>
                                  )}
                                  
                                  {/* Delete Button */}
                                  <button
                                    onClick={() => startDelete(challenge)}
                                    disabled={isSaving}
                                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                                    title="Delete challenge"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  
                                  <Link href={`/challenges/${challenge.room_id}`}>
                                    <button
                                      className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 rounded-md transition-colors"
                                      title="View challenge"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  </Link>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-neutral-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-neutral-700">
                      Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} challenges
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => changePage(Math.max(0, pagination.offset - pagination.limit))}
                        disabled={!pagination.hasPrev}
                        className="px-3 py-2 border border-neutral-300 rounded-md text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <span className="px-3 py-2 text-sm text-neutral-600">
                        Page {pagination.currentPage} of {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => changePage(pagination.offset + pagination.limit)}
                        disabled={!pagination.hasNext}
                        className="px-3 py-2 border border-neutral-300 rounded-md text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {challengeToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                    Delete Challenge
                  </h3>
                  <p className="text-neutral-600 mb-4">
                    You are about to permanently delete:
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <div className="font-medium text-red-800">
                      {getDisplayName(challengeToDelete)} (Room #{challengeToDelete.room_id})
                    </div>
                    <div className="text-sm text-red-600 mt-1">
                      {challengeToDelete.participant_count || 0} participants • {challengeToDelete.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <div className="text-sm text-yellow-800">
                      <strong>Warning:</strong> This action cannot be undone. All associated playlists, scores, and user participation data will be permanently deleted.
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Type <code className="bg-gray-100 px-1 rounded text-red-600 font-mono">DELETE {challengeToDelete.room_id}</code> to confirm:
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                      placeholder={`DELETE ${challengeToDelete.room_id}`}
                      disabled={deleting}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting || deleteConfirmText !== `DELETE ${challengeToDelete.room_id}`}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Challenge
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

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