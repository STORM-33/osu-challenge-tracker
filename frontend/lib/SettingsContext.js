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
      console.log('🔄 [SettingsContext] Fetching settings for user:', user.id);
      setLoading(true);
      
      const response = await fetch('/api/settings', {
        method: 'GET',
        credentials: 'include'
      });

      console.log('📡 [SettingsContext] Settings fetch response status:', response.status);

      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.status}`);
      }

      const data = await response.json();
      console.log('📋 [SettingsContext] Fetched settings data:', data);
      
      // Fix: Handle the nested data structure
      const responseData = data.data || data;
      
      setSettings(responseData.settings);
      setDonorStatus(responseData.donorStatus);
      setAvailableBackgrounds(responseData.availableBackgrounds || []);
      
      console.log('📋 [SettingsContext] Parsed settings:', responseData.settings);
      console.log('✅ [SettingsContext] Settings loaded successfully');
    } catch (error) {
      console.error('❌ [SettingsContext] Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings, isPreview = false) => {
    console.log('🔧 [SettingsContext] updateSettings called with:', {
      newSettings,
      isPreview,
      user: user?.id
    });

    if (!user) {
      console.error('❌ [SettingsContext] No user authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    if (isPreview) {
      // For preview mode, just update temporary settings locally
      console.log('👁️ [SettingsContext] Preview mode - updating temp settings');
      const newTempSettings = {
        ...settings,
        ...tempSettings,
        ...newSettings
      };
      console.log('📝 [SettingsContext] New temp settings:', newTempSettings);
      setTempSettings(newTempSettings);
      return { success: true };
    }

    try {
      console.log('💾 [SettingsContext] Starting save operation...');
      setSaving(true);
      
      const requestBody = { settings: newSettings };
      console.log('📤 [SettingsContext] Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      console.log('📡 [SettingsContext] Save response status:', response.status);
      console.log('📡 [SettingsContext] Save response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('📋 [SettingsContext] Save response data:', data);

      if (!response.ok) {
        console.error('❌ [SettingsContext] Save failed with status:', response.status);
        console.error('❌ [SettingsContext] Error data:', data);
        return { success: false, error: data.error?.message || 'Failed to update settings' };
      }

      // Update actual settings and clear temp settings
      console.log('✅ [SettingsContext] Save successful, updating local state');
      
      // Fix: Handle the nested data structure
      const responseData = data.data || data;
      console.log('📋 [SettingsContext] New settings from server:', responseData.settings);
      
      setSettings(responseData.settings);
      setTempSettings(null);
      
      console.log('🎉 [SettingsContext] Settings saved and state updated');
      return { success: true, settings: responseData.settings };
    } catch (error) {
      console.error('🚨 [SettingsContext] Save error:', error);
      console.error('🚨 [SettingsContext] Error stack:', error.stack);
      return { success: false, error: error.message };
    } finally {
      setSaving(false);
      console.log('🏁 [SettingsContext] Save operation completed');
    }
  };

  const cancelPreview = () => {
    console.log('❌ [SettingsContext] Canceling preview, clearing temp settings');
    setTempSettings(null);
  };

  const resetSettings = async (category = 'all') => {
    console.log('🔄 [SettingsContext] Resetting settings, category:', category);
    
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
          background_id: null // Updated field name
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

    console.log('🔄 [SettingsContext] Settings to reset:', settingsToReset);
    return await updateSettings(settingsToReset);
  };

  const getDefaultSettings = () => ({
    background_enabled: true,
    background_type: 'gradient',
    background_color: '#FFA500',
    background_gradient_end: '#FF6347',
    background_blur: 50,
    background_dimming: 50,
    background_saturation: 0,
    animations_enabled: true,
    number_format: 'abbreviated',
    default_profile_tab: 'recent',
    profile_visibility: 'public',
    background_id: null, // Updated field name
    donor_effects: {}
  });

  // Get the currently active settings (temp if previewing, otherwise actual)
  const activeSettings = tempSettings || settings || getDefaultSettings();

  // Background style function for Layout component with debug logging
  const getBackgroundStyle = () => {
    console.log('🎨 [SettingsContext] getBackgroundStyle called');
    console.log('🎨 [SettingsContext] activeSettings:', activeSettings);
    console.log('🎨 [SettingsContext] tempSettings:', tempSettings);
    console.log('🎨 [SettingsContext] actual settings:', settings);

    if (!activeSettings.background_enabled) {
      console.log('🎨 [SettingsContext] Background disabled, returning dark color');
      return { backgroundColor: '#0a0a0a' };
    }

    // If user has selected a background image
    if (activeSettings.background_id) {
      console.log('🎨 [SettingsContext] User has background_id:', activeSettings.background_id);
      const selectedBackground = availableBackgrounds.find(bg => bg.id === activeSettings.background_id);
      console.log('🎨 [SettingsContext] Found background:', selectedBackground);
      if (selectedBackground) {
        const style = {
          backgroundImage: `url(${selectedBackground.image_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: `
            blur(${activeSettings.background_blur || 0}px)
            brightness(${100 - (activeSettings.background_dimming || 0)}%)
            saturate(${100 + (activeSettings.background_saturation || 0)}%)
          `.trim()
        };
        console.log('🎨 [SettingsContext] Returning image style:', style);
        return style;
      }
    }

    // Fallback to color/gradient background
    if (activeSettings.background_type === 'gradient') {
      const style = {
        background: `linear-gradient(135deg, ${activeSettings.background_color} 0%, ${activeSettings.background_gradient_end} 100%)`,
        filter: `
          blur(${activeSettings.background_blur || 0}px)
          brightness(${100 - (activeSettings.background_dimming || 0)}%)
          saturate(${100 + (activeSettings.background_saturation || 0)}%)
        `.trim()
      };
      console.log('🎨 [SettingsContext] Returning gradient style:', style);
      console.log('🎨 [SettingsContext] Colors:', {
        start: activeSettings.background_color,
        end: activeSettings.background_gradient_end
      });
      return style;
    } else {
      const style = {
        backgroundColor: activeSettings.background_color,
        filter: `
          blur(${activeSettings.background_blur || 0}px)
          brightness(${100 - (activeSettings.background_dimming || 0)}%)
          saturate(${100 + (activeSettings.background_saturation || 0)}%)
        `.trim()
      };
      console.log('🎨 [SettingsContext] Returning solid style:', style);
      return style;
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