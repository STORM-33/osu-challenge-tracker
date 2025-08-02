import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/router';

const SettingsContext = createContext();

const DEFAULT_SETTINGS = {
  // Appearance settings
  background_enabled: true,
  background_type: 'gradient',
  background_color: '#FF5714',
  background_gradient_end: '#1056F9',
  background_blur: 6,
  background_dimming: 50,
  background_saturation: 0,
  
  // Privacy
  profile_visibility: 'public',
  
  // Donor features
  donor_background_id: null,
  donor_effects: {}
};

// Settings cache key for localStorage
const SETTINGS_CACHE_KEY = 'user_settings_cache';
const SETTINGS_CACHE_TTL = 300000; // 5 minutes

export function SettingsProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [tempSettings, setTempSettings] = useState(null); // For preview
  const [donorStatus, setDonorStatus] = useState(null);
  const [availableBackgrounds, setAvailableBackgrounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // Load cached settings from localStorage immediately
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          // Use cached data if less than TTL and has valid structure
          if (Date.now() - timestamp < SETTINGS_CACHE_TTL && data.background_enabled !== undefined) {
            console.log('📱 Loading settings from localStorage cache');
            setSettings({ ...DEFAULT_SETTINGS, ...data });
          }
        }
      } catch (error) {
        console.warn('Failed to load settings from localStorage:', error);
      }
    }
  }, []);

  // Load settings when user changes
  useEffect(() => {
    if (!authLoading) {
      if (user) {
        loadUserSettings();
      } else {
        // Reset to defaults when logged out
        setSettings(DEFAULT_SETTINGS);
        setDonorStatus(null);
        setAvailableBackgrounds([]);
        setLoading(false);
        // Clear cache
        if (typeof window !== 'undefined') {
          localStorage.removeItem(SETTINGS_CACHE_KEY);
        }
      }
    }
  }, [user, authLoading]);

  const loadUserSettings = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/settings', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'max-age=300' // 5 minutes cache
        }
      });

      if (response.ok) {
        const data = await response.json();
        const responseData = data.data || data;
        
        const userSettings = { ...DEFAULT_SETTINGS, ...(responseData.settings || {}) };
        setSettings(userSettings);
        setDonorStatus(responseData.donorStatus);
        setAvailableBackgrounds(responseData.availableBackgrounds || []);

        // Cache in localStorage
        if (typeof window !== 'undefined') {
          try {
            const cacheData = {
              data: userSettings,
              timestamp: Date.now()
            };
            localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(cacheData));
          } catch (error) {
            console.warn('Failed to cache settings:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = useCallback(async (newSettings, isPreview = false) => {
    if (isPreview) {
      // Just update temp settings for preview
      setTempSettings({ ...settings, ...newSettings });
      return;
    }

    // Actually save settings
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ settings: newSettings })
      });

      if (response.ok) {
        const data = await response.json();
        const responseData = data.data || data;
        const updatedSettings = responseData.settings;
        
        setSettings(updatedSettings);
        setTempSettings(null); // Clear preview

        // Update cache
        if (typeof window !== 'undefined') {
          try {
            const cacheData = {
              data: updatedSettings,
              timestamp: Date.now()
            };
            localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(cacheData));
          } catch (error) {
            console.warn('Failed to update settings cache:', error);
          }
        }

        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.error?.message || 'Failed to save settings' };
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      return { success: false, error: 'Network error' };
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const resetSettings = useCallback(async (section = 'all') => {
    let resetData = {};
    
    if (section === 'all') {
      resetData = DEFAULT_SETTINGS;
    } else if (section === 'appearance') {
      resetData = {
        background_enabled: DEFAULT_SETTINGS.background_enabled,
        background_type: DEFAULT_SETTINGS.background_type,
        background_color: DEFAULT_SETTINGS.background_color,
        background_gradient_end: DEFAULT_SETTINGS.background_gradient_end,
        background_blur: DEFAULT_SETTINGS.background_blur,
        background_dimming: DEFAULT_SETTINGS.background_dimming,
        background_saturation: DEFAULT_SETTINGS.background_saturation,
        donor_background_id: null
      };
    }
    
    return updateSettings(resetData);
  }, [updateSettings]);

  const cancelPreview = useCallback(() => {
    setTempSettings(null);
  }, []);

  // Get current settings (with temp override for preview)
  const currentSettings = tempSettings || settings;

  // Generate background style based on settings
  const getBackgroundStyle = useCallback(() => {
    if (!currentSettings.background_enabled) {
      return { backgroundColor: '#0a0a0a' }; // Dark fallback
    }

    // Check for donor background
    if (currentSettings.donor_background_id && availableBackgrounds.length > 0) {
      const donorBg = availableBackgrounds.find(bg => bg.id === currentSettings.donor_background_id);
      if (donorBg) {
        return {
          backgroundImage: `url(${donorBg.image_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: `blur(${currentSettings.background_blur}px) brightness(${(100 - currentSettings.background_dimming) / 100}) saturate(${1 + currentSettings.background_saturation / 100})`
        };
      }
    }

    // Default gradient/solid background
    if (currentSettings.background_type === 'gradient') {
      return {
        background: `linear-gradient(135deg, ${currentSettings.background_color} 0%, ${currentSettings.background_gradient_end} 100%)`,
        filter: `blur(${currentSettings.background_blur}px) brightness(${(100 - currentSettings.background_dimming) / 100}) saturate(${1 + currentSettings.background_saturation / 100})`
      };
    } else {
      return {
        backgroundColor: currentSettings.background_color,
        filter: `blur(${currentSettings.background_blur}px) brightness(${(100 - currentSettings.background_dimming) / 100}) saturate(${1 + currentSettings.background_saturation / 100})`
      };
    }
  }, [currentSettings, availableBackgrounds]);

  const value = {
    settings: currentSettings,
    tempSettings,
    donorStatus,
    availableBackgrounds,
    loading,
    saving,
    updateSettings,
    resetSettings,
    cancelPreview,
    getBackgroundStyle,
    reloadSettings: loadUserSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  
  return context;
}