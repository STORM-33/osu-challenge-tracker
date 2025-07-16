import { useState, useEffect, useRef, useCallback } from 'react';

export function useSyncStatus(syncMetadata, isValidating) {
  const [localState, setLocalState] = useState({
    status: 'idle', // 'idle' | 'syncing' | 'completing' | 'error'
    showCompletionBanner: false,
    lastJobId: null,
    error: null
  });

  const prevJobIdRef = useRef(null);
  const completionTimerRef = useRef(null);
  const debugLogRef = useRef([]);

  // Debug logging function
  const debugLog = useCallback((event, data) => {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, event, data };
    
    debugLogRef.current.push(logEntry);
    
    // Keep only last 20 entries
    if (debugLogRef.current.length > 20) {
      debugLogRef.current = debugLogRef.current.slice(-20);
    }
    
    console.log(`🔄 SyncStatus[${event}]:`, data);
  }, []);

  // Main status detection effect
  useEffect(() => {
    const currentJobId = syncMetadata?.job_id;
    const syncInProgress = syncMetadata?.sync_in_progress;
    const prevJobId = prevJobIdRef.current;

    debugLog('statusUpdate', {
      currentJobId,
      syncInProgress,
      prevJobId,
      isValidating,
      currentStatus: localState.status
    });

    // Detect SWR validation
    if (isValidating && localState.status === 'idle') {
        debugLog('swrValidationStarted', { isValidating });
        setLocalState(prev => ({
        ...prev,
        status: 'validating'  // New status for SWR validation
        }));
        return; // Exit early
    }

    // Detect SWR validation complete
    if (!isValidating && localState.status === 'validating') {
        debugLog('swrValidationCompleted', { isValidating });
        setLocalState(prev => ({
        ...prev,
        status: 'idle'
        }));
        return; // Exit early
    }

    // Detect sync start
    if (syncInProgress && currentJobId && !prevJobId) {
      debugLog('syncStarted', { jobId: currentJobId });
      setLocalState(prev => ({
        ...prev,
        status: 'syncing',
        lastJobId: currentJobId,
        error: null,
        showCompletionBanner: false
      }));
    }
    
    // Detect sync completion (job_id disappeared)
    else if (prevJobId && !currentJobId && !syncInProgress) {
      debugLog('syncCompleted', { 
        prevJobId, 
        wasValidating: isValidating 
      });
      
      setLocalState(prev => ({
        ...prev,
        status: 'completing',
        showCompletionBanner: true
      }));

      // Auto-hide completion banner
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
      }
      
      completionTimerRef.current = setTimeout(() => {
        debugLog('bannerAutoHide', {});
        setLocalState(prev => ({
          ...prev,
          status: 'idle',
          showCompletionBanner: false
        }));
      }, 4000);
    }
    
    // Detect sync error (still has job_id but not in progress)
    else if (currentJobId && !syncInProgress && localState.status === 'syncing') {
      debugLog('syncError', { jobId: currentJobId });
      setLocalState(prev => ({
        ...prev,
        status: 'error',
        error: 'Sync failed to complete'
      }));
    }
    
    // Detect sync cancellation (no metadata but was syncing)
    else if (!syncMetadata && localState.status === 'syncing') {
      debugLog('syncCancelled', { prevStatus: localState.status });
      setLocalState(prev => ({
        ...prev,
        status: 'idle',
        showCompletionBanner: false
      }));
    }

    // Update ref for next comparison
    prevJobIdRef.current = currentJobId;
  }, [syncMetadata, isValidating, localState.status, debugLog]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
      }
    };
  }, []);

  // Manual status reset function
  const resetStatus = useCallback(() => {
    debugLog('manualReset', {});
    setLocalState({
      status: 'idle',
      showCompletionBanner: false,
      lastJobId: null,
      error: null
    });
    
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
  }, [debugLog]);

  // Debug info getter
  const getDebugInfo = useCallback(() => ({
    localState,
    syncMetadata,
    isValidating,
    logs: debugLogRef.current,
    refs: {
      prevJobId: prevJobIdRef.current,
      hasCompletionTimer: !!completionTimerRef.current
    }
  }), [localState, syncMetadata, isValidating]);

  return {
    status: localState.status,
    isIdle: localState.status === 'idle',
    isSyncing: localState.status === 'syncing',
    isValidating: localState.status === 'validating',
    isCompleting: localState.status === 'completing',
    isError: localState.status === 'error',
    showCompletionBanner: localState.showCompletionBanner,
    error: localState.error,
    resetStatus,
    getDebugInfo,
    
    showLoadingSpinner: localState.status === 'syncing' || localState.status === 'validating',
    showSuccessBanner: localState.showCompletionBanner,
    showErrorState: localState.status === 'error'
    };
}