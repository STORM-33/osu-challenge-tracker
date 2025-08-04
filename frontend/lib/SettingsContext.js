import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [tempSettings, setTempSettings] = useState(null);
  const [donorStatus, setDonorStatus] = useState(null);
  const [availableBackgrounds, setAvailableBackgrounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch settings when user changes
  useEffect(() => {
    if (user) {
      fetchSettings();
    } else {
      // Clear settings when user logs out
      setSettings(null);
      setTempSettings(null);
      setDonorStatus(null);
      setAvailableBackgrounds([]);
      setLoading(false);
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const response = await fetch('/api/settings', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle the nested data structure
      const responseData = data.data || data;
      
      setSettings(responseData.settings);
      setDonorStatus(responseData.donorStatus);
      setAvailableBackgrounds(responseData.availableBackgrounds || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings, isPreview = false) => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    if (isPreview) {
      // For preview mode, just update temporary settings locally
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

      // Update actual settings and clear temp settings
      const responseData = data.data || data;
      
      setSettings(responseData.settings);
      setTempSettings(null);
      
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
          background_enabled: defaultSettings.background_enabled,
          background_type: defaultSettings.background_type,
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

    return await updateSettings(settingsToReset);
  };

  const getDefaultSettings = () => ({
    background_enabled: true,
    background_type: 'gradient',
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

  // Get the currently active settings (temp if previewing, otherwise actual)
  const activeSettings = tempSettings || settings || getDefaultSettings();

  // Background style function for Layout component
  const getBackgroundStyle = () => {
    if (!activeSettings.background_enabled) {
      return { backgroundColor: '#0a0a0a' };
    }

    // If user has selected a background image
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

    // Fallback to color/gradient background
    if (activeSettings.background_type === 'gradient') {
      return {
        background: `linear-gradient(135deg, ${activeSettings.background_color} 0%, ${activeSettings.background_gradient_end} 100%)`,
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
  };

  const value = {
    settings: activeSettings,
    tempSettings,
    donorStatus,
    availableBackgrounds,
    loading,
    saving,
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