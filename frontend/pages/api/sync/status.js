// Get sync status for resources
import { withAPITracking } from '../../../middleware';
import { handleAPIResponse, handleAPIError, validateRequest } from '../../../lib/api-utils';
import syncManager from '../../../lib/sync-manager';

async function handler(req, res) {
  try {
    validateRequest(req, {
      method: 'GET',
      query: {
        type: { required: true, enum: ['challenge'] },
        id: { required: true, type: 'string' }
      }
    });

    const { type, id } = req.query;

    console.log(`📊 Sync status request for ${type}:${id}`);

    // Get sync status
    const syncStatus = syncManager.getSyncStatus(type, id);
    
    // Get additional staleness info
    const stalenessCheck = await syncManager.checkStaleness(type, id);
    
    // Check if sync is possible
    const canSyncResult = await syncManager.canSync(type, id);

    return handleAPIResponse(res, {
      resourceType: type,
      resourceId: id,
      sync_status: syncStatus,
      staleness: {
        isStale: stalenessCheck.isStale,
        lastUpdated: stalenessCheck.lastUpdated,
        timeSinceUpdate: stalenessCheck.timeSinceUpdate,
        formattedAge: formatAge(stalenessCheck.timeSinceUpdate)
      },
      can_sync: canSyncResult.canSync,
      sync_availability: {
        reason: canSyncResult.reason,
        nextSyncIn: canSyncResult.nextSyncIn,
        limitStatus: canSyncResult.limitStatus
      }
    });

  } catch (error) {
    console.error('Sync status API error:', error);
    return handleAPIError(res, error);
  }
}

function formatAge(milliseconds) {
  if (!milliseconds || milliseconds < 0) return 'unknown';
  
  const minutes = Math.floor(milliseconds / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h ago`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export default withAPITracking(handler, { memoryMB: 128 });