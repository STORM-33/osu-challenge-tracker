// hooks/useAPI.js - Fixed to remove double tracking
import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';

const challengeUpdateCache = {};

// Simplified fetcher that ONLY fetches - no tracking
// Let middleware handle ALL the tracking to avoid duplicates
const simpleFetcher = async (url) => {
  const res = await fetch(url);
  
  if (!res.ok) {
    const error = new Error('API request failed');
    error.status = res.status;
    
    try {
      const data = await res.json();
      error.message = data.error?.message || 'An error occurred';
      error.code = data.error?.code;
    } catch (e) {
      // If we can't parse JSON, use status text
      error.message = res.statusText || 'An error occurred';
    }
    
    throw error;
  }
  
  const data = await res.json();
  return data.data || data;
};

export function useAPI(endpoint, options = {}) {
  const {
    refreshInterval = null,
    revalidateOnFocus = false,
    initialData = null,
    enabled = true
  } = options;

  const { data, error, mutate, isValidating } = useSWR(
    enabled ? endpoint : null,
    simpleFetcher,
    {
      refreshInterval,
      revalidateOnFocus,
      fallbackData: initialData,
      onError: (err) => {
        console.error(`API Error (${endpoint}):`, err);
      }
    }
  );

  const refresh = useCallback(() => {
    return mutate();
  }, [mutate]);

  return {
    data,
    error,
    loading: !error && !data && enabled,
    isValidating,
    refresh
  };
}

export function usePaginatedAPI(baseEndpoint, options = {}) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(options.defaultLimit || 50);
  
  const endpoint = `${baseEndpoint}?page=${page}&limit=${limit}`;
  const { data, error, loading, refresh } = useAPI(endpoint, options);

  const nextPage = useCallback(() => {
    if (data?.pagination?.hasNext) {
      setPage(p => p + 1);
    }
  }, [data]);

  const prevPage = useCallback(() => {
    if (data?.pagination?.hasPrev) {
      setPage(p => p - 1);
    }
  }, [data]);

  const goToPage = useCallback((newPage) => {
    const maxPage = data?.pagination?.totalPages || 1;
    if (newPage >= 1 && newPage <= maxPage) {
      setPage(newPage);
    }
  }, [data]);

  return {
    data: data?.data,
    pagination: data?.pagination,
    error,
    loading,
    refresh,
    nextPage,
    prevPage,
    goToPage,
    setLimit
  };
}

export function useAPIForm(endpoint, options = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const submit = useCallback(async (formData) => {
    setLoading(true);
    setError(null);
    
    try {
      // Let middleware handle all tracking - no client-side tracking
      const response = await fetch(endpoint, {
        method: options.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Submission failed');
      }

      const result = await response.json();
      setData(result.data || result);
      
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      
      return result;
    } catch (err) {
      setError(err);
      
      if (options.onError) {
        options.onError(err);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [endpoint, options]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    submit,
    loading,
    error,
    data,
    reset
  };
}

export function useRealtimeAPI(endpoint, options = {}) {
  const { data, error, loading, refresh } = useAPI(endpoint, {
    ...options,
    refreshInterval: options.refreshInterval || 60000
  });

  useEffect(() => {
    if (!options.websocket) return;

    const ws = new WebSocket(options.websocket);
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      if (update.type === 'refresh') {
        refresh();
      }
    };

    return () => ws.close();
  }, [options.websocket, refresh]);

  return { data, error, loading, refresh };
}

// Better challenge update management with rate limiting
export function useChallengeAutoUpdate() {
  const instanceId = Math.random().toString(36).substr(2, 9);
  console.log('🏭 NEW useChallengeAutoUpdate instance:', instanceId);
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdateCheck, setLastUpdateCheck] = useState(null);
  const [updateStats, setUpdateStats] = useState({
    successCount: 0,
    errorCount: 0,
    lastError: null
  });

  // rate limiting and caching
  const shouldUpdateChallenge = useCallback((challenge) => {
    if (!challenge || !challenge.is_active) return false;
    
    const now = Date.now();
    const lastUpdated = Math.max(
      challenge.updated_at ? new Date(challenge.updated_at).getTime() : 0,
      challengeUpdateCache[challenge.room_id] || 0
    );
    
    // More conservative update frequency: 10 minutes instead of 5
    const updateThreshold = 10 * 60 * 1000;
    const needsUpdate = now - lastUpdated > updateThreshold;
    
    console.log(`🔍 Challenge ${challenge.room_id}: Last updated ${Math.floor((now - lastUpdated) / 60000)} minutes ago, needs update: ${needsUpdate}`);
    
    return needsUpdate;
  }, []);

  const updateChallenge = useCallback(async (roomId) => {
    const now = Date.now();
    
    // Check rate limiting
    if (challengeUpdateCache[roomId] && now - challengeUpdateCache[roomId] < 10 * 60 * 1000) {
      console.log(`♻️ Challenge ${roomId} updated recently, skipping`);
      return { success: true, skipped: true, reason: 'Recently updated' };
    }
    
    if (isUpdating) {
      return { success: false, skipped: true, reason: 'Already updating' };
    }
    
    setIsUpdating(true);
    
    try {
      console.log(`🔄 Auto-updating challenge ${roomId}`);
      
      const response = await fetch('/api/update-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Challenge ${roomId} updated successfully`);
        challengeUpdateCache[roomId] = Date.now();
        
        setUpdateStats(prev => ({
          ...prev,
          successCount: prev.successCount + 1,
          lastError: null
        }));
      } else {
        console.warn(`⚠️ Challenge ${roomId} update failed:`, result.error);
        
        setUpdateStats(prev => ({
          ...prev,
          errorCount: prev.errorCount + 1,
          lastError: result.error
        }));
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Error updating challenge ${roomId}:`, error);
      
      setUpdateStats(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1,
        lastError: error.message
      }));
      
      return { success: false, error: error.message };
    } finally {
      setIsUpdating(false);
      setLastUpdateCheck(Date.now());
    }
  }, [isUpdating]);

  const smartUpdateChallenge = useCallback(async (challenge, force = false) => {
    if (!force && !shouldUpdateChallenge(challenge)) {
      return { success: true, skipped: true, reason: 'Recently updated' };
    }
    
    return updateChallenge(challenge.room_id);
  }, [shouldUpdateChallenge, updateChallenge]);

  const updateActiveChallenges = useCallback(async (challenges, options = {}) => {
    const { force = false, maxUpdates = 3 } = options; // Reduced from 5 to 3
    
    if (isUpdating) return { success: false, error: 'Already updating' };
    
    const challengesToUpdate = challenges
      .filter(c => c.is_active)
      .map(c => ({
        ...c,
        lastUpdated: Math.max(
          c.updated_at ? new Date(c.updated_at).getTime() : 0,
          challengeUpdateCache[c.room_id] || 0
        )
      }))
      .filter(c => force || shouldUpdateChallenge(c))
      .sort((a, b) => a.lastUpdated - b.lastUpdated)
      .slice(0, maxUpdates);
    
    if (challengesToUpdate.length === 0) {
      console.log('📝 No active challenges need updating');
      return { 
        success: true, 
        total: challenges.length,
        updated: 0, 
        skipped: challenges.filter(c => c.is_active).length,
        message: 'All challenges up to date'
      };
    }

    console.log(`📊 Auto-updating ${challengesToUpdate.length} of ${challenges.length} challenges`);
    setIsUpdating(true);
    
    const results = [];
    let updateCount = 0;
    
    try {
      for (const challenge of challengesToUpdate) {
        const result = await updateChallenge(challenge.room_id);
        results.push({ roomId: challenge.room_id, ...result });
        
        if (result.success && !result.skipped) {
          updateCount++;
        }
        
        // Longer delays between updates to be more API-friendly
        if (challengesToUpdate.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 2500)); // Increased from 1500ms
        }
      }
      
      return {
        success: true,
        total: challenges.length,
        updated: updateCount,
        skipped: challenges.length - challengesToUpdate.length,
        results,
        stats: updateStats
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        results,
        stats: updateStats
      };
    } finally {
      setIsUpdating(false);
    }
  }, [isUpdating, shouldUpdateChallenge, updateChallenge, updateStats]);

  // Cleanup function to clear cache
  const clearUpdateCache = useCallback(() => {
    Object.keys(challengeUpdateCache).forEach(key => {
      delete challengeUpdateCache[key];
    });
    console.log('🧹 Cleared challenge update cache');
  }, []);

  return {
    updateChallenge,
    smartUpdateChallenge,
    updateActiveChallenges,
    shouldUpdateChallenge,
    isUpdating,
    lastUpdateCheck,
    updateStats,
    clearUpdateCache
  };
}

export function useAutoUpdateActiveChallenges(challenges, options = {}) {
  const { autoUpdate = true, delay = 5000, maxUpdates = 2, loading = false } = options; // Reduced maxUpdates
  const { updateActiveChallenges, isUpdating } = useChallengeAutoUpdate();
  const [hasTriggered, setHasTriggered] = useState(false);

  console.log('🔍 useAutoUpdateActiveChallenges called with:', {
    challengesCount: challenges?.length,
    autoUpdate,
    hasTriggered,
    challenges: challenges?.map(c => ({ 
      id: c.room_id, 
      updated_at: c.updated_at, 
      last_cached: challengeUpdateCache[c.room_id] || 'never',
      is_active: c.is_active 
    }))
  });

  useEffect(() => {
    if (!challenges || challenges.length === 0 || !autoUpdate || hasTriggered || loading) {
      console.log('🚫 Skipping auto-update because:', {
        noChallenges: !challenges || challenges.length === 0,
        autoUpdateOff: !autoUpdate,
        alreadyTriggered: hasTriggered,
        stillLoading: loading
      });
      return;
    }

    console.log('⏰ Setting timer for auto-update...');
    
    const timer = setTimeout(() => {
      console.log('🚀 Timer triggered, calling updateActiveChallenges...');
      updateActiveChallenges(challenges, { maxUpdates }).then(() => {
        setHasTriggered(true);
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [challenges, autoUpdate, delay, maxUpdates, updateActiveChallenges, hasTriggered, loading]);

  useEffect(() => {
    setHasTriggered(false);
  }, [challenges?.length]);

  return { isUpdating };
}

export function useAutoUpdateChallenge(challenge, options = {}) {
  const { autoUpdate = true, delay = 3000, onUpdate } = options; // Increased delay
  const { smartUpdateChallenge, isUpdating } = useChallengeAutoUpdate();

  useEffect(() => {
    if (!challenge || !autoUpdate || !challenge.room_id) return;

    const lastUpdated = challengeUpdateCache[challenge.room_id] || 0;
    const shouldUpdate = Date.now() - lastUpdated > 10 * 60 * 1000; // 10 minutes

    if (!shouldUpdate) {
      console.log(`⏭️ Skipping auto-update for ${challenge.room_id}, recently updated`);
      return;
    }

    const timer = setTimeout(async () => {
      const result = await smartUpdateChallenge(challenge);
      
      if (result.success && !result.skipped && onUpdate) {
        console.log('🔄 Calling onUpdate callback to refresh UI...');
        onUpdate(result);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [challenge, autoUpdate, delay, smartUpdateChallenge, onUpdate]);

  return { isUpdating };
}