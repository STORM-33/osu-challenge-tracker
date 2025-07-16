import { useState } from 'react';
import { Loader2, CheckCircle, AlertCircle, X, Bug } from 'lucide-react';
import { useSyncStatus } from '../hooks/useSyncStatus';

export function SyncStatusIndicator({ syncMetadata, isValidating, showDebug = false }) {
  const syncStatus = useSyncStatus(syncMetadata, isValidating);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  if (syncStatus.isIdle && !showDebug) return null;

  return (
    <>
      {/* Main Status Indicator */}
      <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
        <div className="flex items-center gap-3 px-4 py-3 glass-1 rounded-xl shadow-lg">
          
          {/* Loading State */}
            {(syncStatus.isSyncing || syncStatus.isValidating) && (
            <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span className="text-sm text-white font-medium">
                {syncStatus.isSyncing ? 'Syncing challenge data...' : 'Loading fresh data...'}
                </span>
            </>
            )}
          
          {/* Completion State */}
          {syncStatus.showSuccessBanner && (
            <>
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm text-white font-medium">
                Sync complete
              </span>
            </>
          )}
          
          {/* Error State */}
          {syncStatus.isError && (
            <>
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-white font-medium">
                Sync failed
              </span>
              <button 
                onClick={syncStatus.resetStatus}
                className="ml-2 text-white/70 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          )}

          {/* Debug Toggle */}
          {showDebug && (
            <button
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              className="ml-2 text-white/70 hover:text-white"
              title="Show debug info"
            >
              <Bug className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Debug Panel */}
      {showDebugPanel && (
        <SyncDebugPanel 
          syncStatus={syncStatus}
          onClose={() => setShowDebugPanel(false)}
        />
      )}
    </>
  );
}

// Debug Panel Component
function SyncDebugPanel({ syncStatus, onClose }) {
  const debugInfo = syncStatus.getDebugInfo();

  return (
    <div className="fixed bottom-20 right-6 z-50 w-96 max-h-96 overflow-auto">
      <div className="glass-1 rounded-xl p-4 text-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white">Sync Debug Info</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current State */}
        <div className="mb-4">
          <h4 className="font-medium text-white/90 mb-2">Current State</h4>
          <div className="space-y-1 text-white/70">
            <div>Status: <span className="text-yellow-300">{debugInfo.localState.status}</span></div>
            <div>Show Banner: <span className="text-yellow-300">{String(debugInfo.localState.showCompletionBanner)}</span></div>
            <div>Job ID: <span className="text-yellow-300">{debugInfo.localState.lastJobId || 'none'}</span></div>
            <div>Is Validating: <span className="text-yellow-300">{String(debugInfo.isValidating)}</span></div>
          </div>
        </div>

        {/* Server Metadata */}
        <div className="mb-4">
          <h4 className="font-medium text-white/90 mb-2">Server Metadata</h4>
          <div className="space-y-1 text-white/70">
            <div>Sync In Progress: <span className="text-blue-300">{String(debugInfo.syncMetadata?.sync_in_progress)}</span></div>
            <div>Server Job ID: <span className="text-blue-300">{debugInfo.syncMetadata?.job_id || 'none'}</span></div>
            <div>Is Stale: <span className="text-blue-300">{String(debugInfo.syncMetadata?.is_stale)}</span></div>
          </div>
        </div>

        {/* Recent Events */}
        <div className="mb-4">
          <h4 className="font-medium text-white/90 mb-2">Recent Events</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {debugInfo.logs.slice(-5).map((log, index) => (
              <div key={index} className="text-xs text-white/60">
                <span className="text-green-300">{log.timestamp.split('T')[1].split('.')[0]}</span>
                <span className="mx-1 text-white/40">|</span>
                <span className="text-yellow-300">{log.event}</span>
                <span className="mx-1 text-white/40">|</span>
                <span>{JSON.stringify(log.data)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={syncStatus.resetStatus}
            className="px-3 py-1 bg-red-500/20 text-red-300 rounded-md text-xs hover:bg-red-500/30"
          >
            Reset Status
          </button>
          <button
            onClick={() => console.log('Full Debug Info:', debugInfo)}
            className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-md text-xs hover:bg-blue-500/30"
          >
            Log to Console
          </button>
        </div>
      </div>
    </div>
  );
}