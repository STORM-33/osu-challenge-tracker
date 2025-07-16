// lib/sync-config.js - Centralized sync configuration
// This file contains all sync-related timing and thresholds

// Environment variables with fallbacks
const SYNC_THRESHOLDS = {
  // How old data must be before it's considered stale (15 minutes)
  SYNC_THRESHOLD: parseInt(process.env.SYNC_THRESHOLD_MS) || 15 * 60 * 1000,
  
  // Global cooldown between syncs for the same resource (5 minutes)
  GLOBAL_COOLDOWN: parseInt(process.env.GLOBAL_COOLDOWN_MS) || 5 * 60 * 1000,
  
  // Polling interval for background sync status (2 minutes)
  POLL_INTERVAL: parseInt(process.env.POLL_INTERVAL_MS) || 2 * 60 * 1000,
  
  // SWR refresh interval for challenges list (5 minutes)
  SWR_REFRESH_INTERVAL: parseInt(process.env.SWR_REFRESH_INTERVAL_MS) || 5 * 60 * 1000,
  
  // SWR refresh interval for individual challenges (1 minute)
  SWR_CHALLENGE_REFRESH_INTERVAL: parseInt(process.env.SWR_CHALLENGE_REFRESH_INTERVAL_MS) || 1 * 60 * 1000,
  
  // Lock timeout for distributed locking (4 minutes)
  LOCK_TIMEOUT: parseInt(process.env.LOCK_TIMEOUT_MS) || 4 * 60 * 1000,
  
  // Completion banner display time (4 seconds)
  COMPLETION_BANNER_DURATION: parseInt(process.env.COMPLETION_BANNER_DURATION_MS) || 4 * 1000,
  
  // Maximum polling attempts before giving up (15 attempts = 30 minutes)
  MAX_POLL_ATTEMPTS: parseInt(process.env.MAX_POLL_ATTEMPTS) || 15,
  
  // Cache cleanup interval (10 minutes)
  CACHE_CLEANUP_INTERVAL: parseInt(process.env.CACHE_CLEANUP_INTERVAL_MS) || 10 * 60 * 1000,
  
  // Rate limit cleanup interval (5 minutes)
  RATE_LIMIT_CLEANUP_INTERVAL: parseInt(process.env.RATE_LIMIT_CLEANUP_INTERVAL_MS) || 5 * 60 * 1000,
  
  // Debounce delay for user interactions (1 second)
  DEBOUNCE_DELAY: parseInt(process.env.DEBOUNCE_DELAY_MS) || 1000,
  
  // Maximum concurrent API requests
  CONCURRENCY_LIMIT: parseInt(process.env.CONCURRENCY_LIMIT) || 4,
  
  // Batch size for processing playlists
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE) || 8,
  
  // Maximum retries for API calls
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES) || 3,
  
  // Estimated sync duration for UI display (30 seconds)
  ESTIMATED_SYNC_DURATION: parseInt(process.env.ESTIMATED_SYNC_DURATION_MS) || 30 * 1000
};

// Priority levels for sync operations
const SYNC_PRIORITIES = {
  AUTO_TRIGGERED: 1,      // Auto-triggered background syncs
  LIST_AUTO_SYNC: 2,      // Auto-syncs from challenges list
  MANUAL_SYNC: 3,         // Manual user-triggered syncs
  BACKGROUND_SYNC: 4,     // Background syncs from individual pages
  NEW_CHALLENGE: 5        // New challenge creation syncs (highest priority)
};

// API usage thresholds
const API_USAGE_THRESHOLDS = {
  WARNING: 70,    // Show warning at 70% usage
  CRITICAL: 90    // Stop syncing at 90% usage
};

// Cache settings
const CACHE_SETTINGS = {
  MAX_ENTRIES: 10000,                    // Maximum cache entries
  CLEANUP_THRESHOLD: 24 * 60 * 60 * 1000, // Remove entries older than 24 hours
  STORAGE_KEY: 'challenge-update-cache'   // SessionStorage key
};

// Export configuration
export const syncConfig = {
  thresholds: SYNC_THRESHOLDS,
  priorities: SYNC_PRIORITIES,
  apiUsage: API_USAGE_THRESHOLDS,
  cache: CACHE_SETTINGS
};

// Helper functions
export const formatDuration = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

export const isStale = (timestamp, thresholdMs = SYNC_THRESHOLDS.SYNC_THRESHOLD) => {
  if (!timestamp) return true;
  return Date.now() - timestamp > thresholdMs;
};

export const getNextSyncTime = (lastSync, thresholdMs = SYNC_THRESHOLDS.SYNC_THRESHOLD) => {
  if (!lastSync) return 0;
  const nextSync = lastSync + thresholdMs;
  return Math.max(0, nextSync - Date.now());
};

// Environment validation
export const validateSyncConfig = () => {
  const errors = [];
  
  // Check if thresholds make sense
  if (SYNC_THRESHOLDS.GLOBAL_COOLDOWN >= SYNC_THRESHOLDS.SYNC_THRESHOLD) {
    errors.push('GLOBAL_COOLDOWN should be less than SYNC_THRESHOLD');
  }
  
  if (SYNC_THRESHOLDS.POLL_INTERVAL >= SYNC_THRESHOLDS.SYNC_THRESHOLD) {
    errors.push('POLL_INTERVAL should be less than SYNC_THRESHOLD');
  }
  
  if (SYNC_THRESHOLDS.LOCK_TIMEOUT <= SYNC_THRESHOLDS.ESTIMATED_SYNC_DURATION) {
    errors.push('LOCK_TIMEOUT should be greater than ESTIMATED_SYNC_DURATION');
  }
  
  if (errors.length > 0) {
    console.warn('🚨 Sync configuration validation warnings:', errors);
  }
  
  return errors;
};

// Debug helper
export const debugSyncConfig = () => {
  console.log('🔧 Sync Configuration:', {
    'Sync Threshold': formatDuration(SYNC_THRESHOLDS.SYNC_THRESHOLD),
    'Global Cooldown': formatDuration(SYNC_THRESHOLDS.GLOBAL_COOLDOWN),
    'Poll Interval': formatDuration(SYNC_THRESHOLDS.POLL_INTERVAL),
    'Lock Timeout': formatDuration(SYNC_THRESHOLDS.LOCK_TIMEOUT),
    'SWR Refresh': formatDuration(SYNC_THRESHOLDS.SWR_REFRESH_INTERVAL),
    'Max Poll Attempts': SYNC_THRESHOLDS.MAX_POLL_ATTEMPTS,
    'Concurrency Limit': SYNC_THRESHOLDS.CONCURRENCY_LIMIT
  });
};

// Auto-validate on import
if (typeof window === 'undefined') {
  validateSyncConfig();
}

export default syncConfig;