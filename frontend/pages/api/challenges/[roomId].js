import { supabase } from '../../../lib/supabase';
import { handleAPIResponse, handleAPIError, validateRequest } from '../../../lib/api-utils';
import syncManager from '../../../lib/sync-manager';

async function handler(req, res) {
  res.setHeader('X-Cache-Debug', Date.now());
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    validateRequest(req, {
      method: 'GET',
      query: {
        roomId: { required: true, pattern: /^\d+$/ }
      }
    });

    const { roomId } = req.query;
    const roomIdNum = parseInt(roomId);

    console.log(`📋 Fetching challenge details for room ${roomId}`);

    // 1. IMMEDIATELY fetch existing data from database
    const { data: challenge, error } = await supabase
      .from('challenges')
      .select(`
        *,
        seasons (
          id,
          name,
          start_date,
          end_date,
          is_current
        ),
        playlists (
          id,
          playlist_id,
          beatmap_id,
          beatmap_title,
          beatmap_artist,
          beatmap_version,
          beatmap_difficulty,
          beatmap_cover_url,
          beatmap_card_url,
          beatmap_list_url,
          beatmap_slimcover_url,
          scores (
            id,
            score,
            accuracy,
            max_combo,
            mods,
            mods_detailed,
            submitted_at,
            users (
              id,
              osu_id,
              username,
              avatar_url,
              country
            )
          )
        )
      `)
      .eq('room_id', roomIdNum)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return handleAPIError(res, new Error('Challenge not found'));
      }
      throw error;
    }

    if (!challenge) {
      return handleAPIError(res, new Error('Challenge not found'));
    }

    // 2. Sort scores for each playlist by score descending
    if (challenge.playlists) {
      challenge.playlists = challenge.playlists.map(playlist => ({
        ...playlist,
        scores: playlist.scores 
          ? playlist.scores.sort((a, b) => b.score - a.score)
          : []
      }));
    }

    // 3. Get ruleset winner information if challenge has ruleset
    let rulesetWinner = null;
    let rulesetInfo = null;

    if (challenge.has_ruleset) {
      rulesetInfo = {
        ruleset_name: challenge.ruleset_name,
        ruleset_description: challenge.ruleset_description,
        required_mods: challenge.required_mods || [],
        ruleset_match_type: challenge.ruleset_match_type
      };

      const { data: winnerData, error: winnerError } = await supabase
        .from('challenge_ruleset_winners')
        .select(`
          score_id,
          won_at,
          scores (
            id,
            score,
            accuracy,
            max_combo,
            mods,
            mods_detailed,
            users (
              id,
              osu_id,
              username,
              avatar_url,
              country
            )
          )
        `)
        .eq('challenge_id', challenge.id)
        .single();

      if (winnerData && !winnerError) {
        rulesetWinner = {
          score_id: winnerData.score_id,
          won_at: winnerData.won_at,
          score: winnerData.scores.score,
          accuracy: winnerData.scores.accuracy,
          max_combo: winnerData.scores.max_combo,
          mods: winnerData.scores.mods,
          mods_detailed: winnerData.scores.mods_detailed,
          username: winnerData.scores.users.username,
          avatar_url: winnerData.scores.users.avatar_url,
          country: winnerData.scores.users.country,
          user_id: winnerData.scores.users.id,
          osu_id: winnerData.scores.users.osu_id
        };
      }
    }

    // 4. Get sync status and metadata
    const syncStatus = syncManager.getSyncStatus('challenge', roomId);
    const stalenessCheck = await syncManager.checkStaleness('challenge', roomId);
    const canSyncResult = await syncManager.canSync('challenge', roomId);

    // 5. AUTO-TRIGGER background sync if data is stale and sync is available
    let backgroundSyncTriggered = false;
    if (challenge.is_active && stalenessCheck.isStale && canSyncResult.canSync) {
      console.log(`🔄 Auto-triggering background sync for stale challenge ${roomId}`);
      
      try {
        const queueResult = await syncManager.queueSync('challenge', roomId, { 
          priority: 1 // Auto-triggered syncs get normal priority
        });
        
        if (queueResult.success) {
          backgroundSyncTriggered = true;
          console.log(`✅ Background sync queued for challenge ${roomId} (job: ${queueResult.jobId})`);
        }
      } catch (syncError) {
        console.warn(`⚠️ Failed to auto-trigger sync for challenge ${roomId}:`, syncError.message);
      }
    }

    // 6. Prepare sync metadata for frontend
    const syncMetadata = {
      last_synced: stalenessCheck.lastUpdated,
      is_stale: stalenessCheck.isStale,
      time_since_update: stalenessCheck.timeSinceUpdate,
      sync_in_progress: syncStatus.inProgress,
      can_sync: canSyncResult.canSync,
      sync_reason: canSyncResult.reason,
      background_sync_triggered: backgroundSyncTriggered,
      next_sync_available_in: canSyncResult.nextSyncIn || syncStatus.canSyncIn || 0,
      estimated_sync_time: syncStatus.estimatedTimeRemaining || 30000,
      job_id: syncStatus.jobId || null,
      sync_stage: syncStatus.stage || null
    };

    console.log(`📋 Challenge ${roomId} loaded with ${challenge.playlists?.length || 0} playlists. Sync: ${syncMetadata.sync_in_progress ? 'in progress' : syncMetadata.is_stale ? 'stale' : 'fresh'}`);

    // 7. Return immediate response with current data + sync metadata
    return handleAPIResponse(res, {
      challenge,
      ruleset_info: rulesetInfo,
      ruleset_winner: rulesetWinner,
      sync_metadata: syncMetadata
    }, {
      cache: !challenge.is_active, // Only cache inactive challenges
      cacheTime: challenge.is_active ? 0 : 300 // 5 minute cache for inactive
    });

  } catch (error) {
    console.error('Enhanced challenge detail API error:', error);
    return handleAPIError(res, error);
  }
}

export default handler;