// lib/debug-sync.js - Debug script to test sync configuration
import { syncConfig, validateSyncConfig, debugSyncConfig } from './sync-config';

// Only import server-side modules if we're on the server
let syncManager = null;
let globalUpdateTracker = null;

if (typeof window === 'undefined') {
  // Server-side imports
  syncManager = require('./sync-manager').default;
  globalUpdateTracker = require('./global-update-tracker').default;
} else {
  // Client-side - try to import without causing errors
  try {
    import('./sync-manager').then(module => {
      syncManager = module.default;
    }).catch(err => {
      console.warn('Could not load sync-manager on client:', err.message);
    });
    
    import('./global-update-tracker').then(module => {
      globalUpdateTracker = module.default;
    }).catch(err => {
      console.warn('Could not load global-update-tracker on client:', err.message);
    });
  } catch (err) {
    console.warn('Debug tools not available on client:', err.message);
  }
}

// Test all sync components
export const runSyncDiagnostics = async () => {
  console.log('🔧 Starting Sync Diagnostics...\n');
  
  // 1. Test configuration validation
  console.log('1. Testing Configuration Validation:');
  const configErrors = validateSyncConfig();
  if (configErrors.length === 0) {
    console.log('✅ Configuration validation passed');
  } else {
    console.log('❌ Configuration validation failed:', configErrors);
  }
  
  // 2. Display configuration
  console.log('\n2. Current Configuration:');
  debugSyncConfig();
  
  // 3. Test sync manager
  console.log('\n3. Testing Sync Manager:');
  const syncStats = syncManager.getStats();
  console.log('📊 Sync Manager Stats:', {
    activeJobs: syncStats.activeJobs,
    globalCooldowns: syncStats.globalCooldowns,
    thresholds: syncStats.thresholds
  });
  
  // 4. Test global update tracker
  console.log('\n4. Testing Global Update Tracker:');
  const trackerStats = globalUpdateTracker.getStats();
  console.log('📊 Global Update Tracker Stats:', {
    totalCached: trackerStats.totalCached,
    threshold: trackerStats.threshold,
    maxEntries: trackerStats.maxEntries
  });
  
  // 5. Test staleness check (if possible)
  console.log('\n5. Testing Staleness Check:');
  try {
    // Test with a sample challenge ID if available
    const canSyncResult = await syncManager.canSync('challenge', '1496014');
    console.log('🔍 Can sync test challenge:', canSyncResult);
  } catch (error) {
    console.log('⚠️ Could not test staleness check:', error.message);
  }
  
  console.log('\n🔧 Sync Diagnostics Complete\n');
};

// Test specific sync thresholds
export const testSyncThresholds = () => {
  console.log('🔧 Testing Sync Thresholds:\n');
  
  const now = Date.now();
  const testTimestamps = [
    now - (5 * 60 * 1000),    // 5 minutes ago
    now - (10 * 60 * 1000),   // 10 minutes ago
    now - (15 * 60 * 1000),   // 15 minutes ago
    now - (20 * 60 * 1000),   // 20 minutes ago
    now - (30 * 60 * 1000),   // 30 minutes ago
  ];
  
  testTimestamps.forEach((timestamp, index) => {
    const ageMinutes = Math.floor((now - timestamp) / 60000);
    const isStale = (now - timestamp) > syncConfig.thresholds.SYNC_THRESHOLD;
    
    console.log(`Test ${index + 1}: ${ageMinutes}min ago - ${isStale ? '❌ STALE' : '✅ FRESH'}`);
  });
  
  console.log(`\nThreshold: ${syncConfig.thresholds.SYNC_THRESHOLD / 60000}min`);
  console.log('Expected: First 2 tests should be FRESH, last 3 should be STALE\n');
};

// Test challenge staleness specifically
export const testChallengeStale = async (roomId) => {
  console.log(`🔧 Testing Challenge ${roomId} Staleness:\n`);
  
  try {
    // Test with sync manager
    const canSyncResult = await syncManager.canSync('challenge', roomId.toString());
    console.log('🔍 Sync Manager Result:', canSyncResult);
    
    // Test staleness check directly
    const stalenessResult = await syncManager.checkStaleness('challenge', roomId.toString());
    console.log('🔍 Staleness Check Result:', stalenessResult);
    
    // Test with global update tracker
    const mockChallenge = {
      room_id: roomId,
      is_active: true,
      updated_at: new Date(Date.now() - (20 * 60 * 1000)).toISOString() // 20 minutes ago
    };
    
    const needsUpdate = globalUpdateTracker.needsUpdate(mockChallenge);
    console.log('🔍 Global Update Tracker Result:', needsUpdate);
    
  } catch (error) {
    console.error('❌ Error testing challenge staleness:', error);
  }
  
  console.log('\n🔧 Challenge Staleness Test Complete\n');
};

// Monitor sync activity
export const monitorSyncActivity = (duration = 60000) => {
  console.log(`🔧 Monitoring Sync Activity for ${duration / 1000}s...\n`);
  
  const startTime = Date.now();
  
  const interval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, duration - elapsed);
    
    const syncStats = syncManager.getStats();
    console.log(`⏱️  ${Math.floor(remaining / 1000)}s remaining - Active jobs: ${syncStats.activeJobs}, Cooldowns: ${syncStats.globalCooldowns}`);
    
    if (remaining <= 0) {
      clearInterval(interval);
      console.log('\n🔧 Sync Activity Monitoring Complete\n');
    }
  }, 5000);
  
  return interval;
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.debugSync = {
    runDiagnostics: runSyncDiagnostics,
    testThresholds: testSyncThresholds,
    testChallenge: testChallengeStale,
    monitorActivity: monitorSyncActivity,
    config: syncConfig,
    manager: syncManager,
    tracker: globalUpdateTracker
  };
  
  console.log('🔧 Sync Debug Tools Available:');
  console.log('- window.debugSync.runDiagnostics()');
  console.log('- window.debugSync.testThresholds()');
  console.log('- window.debugSync.testChallenge(roomId)');
  console.log('- window.debugSync.monitorActivity(duration)');
}