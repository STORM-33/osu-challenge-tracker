import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';

const SettingsContext = createContext();

const STORAGE_KEY = 'user_settings_cache';
const CACHE_VERSION = 1;

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

// Helper functions for local storage
const getCachedSettings = (userId) => {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    
    if (parsed.version !== CACHE_VERSION || 
        Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(`${STORAGE_KEY}_${userId}`);
      return null;
    }
    
    return parsed.data;
  } catch (error) {
    console.error('Error reading cached settings:', error);
    return null;
  }
};

const setCachedSettings = (userId, data) => {
  if (typeof window === 'undefined') return;
  
  try {
    const cacheData = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      data: {
        ...data,
        timestamp: Date.now()
      }
    };
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error caching settings:', error);
  }
};

const clearCachedSettings = (userId) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${STORAGE_KEY}_${userId}`);
  } catch (error) {
    console.error('Error clearing cached settings:', error);
  }
};

export const SettingsProvider = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [tempSettings, setTempSettings] = useState(null);
  const [donorStatus, setDonorStatus] = useState(null);
  const [availableBackgrounds, setAvailableBackgrounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);

  useEffect(() => {
    if (user) {
      const cached = getCachedSettings(user.id);
      if (cached) {
        console.log('✅ Loaded settings from cache');
        setSettings(cached.settings);
        setDonorStatus(cached.donorStatus);
        setAvailableBackgrounds(cached.availableBackgrounds || []);
        setIsFromCache(true);
        setLoading(false);
        
        const cacheAge = Date.now() - (cached.timestamp || 0);
        if (cacheAge > 5 * 60 * 1000) {
          fetchSettings();
        }
      } else {
        fetchSettings();
      }
    } else {
      setSettings(null);
      setTempSettings(null);
      setDonorStatus(null);
      setAvailableBackgrounds([]);
      setLoading(false);
      setIsFromCache(false);
    }
  }, [user?.id]);

  const fetchSettings = useCallback(async () => {
    if (!user) return;

    try {
      if (!isFromCache) {
        setLoading(true);
      }
      
      const response = await fetch('/api/settings', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.status}`);
      }

      const data = await response.json();
      const responseData = data.data || data;
      
      setSettings(responseData.settings);
      setDonorStatus(responseData.donorStatus);
      setAvailableBackgrounds(responseData.availableBackgrounds || []);
      
      setCachedSettings(user.id, {
        settings: responseData.settings,
        donorStatus: responseData.donorStatus,
        availableBackgrounds: responseData.availableBackgrounds || []
      });
      
      console.log('✅ Settings updated from API');
    } catch (error) {
      console.error('Error fetching settings:', error);
      if (!isFromCache) {
        console.error('Failed to load settings and no cache available');
      }
    } finally {
      setLoading(false);
    }
  }, [user, isFromCache]);

  const updateSettings = async (newSettings, isPreview = false) => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    if (isPreview) {
      const newTempSettings = {
        ...settings,
        ...tempSettings,
        ...newSettings
      };
      setTempSettings(newTempSettings);
      return { success: true };
    }

    try {
      setSaving(true);
      
      const requestBody = { settings: newSettings };
      
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error?.message || 'Failed to update settings' };
      }

      const responseData = data.data || data;
      
      setSettings(responseData.settings);
      setTempSettings(null);
      
      setCachedSettings(user.id, {
        settings: responseData.settings,
        donorStatus,
        availableBackgrounds
      });
      
      return { success: true, settings: responseData.settings };
    } catch (error) {
      console.error('Error saving settings:', error);
      return { success: false, error: error.message };
    } finally {
      setSaving(false);
    }
  };

  const cancelPreview = () => {
    setTempSettings(null);
  };

  const resetSettings = async (category = 'all') => {
    if (!user) return { success: false, error: 'User not authenticated' };

    const defaultSettings = getDefaultSettings();
    let settingsToReset = {};

    switch (category) {
      case 'appearance':
        settingsToReset = {
          background_type: defaultSettings.background_type,
          background_gradient_type: defaultSettings.background_gradient_type,
          background_gradient_angle: defaultSettings.background_gradient_angle,
          background_color: defaultSettings.background_color,
          background_gradient_end: defaultSettings.background_gradient_end,
          background_blur: defaultSettings.background_blur,
          background_dimming: defaultSettings.background_dimming,
          background_saturation: defaultSettings.background_saturation,
          background_id: null
        };
        break;
      case 'privacy':
        settingsToReset = {
          profile_visibility: defaultSettings.profile_visibility
        };
        break;
      default:
        settingsToReset = defaultSettings;
    }

    const result = await updateSettings(settingsToReset);
    
    if (result.success) {
      clearCachedSettings(user.id);
    }
    
    return result;
  };

  const getDefaultSettings = () => ({
    background_type: 'gradient',
    background_gradient_type: 'linear',
    background_gradient_angle: 135,
    background_color: '#FF5714',
    background_gradient_end: '#1056F9',
    background_blur: 50,
    background_dimming: 50,
    background_saturation: 0,
    animations_enabled: true,
    number_format: 'abbreviated',
    default_profile_tab: 'recent',
    profile_visibility: 'public',
    background_id: null,
    donor_effects: {}
  });

  const activeSettings = tempSettings || settings || getDefaultSettings();

  // Generate gradient CSS based on type
  const generateGradientCSS = useCallback((type, angle, startColor, endColor) => {
    switch (type) {
      case 'linear':
        return `linear-gradient(${angle}deg, ${startColor} 0%, ${endColor} 100%)`;
      case 'radial':
        return `radial-gradient(circle at center, ${startColor} 0%, ${endColor} 100%)`;
      case 'conic':
        return `conic-gradient(from 0deg at center, ${startColor} 0%, ${endColor} 50%, ${startColor} 100%)`;
      default:
        return `linear-gradient(135deg, ${startColor} 0%, ${endColor} 100%)`;
    }
  }, []);

  const backgroundStyle = useMemo(() => {

    if (activeSettings.background_id) {
      const selectedBackground = availableBackgrounds.find(bg => bg.id === activeSettings.background_id);
      if (selectedBackground) {
        return {
          backgroundImage: `url(${selectedBackground.image_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: `
            blur(${activeSettings.background_blur || 0}px)
            brightness(${100 - (activeSettings.background_dimming || 0)}%)
            saturate(${100 + (activeSettings.background_saturation || 0)}%)
          `.trim()
        };
      }
    }

    if (activeSettings.background_type === 'gradient') {
      const gradientType = activeSettings.background_gradient_type || 'linear';
      const gradientAngle = activeSettings.background_gradient_angle || 135;
      
      return {
        background: generateGradientCSS(
          gradientType,
          gradientAngle,
          activeSettings.background_color,
          activeSettings.background_gradient_end
        ),
        filter: `
          blur(${activeSettings.background_blur || 0}px)
          brightness(${100 - (activeSettings.background_dimming || 0)}%)
          saturate(${100 + (activeSettings.background_saturation || 0)}%)
        `.trim()
      };
    } else {
      return {
        backgroundColor: activeSettings.background_color,
        filter: `
          blur(${activeSettings.background_blur || 0}px)
          brightness(${100 - (activeSettings.background_dimming || 0)}%)
          saturate(${100 + (activeSettings.background_saturation || 0)}%)
        `.trim()
      };
    }
  }, [
    activeSettings.background_id,
    activeSettings.background_type,
    activeSettings.background_gradient_type,
    activeSettings.background_gradient_angle,
    activeSettings.background_color,
    activeSettings.background_gradient_end,
    activeSettings.background_blur,
    activeSettings.background_dimming,
    activeSettings.background_saturation,
    availableBackgrounds,
    generateGradientCSS
  ]);

  const getBackgroundStyle = useCallback(() => backgroundStyle, [backgroundStyle]);

  const value = {
    settings: activeSettings,
    tempSettings,
    donorStatus,
    availableBackgrounds,
    loading,
    saving,
    isFromCache,
    backgroundStyle,
    updateSettings,
    cancelPreview,
    resetSettings,
    fetchSettings,
    getBackgroundStyle
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};