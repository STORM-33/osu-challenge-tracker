import { handleAPIResponse, handleAPIError, validateRequest } from '../../../lib/api-utils';
import syncManager from '../../../lib/sync-manager';

async function handler(req, res) {
  try {
    validateRequest(req, {
      method: 'POST',
      body: {
        roomId: { required: true, type: 'number' },
        force: { type: 'boolean' },
        priority: { type: 'number', min: 0, max: 10 }
      }
    });

    const { roomId, force = false, priority = 0 } = req.body;

    // Validate roomId
    if (!Number.isInteger(roomId) || roomId <= 0) {
      throw new Error('Invalid room ID - must be a positive integer');
    }

    console.log(`🔄 Background sync request for challenge ${roomId} (force: ${force}, priority: ${priority})`);

    // Check if sync can proceed
    const canSyncResult = await syncManager.canSync('challenge', roomId.toString(), force);
    
    if (!canSyncResult.canSync && !force) {
      console.log(`❌ Sync blocked for challenge ${roomId}: ${canSyncResult.reason}`);
      
      return res.status(200).json({
        success: false,
        sync_queued: false,
        reason: canSyncResult.reason,
        message: getSyncMessage(canSyncResult.reason),
        sync_metadata: {
          can_sync: false,
          sync_reason: canSyncResult.reason,
          next_sync_available_in: canSyncResult.nextSyncIn || 0,
          last_synced: canSyncResult.lastSynced,
          time_since_update: canSyncResult.timeSinceUpdate
        },
        timestamp: new Date().toISOString()
      });
    }

    // Queue the sync job
    const queueResult = await syncManager.queueSync('challenge', roomId.toString(), {
      priority,
      force
    });

    if (!queueResult.success) {
      console.log(`❌ Queue failed for challenge ${roomId}: ${queueResult.reason}`);
      
      return res.status(200).json({
        success: false,
        sync_queued: false,
        reason: queueResult.reason,
        message: getSyncMessage(queueResult.reason),
        sync_metadata: {
          can_sync: false,
          sync_reason: queueResult.reason,
          job_id: null,
          sync_in_progress: false
        },
        timestamp: new Date().toISOString()
      });
    }

    console.log(`✅ Sync queued successfully for challenge ${roomId}: ${queueResult.jobId}`);
    
    return handleAPIResponse(res, {
      sync_queued: true,
      jobId: queueResult.jobId,
      estimatedDuration: queueResult.estimatedDuration,
      message: 'Background sync started - data will update automatically',
      sync_metadata: {
        job_id: queueResult.jobId,
        sync_in_progress: true,
        estimated_duration: queueResult.estimatedDuration,
        can_sync: true,
        sync_reason: 'queued'
      }
    });

  } catch (error) {
    console.error('Background sync API error:', error);
    return handleAPIError(res, error);
  }
}

function getSyncMessage(reason) {
  switch (reason) {
    case 'global_cooldown':
      return 'Challenge was recently synced - please wait';
    case 'not_stale':
      return 'Challenge data is already up to date';
    case 'api_limit_critical':
      return 'API usage critical - sync temporarily unavailable';
    case 'already_processing':
      return 'Sync already in progress for this challenge';
    case 'rate_limited':
      return 'Too many sync requests - please wait';
    default:
      return 'Sync not available at this time';
  }
}

export default handler;