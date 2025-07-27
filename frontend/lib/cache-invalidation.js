import { memoryCache } from './memory-cache';

export class CacheInvalidator {
  constructor() {
    this.patterns = new Map();
  }

  // Register cache patterns that should be invalidated together
  registerPattern(pattern, keys) {
    this.patterns.set(pattern, keys);
  }

  // Invalidate caches by pattern
  invalidate(pattern) {
    const keys = this.patterns.get(pattern) || [];
    
    keys.forEach(key => {
      // Support wildcards
      if (key.includes('*')) {
        const prefix = key.replace('*', '');
        const cacheStats = memoryCache.getStats();
        cacheStats.keys.forEach(cacheKey => {
          if (cacheKey.startsWith(prefix)) {
            memoryCache.delete(cacheKey);
            console.log(`🗑️ Invalidated cache: ${cacheKey}`);
          }
        });
      } else {
        memoryCache.delete(key);
        console.log(`🗑️ Invalidated cache: ${key}`);
      }
    });

    // Also clear relevant localStorage
    if (typeof window !== 'undefined') {
      keys.forEach(key => {
        if (key.includes('*')) {
          const prefix = `cache_/api/${key.replace('*', '')}`;
          Object.keys(localStorage).forEach(storageKey => {
            if (storageKey.startsWith(prefix)) {
              localStorage.removeItem(storageKey);
            }
          });
        }
      });
    }
  }
}

// Export singleton
export const cacheInvalidator = new CacheInvalidator();

// Register common patterns
cacheInvalidator.registerPattern('challenges', [
  'challenges_list_*',
  'challenge_*'
]);

cacheInvalidator.registerPattern('leaderboard', [
  'leaderboard_*'
]);

cacheInvalidator.registerPattern('partners', [
  'partners_*'
]);

cacheInvalidator.registerPattern('seasons', [
  'current_season_*',
  'seasons_*'
]);

cacheInvalidator.registerPattern('stats', [
  'stats_*'
]);

// Helper function to invalidate after updates
export function invalidateAfterUpdate(type, id = null) {
  switch (type) {
    case 'challenge':
      cacheInvalidator.invalidate('challenges');
      cacheInvalidator.invalidate('leaderboard');
      cacheInvalidator.invalidate('stats');
      break;
    case 'partner':
      cacheInvalidator.invalidate('partners');
      break;
    case 'season':
      cacheInvalidator.invalidate('seasons');
      break;
    default:
      console.log(`No invalidation pattern for type: ${type}`);
  }
}