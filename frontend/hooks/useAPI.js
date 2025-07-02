import { useState, useEffect, useCallback, useRef } from 'react';
import useSWR from 'swr';

const challengeUpdateCache = {};

// Enhanced fetcher with sync metadata handling
const smartFetcher = async (url) => {
  const res = await fetch(url);
  
  if (!res.ok) {
    const error = new Error('API request failed');
    error.status = res.status;
    
    try {
      const data = await res.json();
      error.message = data.error?.message || 'An error occurred';
      error.code = data.error?.code;
    } catch (e) {
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
    smartFetcher,
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

// Enhanced hook for challenge data with background sync capabilities
export function useChallengeWithSync(roomId, options = {}) {
  const { 
    autoRefresh = true, 
    pollInterval = 120000, // Poll every 2 minutes for sync updates
    onSyncComplete = null 
  } = options;

  const [syncState, setSyncState] = useState({
    isBackgroundSyncing: false,
    lastSyncAttempt: null,
    syncError: null,
    jobId: null
  });

  const pollTimeoutRef = useRef(null);
  const lastJobIdRef = useRef(null);

  // Main data fetching
  const { data, error, mutate, isValidating } = useSWR(
    roomId ? `/api/challenges/${roomId}` : null,
    smartFetcher,
    {
      revalidateOnFocus: false,
      onSuccess: (newData) => {
        if (newData?.sync_metadata) {
          handleSyncMetadata(newData.sync_metadata);
        }
      }
    }
  );

  // Handle sync metadata from API responses
  const handleSyncMetadata = useCallback((syncMetadata) => {
    setSyncState(prev => ({
      ...prev,
      isBackgroundSyncing: syncMetadata.sync_in_progress,
      jobId: syncMetadata.job_id,
      syncError: null
    }));

    // If sync just completed (job finished), refresh data
    if (lastJobIdRef.current && !syncMetadata.job_id && lastJobIdRef.current !== syncMetadata.job_id) {
      console.log('🔄 Background sync completed, refreshing data');
      mutate();
      if (onSyncComplete) {
        onSyncComplete();
      }
    }

    lastJobIdRef.current = syncMetadata.job_id;
  }, [mutate, onSyncComplete]);

  // Poll for sync status updates when background sync is active
  useEffect(() => {
    if (!syncState.isBackgroundSyncing || !syncState.jobId || !autoRefresh) {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
      return;
    }

    const pollSyncStatus = async () => {
      try {
        const response = await fetch(`/api/sync/status?type=challenge&id=${roomId}`);
        if (response.ok) {
          const statusData = await response.json();
          const syncStatus = statusData.data?.sync_status;

          if (syncStatus && !syncStatus.inProgress && syncState.isBackgroundSyncing) {
            // Sync completed, refresh main data
            console.log('🔄 Background sync detected as complete via polling, refreshing data');
            setSyncState(prev => ({
              ...prev,
              isBackgroundSyncing: false,
              jobId: null
            }));
            mutate();
            if (onSyncComplete) {
              onSyncComplete();
            }
          } else if (syncStatus?.inProgress) {
            // Schedule next poll
            pollTimeoutRef.current = setTimeout(pollSyncStatus, pollInterval);
          }
        }
      } catch (error) {
        console.warn('Failed to poll sync status:', error);
        // Continue polling despite error
        pollTimeoutRef.current = setTimeout(pollSyncStatus, pollInterval * 2);
      }
    };

    // Start polling
    pollTimeoutRef.current = setTimeout(pollSyncStatus, pollInterval);

    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [syncState.isBackgroundSyncing, syncState.jobId, roomId, autoRefresh, pollInterval, mutate, onSyncComplete]);

  // Manual sync trigger
  const triggerSync = useCallback(async (force = false) => {
    if (!roomId) return { success: false, error: 'No room ID' };

    setSyncState(prev => ({
      ...prev,
      lastSyncAttempt: Date.now(),
      syncError: null
    }));

    try {
      const response = await fetch('/api/sync/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomId: parseInt(roomId), 
          force,
          priority: 3 // Manual syncs get high priority
        })
      });

      const result = await response.json();

      if (result.success && result.data.queued) {
        setSyncState(prev => ({
          ...prev,
          isBackgroundSyncing: true,
          jobId: result.data.jobId
        }));

        return {
          success: true,
          queued: true,
          jobId: result.data.jobId,
          message: result.data.message
        };
      } else {
        return {
          success: true,
          queued: false,
          reason: result.data.reason,
          message: result.data.message
        };
      }
    } catch (error) {
      setSyncState(prev => ({
        ...prev,
        syncError: error.message
      }));

      return {
        success: false,
        error: error.message
      };
    }
  }, [roomId]);

  const refresh = useCallback(() => {
    return mutate();
  }, [mutate]);

  return {
    // Main data
    challenge: data?.challenge,
    rulesetInfo: data?.ruleset_info,
    rulesetWinner: data?.ruleset_winner,
    syncMetadata: data?.sync_metadata,
    
    // Loading states
    loading: !error && !data,
    isValidating,
    
    // Sync states
    isBackgroundSyncing: syncState.isBackgroundSyncing,
    syncError: syncState.syncError,
    lastSyncAttempt: syncState.lastSyncAttempt,
    
    // Actions
    refresh,
    triggerSync,
    
    // Error
    error
  };
}

// Enhanced hook for challenges list with background sync
export function useChallengesWithSync(options = {}) {
  const {
    active = null,
    seasonId = null,
    autoSync = true,
    refreshInterval = 60000, // Refresh every minute for lists
    onSyncProgress = null
  } = options;

  // Build endpoint with parameters
  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (active !== null) params.append('active', active.toString());
    if (seasonId) params.append('season_id', seasonId.toString());
    if (autoSync !== null) params.append('auto_sync', autoSync.toString());
    
    return `/api/challenges?${params.toString()}`;
  }, [active, seasonId, autoSync]);

  const [syncProgress, setSyncProgress] = useState({
    totalSyncing: 0,
    backgroundSyncsTriggered: 0,
    lastUpdate: null
  });

  const { data, error, mutate, isValidating } = useSWR(
    endpoint,
    smartFetcher,
    {
      refreshInterval: autoSync ? refreshInterval : null,
      revalidateOnFocus: false,
      onSuccess: (newData) => {
        if (newData?.sync_summary) {
          const progress = {
            totalSyncing: newData.sync_summary.total_syncing || 0,
            backgroundSyncsTriggered: newData.sync_summary.background_syncs_triggered || 0,
            lastUpdate: Date.now()
          };
          
          setSyncProgress(progress);
          
          if (onSyncProgress) {
            onSyncProgress(progress);
          }
        }
      }
    }
  );

  const refresh = useCallback(() => {
    return mutate();
  }, [mutate]);

  return {
    challenges: data?.challenges || [],
    syncSummary: data?.sync_summary,
    syncProgress,
    pagination: data?.pagination,
    loading: !error && !data,
    isValidating,
    refresh,
    error
  };
}

// Legacy compatibility exports
export function useAPIForm(endpoint, options = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const submit = useCallback(async (formData) => {
    setLoading(true);
    setError(null);
    
    try {
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

// Helper to use memo in the hook
function useMemo(factory, deps) {
  const ref = useRef();
  
  if (!ref.current || deps.some((dep, i) => dep !== ref.current.deps[i])) {
    ref.current = {
      value: factory(),
      deps
    };
  }
  
  return ref.current.value;
}