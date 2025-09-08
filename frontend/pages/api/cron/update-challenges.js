import { supabase } from '../../../lib/supabase';
import syncManager from '../../../lib/sync-manager';
import { handleAPIResponse, handleAPIError } from '../../../lib/api-utils';
import apiTracker from '../../../lib/api-tracker';

const CRON_SECRET = process.env.CRON_SECRET || 'your-secure-cron-secret-key';
const MAX_CONCURRENT_UPDATES = 3; // Limit concurrent updates to avoid overwhelming API

export default async function handler(req, res) {
  const startTime = Date.now();
  
  try {
    // 1. VERIFY CRON REQUEST AUTHENTICATION
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
      console.warn('🚨 Unauthorized cron request attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('⏰ CRON JOB: Starting automated challenge updates');

    // 2. CHECK API LIMITS BEFORE PROCEEDING
    const limitStatus = apiTracker.checkLimits();
    if (limitStatus === 'critical') {
      console.warn('🚨 CRON JOB: API limits critical, skipping update cycle');
      return res.status(429).json({
        success: false,
        reason: 'api_limits_critical',
        message: 'API usage too high, skipping this cycle'
      });
    }

    // 3. GET ALL ACTIVE CHALLENGES
    const { data: activeChallenges, error: fetchError } = await supabase
      .from('challenges')
      .select('id, room_id, name, updated_at, is_active')
      .eq('is_active', true)
      .order('updated_at', { ascending: true }); // Prioritize oldest first

    if (fetchError) {
      throw new Error(`Failed to fetch active challenges: ${fetchError.message}`);
    }

    if (!activeChallenges || activeChallenges.length === 0) {
      console.log('📋 CRON JOB: No active challenges found');
      return handleAPIResponse(res, {
        success: true,
        challenges_processed: 0,
        message: 'No active challenges to update'
      });
    }

    console.log(`📋 CRON JOB: Found ${activeChallenges.length} active challenges`);

    // 4. FILTER CHALLENGES THAT NEED UPDATING
    const challengesToUpdate = [];
    
    for (const challenge of activeChallenges) {
      try {
        // Check if challenge needs updating
        const stalenessCheck = await syncManager.checkStaleness('challenge', challenge.room_id.toString());
        const canSyncResult = await syncManager.canSync('challenge', challenge.room_id.toString());
        
        if (stalenessCheck.isStale && canSyncResult.canSync) {
          challengesToUpdate.push({
            ...challenge,
            timeSinceUpdate: stalenessCheck.timeSinceUpdate,
            priority: calculatePriority(stalenessCheck.timeSinceUpdate)
          });
        } else {
          console.log(`⏭️ CRON JOB: Skipping challenge ${challenge.room_id} - ${canSyncResult.reason || 'not stale'}`);
        }
      } catch (error) {
        console.warn(`⚠️ CRON JOB: Error checking challenge ${challenge.room_id}:`, error.message);
      }
    }

    if (challengesToUpdate.length === 0) {
      console.log('✅ CRON JOB: All challenges are up to date');
      return handleAPIResponse(res, {
        success: true,
        challenges_checked: activeChallenges.length,
        challenges_processed: 0,
        message: 'All challenges are up to date'
      });
    }

    // 5. SORT BY PRIORITY (OLDEST UPDATES FIRST)
    challengesToUpdate.sort((a, b) => b.priority - a.priority);
    
    console.log(`🔄 CRON JOB: ${challengesToUpdate.length} challenges need updating`);

    // 6. PROCESS CHALLENGES IN BATCHES
    const updateResults = [];
    const batchSize = Math.min(MAX_CONCURRENT_UPDATES, challengesToUpdate.length);
    
    for (let i = 0; i < challengesToUpdate.length; i += batchSize) {
      const batch = challengesToUpdate.slice(i, i + batchSize);
      
      console.log(`📦 CRON JOB: Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} challenges)`);
      
      // Process batch in parallel
      const batchPromises = batch.map(challenge => processChallenge(challenge));
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Collect results
      batchResults.forEach((result, index) => {
        const challenge = batch[index];
        if (result.status === 'fulfilled') {
          updateResults.push({
            room_id: challenge.room_id,
            success: true,
            job_id: result.value.jobId,
            message: 'Update queued successfully'
          });
        } else {
          updateResults.push({
            room_id: challenge.room_id,
            success: false,
            error: result.reason?.message || 'Unknown error',
            message: 'Failed to queue update'
          });
          console.error(`❌ CRON JOB: Failed to process challenge ${challenge.room_id}:`, result.reason);
        }
      });
      
      // Short delay between batches to avoid overwhelming the system
      if (i + batchSize < challengesToUpdate.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // 7. SUMMARIZE RESULTS
    const successCount = updateResults.filter(r => r.success).length;
    const failureCount = updateResults.filter(r => !r.success).length;
    const totalTime = Date.now() - startTime;

    console.log(`✅ CRON JOB: Completed in ${totalTime}ms - ${successCount} successful, ${failureCount} failed`);

    return handleAPIResponse(res, {
      success: true,
      challenges_checked: activeChallenges.length,
      challenges_processed: challengesToUpdate.length,
      successful_updates: successCount,
      failed_updates: failureCount,
      execution_time_ms: totalTime,
      api_usage: apiTracker.getUsageStats(),
      results: updateResults
    });

  } catch (error) {
    console.error('❌ CRON JOB: Fatal error:', error);
    return handleAPIError(res, error);
  }
}

// Helper function to calculate update priority based on staleness
function calculatePriority(timeSinceUpdate) {
  const hours = timeSinceUpdate / (1000 * 60 * 60);
  
  if (hours >= 24) return 10; // Very stale
  if (hours >= 12) return 8;  // Quite stale
  if (hours >= 6) return 6;   // Moderately stale
  if (hours >= 3) return 4;   // Somewhat stale
  if (hours >= 1) return 2;   // Recently stale
  return 1; // Just became stale
}

// Helper function to process individual challenge
async function processChallenge(challenge) {
  try {
    console.log(`🔄 CRON JOB: Queuing update for challenge ${challenge.room_id} (priority: ${challenge.priority})`);
    
    const queueResult = await syncManager.queueSync('challenge', challenge.room_id.toString(), {
      priority: challenge.priority,
      force: false, // Respect cooldowns in cron jobs
      source: 'cron_job'
    });
    
    if (!queueResult.success) {
      throw new Error(queueResult.reason || 'Failed to queue sync');
    }
    
    return {
      jobId: queueResult.jobId,
      success: true
    };
    
  } catch (error) {
    console.error(`❌ CRON JOB: Error processing challenge ${challenge.room_id}:`, error);
    throw error;
  }
}