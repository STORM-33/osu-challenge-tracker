import apiTracker from '../../lib/api-tracker';
import { withAPITracking } from '../../middleware';

function handler(req, res) {
  console.log('🧪 Testing tracking...');
  
  // Manual tracking test
  apiTracker.trackInternal('/api/test-tracking', 'GET', 100, true);
  
  const stats = apiTracker.getUsageStats();
  
  res.json({
    success: true,
    stats,
    hasGlobalTracker: typeof global.vercelApiTracker !== 'undefined'
  });
}

export default withAPITracking(handler, { memoryMB: 128 });