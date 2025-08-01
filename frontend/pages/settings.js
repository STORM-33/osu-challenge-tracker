import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { useSettings } from '../lib/SettingsContext';
import AppearanceTab from '../components/settings/AppearanceTab';
import DonorPerksTab from '../components/settings/DonorPerksTab';
import { Settings, Palette, Gift, Save, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { settings, tempSettings, saving, updateSettings, cancelPreview } = useSettings();
  const [activeTab, setActiveTab] = useState('appearance');
  const [hasChanges, setHasChanges] = useState(false);
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Track if there are unsaved changes
  useEffect(() => {
    setHasChanges(!!tempSettings);
  }, [tempSettings]);

  const handleSave = async () => {
    if (!tempSettings) return;
    
    const result = await updateSettings(tempSettings, false);
    
    if (result.success) {
      toast.success('Settings saved successfully!');
      setHasChanges(false);
    } else {
      toast.error(result.error || 'Failed to save settings');
    }
  };

  const handleCancel = () => {
    cancelPreview();
    setHasChanges(false);
    toast('Changes discarded');
  };

  if (authLoading || !user) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-white/70" />
        </div>
      </Layout>
    );
  }

  // Only appearance and donor tabs remain
  const tabs = [
    { id: 'appearance', name: 'Appearance', icon: Palette },
    { id: 'donor', name: 'Donor Perks', icon: Gift }
  ];

  return (
    <Layout>
      <div className="min-h-screen py-4 sm:py-8">
        <div className="max-w-6xl mx-auto px-3 sm:px-4">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-4xl font-bold text-white text-shadow-adaptive flex items-center gap-3">
              <Settings className="w-6 h-6 sm:w-8 sm:h-8 icon-shadow-adaptive" />
              Settings
            </h1>
            <p className="text-white/80 mt-2 text-shadow-adaptive-sm text-sm sm:text-base">
              Customize your osu!Challengers experience
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Sidebar Navigation - Fixed Width */}
            <div className="lg:col-span-1">
              <div className="glass-1 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-2">
                {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                    <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all min-w-0 border-3 ${
                        isActive 
                        ? 'glass-2 text-white shadow-lg border-white/20' 
                        : 'hover:glass-1 text-white/80 hover:text-white border-transparent hover:border-white/10'
                    }`}
                    style={{ minWidth: '140px' }}
                    >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'icon-shadow-adaptive' : 'icon-shadow-adaptive-sm'}`} />
                    <span className="font-medium text-shadow-adaptive-sm truncate">{tab.name}</span>
                    </button>
                );
                })}
              </div>

              {/* Save/Cancel Actions - Desktop */}
              {hasChanges && (
                <div className="mt-4 glass-1 rounded-xl sm:rounded-2xl p-4 space-y-3 hidden lg:block">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="w-full btn-secondary flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Discard
                  </button>
                </div>
              )}
            </div>

            {/* Content Area */}
            <div className="lg:col-span-3">
              <div className="glass-1 rounded-xl sm:rounded-2xl p-4 sm:p-8">
                {activeTab === 'appearance' && <AppearanceTab />}
                {activeTab === 'donor' && <DonorPerksTab />}
              </div>
            </div>
          </div>

          {/* Mobile Save/Cancel Actions */}
          {hasChanges && (
            <div className="fixed bottom-0 left-0 right-0 p-4 glass-1 border-t border-white/20 flex gap-3 lg:hidden z-50">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm"
              >
                <X className="w-4 h-4" />
                Discard
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}