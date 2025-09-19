import { useState, useEffect } from 'react';
import { Save, X, Crown, AlertCircle, CheckCircle, Loader2, Target, Trophy, Settings2, Eye } from 'lucide-react';
import ModSelector from './ModSelector';
import { generateRulesetName, generateRulesetDescription, previewRulesetName } from '../lib/ruleset-name-generator';
import { OSU_MODS, SETTING_RANGES } from '../lib/osu-mods-reference';

export default function RulesetManager({ challengeId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [winner, setWinner] = useState(null);
  const [formData, setFormData] = useState({
    required_mods: [],
    ruleset_match_type: 'exact'
  });
  const [errors, setErrors] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [namePreview, setNamePreview] = useState({ name: '', description: '', isValid: true, modCount: 0 });

  useEffect(() => {
    loadChallengeData();
  }, [challengeId]);

  useEffect(() => {
    // Check if form has changes from original data
    if (challenge) {
      const hasRulesetChanges = 
        formData.ruleset_match_type !== (challenge.ruleset_match_type || 'exact') ||
        JSON.stringify(formData.required_mods) !== JSON.stringify(challenge.required_mods || []);
      
      setHasChanges(hasRulesetChanges);
    }
  }, [formData, challenge]);

  // Update name preview whenever form data changes
  useEffect(() => {
    if (formData.required_mods && formData.ruleset_match_type) {
      try {
        const preview = previewRulesetName(formData.required_mods, formData.ruleset_match_type);
        setNamePreview(preview);
      } catch (error) {
        console.warn('Error generating name preview:', error);
        setNamePreview({ 
          name: 'Error generating name', 
          description: 'Please check your mod selection', 
          isValid: false, 
          modCount: formData.required_mods?.length || 0 
        });
      }
    }
  }, [formData.required_mods, formData.ruleset_match_type]);

  const loadChallengeData = async () => {
    setLoading(true);
    setErrors([]);

    try {
      const response = await fetch(`/api/admin/rulesets/${challengeId}`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load challenge data');
      }

      const responseData = data.data || data;
      setChallenge(responseData.challenge);
      setWinner(responseData.winner);

      // Initialize form with existing data (removed name and description)
      if (data.challenge.has_ruleset) {
        setFormData({
          required_mods: data.challenge.required_mods || [],
          ruleset_match_type: data.challenge.ruleset_match_type || 'exact'
        });
      }

    } catch (error) {
      console.error('Error loading challenge:', error);
      setErrors([error.message]);
    } finally {
      setLoading(false);
    }
  };

  const cleanupSettings = (mods) => {
    return mods.map(mod => {
      const cleanedSettings = {};
      const modInfo = OSU_MODS[mod.acronym];
      
      if (modInfo && modInfo.settings.length > 0) {
        Object.entries(mod.settings || {}).forEach(([key, value]) => {
          const config = SETTING_CONFIGS[key];
          if (config) {
            // Get the default value for this setting
            const defaultValue = typeof config.getDefault === 'function' 
              ? config.getDefault(mod.acronym) 
              : config.default;
            
            // Only include non-default values
            if (value !== defaultValue) {
              cleanedSettings[key] = value;
            }
          }
        });
      }
      
      return {
        acronym: mod.acronym,
        settings: cleanedSettings
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setErrors([]);

    try {
      // Clean up settings to remove default values before saving
      const cleanedMods = cleanupSettings(formData.required_mods);
      
      if (!cleanedMods || cleanedMods.length === 0) {
        throw new Error('At least one mod must be selected');
      }

      // Save ruleset with cleaned mods
      const response = await fetch(`/api/admin/rulesets/${challengeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          required_mods: cleanedMods // Use cleaned mods instead of raw form data
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details && Array.isArray(data.details)) {
          setErrors(data.details);
        } else {
          throw new Error(data.error || 'Failed to save ruleset');
        }
        return;
      }

      // Success
      if (onSuccess) {
        onSuccess('Ruleset saved successfully');
      }

      // Reload data to show updated winner
      await loadChallengeData();

    } catch (error) {
      console.error('Error saving ruleset:', error);
      setErrors([error.message]);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove this ruleset? This action cannot be undone.')) {
      return;
    }

    setSaving(true);
    setErrors([]);

    try {
      const response = await fetch(`/api/admin/rulesets/${challengeId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete ruleset');
      }

      // Success
      if (onSuccess) {
        onSuccess('Ruleset removed successfully');
      }

      onClose();

    } catch (error) {
      console.error('Error deleting ruleset:', error);
      setErrors([error.message]);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-96">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
            <span>Loading challenge data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Settings2 className="w-6 h-6 text-primary-600" />
              Manage Ruleset
            </h2>
            <p className="text-gray-600 mt-1">
              {challenge?.custom_name || challenge?.name} (Room {challenge?.room_id})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Current Winner Display */}
        {challenge?.has_ruleset && winner && (
          <div className="mx-6 mt-6 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Crown className="w-6 h-6 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-900">Current Ruleset Winner</h3>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <div className="flex items-center gap-2">
                    {winner.avatar_url && (
                      <img 
                        src={winner.avatar_url} 
                        alt={`${winner.username}'s avatar`}
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <span className="font-medium text-yellow-800">{winner.username}</span>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-700">
                    <Trophy className="w-4 h-4" />
                    <span>{winner.score?.toLocaleString()}</span>
                  </div>
                  <div className="text-yellow-600">
                    Won {new Date(winner.won_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Name Preview Section */}
        {formData.required_mods.length > 0 && (
          <div className="mx-6 mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Eye className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">Ruleset Preview</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-800">Name:</span>
                <code className="bg-blue-100 text-blue-900 px-2 py-1 rounded text-sm font-mono">
                  {namePreview.name}
                </code>
                {!namePreview.isValid && (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-blue-800">Description:</span>
                <span className="text-sm text-blue-700">{namePreview.description}</span>
              </div>
              <div className="text-xs text-blue-600">
                {namePreview.modCount} mod{namePreview.modCount !== 1 ? 's' : ''} selected • 
                Match type: {formData.ruleset_match_type}
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {errors.length > 0 && (
          <div className="mx-6 mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900">Validation Errors</h4>
                <ul className="mt-2 text-sm text-red-700 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Rule Type */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Ruleset Configuration</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rule Type *
              </label>
              <select
                value={formData.ruleset_match_type}
                onChange={(e) => setFormData(prev => ({ ...prev, ruleset_match_type: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="exact">Exact Match - Players must have exactly these mods (no extras)</option>
                <option value="at_least">At Least - Players must have at least these mods (extras allowed)</option>
                <option value="any_of">Any Of - Players must have at least one of these mods (extras allowed)</option>
              </select>
            </div>
          </div>

          {/* Mod Selection */}
          <div className="space-y-4">
            <ModSelector
              selectedMods={formData.required_mods}
              onChange={(mods) => setFormData(prev => ({ ...prev, required_mods: mods }))}
              matchType={formData.ruleset_match_type}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div>
            {challenge?.has_ruleset && (
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Remove Ruleset
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges || formData.required_mods.length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Ruleset
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}