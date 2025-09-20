import { useState, useEffect } from 'react';
import { X, Settings, Info, Check, AlertTriangle } from 'lucide-react';
import { OSU_MODS, CONFLICTING_MODS, SETTING_CONFIGS } from '../lib/osu-mods-reference';

export default function ModSelector({ selectedMods = [], onChange, matchType = 'exact' }) {
  const [conflicts, setConflicts] = useState([]);
  const [showSettings, setShowSettings] = useState({});

  useEffect(() => {
    checkConflicts();
  }, [selectedMods]);

  const checkConflicts = () => {
    const modAcronyms = selectedMods.map(mod => mod.acronym);
    const foundConflicts = [];

    for (const conflictGroup of CONFLICTING_MODS) {
      const conflictingFound = modAcronyms.filter(acronym => conflictGroup.includes(acronym));
      if (conflictingFound.length > 1) {
        foundConflicts.push(conflictingFound);
      }
    }

    setConflicts(foundConflicts);
  };

  const handleModToggle = (acronym) => {
    const isSelected = selectedMods.some(mod => mod.acronym === acronym);

    if (isSelected) {
      // Remove mod
      const newMods = selectedMods.filter(mod => mod.acronym !== acronym);
      onChange(newMods);

      // Hide settings panel
      setShowSettings(prev => ({ ...prev, [acronym]: false }));
    } else {
      // Add mod with EMPTY settings initially
      // Only populate settings when user explicitly changes them
      const newMod = {
        acronym,
        settings: {} // Start with empty settings object
      };

      onChange([...selectedMods, newMod]);
    }
  };

  const handleSettingChange = (modAcronym, settingKey, value) => {
    const newMods = selectedMods.map(mod => {
      if (mod.acronym === modAcronym) {
        return {
          ...mod,
          settings: {
            ...mod.settings,
            [settingKey]: value
          }
        };
      }
      return mod;
    });
    onChange(newMods);
  };

  const toggleSettings = (acronym) => {
    setShowSettings(prev => ({
      ...prev,
      [acronym]: !prev[acronym]
    }));
  };

  const getModByCategory = () => {
    const categories = {};
    Object.entries(OSU_MODS).forEach(([acronym, info]) => {
      if (!categories[info.category]) {
        categories[info.category] = [];
      }
      categories[info.category].push({ acronym, ...info });
    });
    return categories;
  };

  const isModSelected = (acronym) => {
    return selectedMods.some(mod => mod.acronym === acronym);
  };

  const getSelectedMod = (acronym) => {
    return selectedMods.find(mod => mod.acronym === acronym);
  };

  const getSettingRange = (config, modAcronym, settingKey) => {
    if (config.getMin && config.getMax) {
      return {
        min: config.getMin(modAcronym),
        max: config.getMax(modAcronym),
        step: config.getStep ? config.getStep(modAcronym) : config.step
      };
    }
    return {
      min: config.min,
      max: config.max,
      step: config.step
    };
  };

  const renderSettingsSummary = (selectedMod) => {
    if (!selectedMod.settings || Object.keys(selectedMod.settings).length === 0) {
      return null;
    }

    const summaryItems = [];
    Object.entries(selectedMod.settings).forEach(([key, value]) => {
      const config = SETTING_CONFIGS[key];
      if (config && config.format) {
        summaryItems.push(`${config.label}: ${config.format(value)}`);
      } else if (config && config.type === 'boolean') {
        if (value) summaryItems.push(config.label);
      } else if (config && config.type === 'select') {
        const option = config.options.find(opt => opt.value === value);
        if (option) summaryItems.push(`${config.label}: ${option.label}`);
      } else if (value !== undefined) {
        summaryItems.push(`${config?.label || key}: ${value}`);
      }
    });

    return summaryItems.length > 0 ? ` (${summaryItems.join(', ')})` : null;
  };

  const categories = getModByCategory();

  return (
    <div className="space-y-6">

      {/* Conflicts Warning */}
      {conflicts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-900 mb-1">Mod Conflicts Detected</h4>
              {conflicts.map((conflictGroup, index) => (
                <p key={index} className="text-sm text-red-700">
                  {conflictGroup.join(', ')} cannot be used together
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Selected Mods Summary */}
      {selectedMods.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">Selected Mods ({selectedMods.length})</h4>
          <div className="flex flex-wrap gap-2">
            {selectedMods.map(mod => {
              const settingsSummary = renderSettingsSummary(mod);
              return (
                <div key={mod.acronym} className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                  <span className="font-medium">{mod.acronym}</span>
                  {settingsSummary && (
                    <span className="text-xs opacity-75">{settingsSummary}</span>
                  )}
                  {Object.keys(mod.settings || {}).length > 0 && (
                    <Settings className="w-3 h-3" />
                  )}
                  <button
                    onClick={() => handleModToggle(mod.acronym)}
                    className="text-green-600 hover:text-green-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mod Categories */}
      {Object.entries(categories).map(([category, mods]) => (
        <div key={category} className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
            {category}
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {mods.map(mod => {
              const isSelected = isModSelected(mod.acronym);
              const selectedMod = getSelectedMod(mod.acronym);
              const hasSettings = mod.settings.length > 0;

              return (
                <div key={mod.acronym} className="space-y-2">
                  <button
                    onClick={() => handleModToggle(mod.acronym)}
                    className={`w-full p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-lg">{mod.acronym}</div>
                        <div className="text-sm opacity-75">{mod.name}</div>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-blue-600" />}
                    </div>
                  </button>

                  {/* Settings Button */}
                  {isSelected && hasSettings && (
                    <button
                      onClick={() => toggleSettings(mod.acronym)}
                      className={`w-full p-2 rounded-lg border text-sm transition-colors ${
                        showSettings[mod.acronym]
                          ? 'border-blue-300 bg-blue-100 text-blue-800'
                          : 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </div>
                    </button>
                  )}

                  {/* Settings Panel */}
                  {isSelected && hasSettings && showSettings[mod.acronym] && selectedMod && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                      <h4 className="font-medium text-gray-800">{mod.name} Settings</h4>

                      {mod.settings.map(settingKey => {
                        const config = SETTING_CONFIGS[settingKey];
                        if (!config) return null;

                        const currentValue = selectedMod.settings[settingKey] ?? 
                          (typeof config.getDefault === 'function' ? config.getDefault(mod.acronym) : config.default);

                        return (
                          <div key={settingKey} className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              {config.label}
                              {config.format && (
                                <span className="ml-2 text-gray-500">
                                  ({config.format(currentValue)})
                                </span>
                              )}
                            </label>

                            {config.type === 'boolean' && (
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={currentValue}
                                  onChange={(e) => handleSettingChange(mod.acronym, settingKey, e.target.checked)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-600">Enable</span>
                              </label>
                            )}

                            {config.type === 'range' && (
                              <div className="space-y-2">
                                {(() => {
                                  const range = getSettingRange(config, mod.acronym, settingKey);
                                  return (
                                    <>
                                      {/* Current value display - larger and more prominent */}
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700">
                                          Current: 
                                          <span className="ml-1 text-blue-600 font-semibold">
                                            {config.format ? config.format(currentValue) : currentValue}
                                          </span>
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          Range: {range.min} - {range.max}
                                        </span>
                                      </div>

                                      {/* Range input with improved styling */}
                                      <div className="relative">
                                        <input
                                          type="range"
                                          min={range.min}
                                          max={range.max}
                                          step={range.step}
                                          value={currentValue}
                                          onChange={(e) => handleSettingChange(mod.acronym, settingKey, parseFloat(e.target.value))}
                                          className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                          style={{
                                            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((currentValue - range.min) / (range.max - range.min)) * 100}%, #e5e7eb ${((currentValue - range.min) / (range.max - range.min)) * 100}%, #e5e7eb 100%)`
                                          }}
                                        />

                                        {/* Value indicator on slider */}
                                        <div 
                                          className="absolute top-0 w-1 h-3 bg-blue-700 rounded-full pointer-events-none"
                                          style={{
                                            left: `calc(${((currentValue - range.min) / (range.max - range.min)) * 100}% - 2px)`
                                          }}
                                        />
                                      </div>

                                      {/* Min/max labels */}
                                      <div className="flex justify-between text-xs text-gray-500">
                                        <span>{config.format ? config.format(range.min) : range.min}</span>
                                        <span>{config.format ? config.format(range.max) : range.max}</span>
                                      </div>

                                      {/* Default value indicator if different from current */}
                                      {(() => {
                                        const defaultValue = typeof config.getDefault === 'function' 
                                          ? config.getDefault(mod.acronym) 
                                          : config.default;

                                        if (defaultValue !== currentValue) {
                                          return (
                                            <div className="text-xs text-gray-500 italic">
                                              Default: {config.format ? config.format(defaultValue) : defaultValue}
                                              <button
                                                type="button"
                                                onClick={() => handleSettingChange(mod.acronym, settingKey, defaultValue)}
                                                className="ml-2 px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-xs transition-colors"
                                              >
                                                Reset
                                              </button>
                                            </div>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </>
                                  );
                                })()}
                              </div>
                            )}

                            {config.type === 'number' && (
                              <input
                                type="number"
                                value={currentValue}
                                onChange={(e) => handleSettingChange(mod.acronym, settingKey, parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            )}

                            {config.type === 'select' && (
                              <select
                                value={currentValue}
                                onChange={(e) => {
                                  const val = config.options.find(opt => opt.value.toString() === e.target.value)?.value;
                                  handleSettingChange(mod.acronym, settingKey, val);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                {config.options.map(option => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}