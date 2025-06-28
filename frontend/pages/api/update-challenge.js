import { supabaseAdmin } from '../../lib/supabase-admin';
import { trackedOsuAPI } from '../../lib/osu-api'; 
import apiTracker from '../../lib/api-tracker';
import { withAPITracking } from '../../middleware';
import { handleAPIError, validateRequest } from '../../lib/api-utils';
import { markChallengeUpdated } from '../../lib/global-update-tracker';
import pLimit from 'p-limit';
import syncLogger from '../../lib/sync-logger';

// Helper function to process mods and ensure proper format
function processModsData(mods) {
  if (!mods || !Array.isArray(mods) || mods.length === 0) {
    return {
      legacy: 'None',
      detailed: []
    };
  }
  
  try {
    const detailedMods = mods.map(mod => ({
      acronym: mod.acronym || 'Unknown',
      settings: mod.settings || {}
    }));
    
    const legacyString = mods.map(mod => mod.acronym).join('');
    
    return {
      legacy: legacyString || 'None',
      detailed: detailedMods
    };
  } catch (error) {
    console.warn('Error processing mods data:', error, mods);
    return {
      legacy: 'Error',
      detailed: []
    };
  }
}

// Enhanced atomic update function with mod support
async function executeAtomicUpdateWithMods(challengeData, playlistsData, scoresData, participationData) {
  const { data, error } = await supabaseAdmin.rpc('update_challenge_atomic_with_mods', {
    challenge_data: challengeData,
    playlists_data: playlistsData,
    scores_data: scoresData,
    participation_data: participationData
  });
  
  if (error) {
    throw new Error(`Atomic update with mods failed: ${error.message}`);
  }
  
  return data;
}

// Optimized parallel processing for playlists
async function processPlaylistsInParallel(roomData, roomIdNum, requestId, maxRetries = 3) {
  console.log(`🚀 Request ${requestId}: Processing ${roomData.playlist?.length || 0} playlists in parallel`);
  
  if (!roomData.playlist || roomData.playlist.length === 0) {
    return {
      playlistsData: [],
      scoresData: [],
      usersData: [],
      totalApiCallsForPlaylists: 0,
      playlistsProcessed: 0,
      scoresProcessed: 0
    };
  }

  // Limit concurrent API calls to avoid overwhelming the osu! API
  const concurrencyLimit = pLimit(4);
  const batchSize = 8;
  
  let totalApiCallsForPlaylists = 0;
  let playlistsProcessed = 0;
  let scoresProcessed = 0;
  
  const allPlaylistsData = [];
  const allScoresData = [];
  const allUsersData = [];
  const userMap = new Map();

  // Helper function to process a single playlist
  const processPlaylist = async (playlist, index) => {
    try {
      // Check API limits before processing
      const currentLimitStatus = apiTracker.checkLimits();
      if (currentLimitStatus === 'critical') {
        console.warn(`🚨 Request ${requestId}: Hit critical limit during playlist ${index + 1}, skipping remaining`);
        return null;
      }

      // Prepare playlist data
      const covers = playlist.beatmap?.beatmapset?.covers || {};
      const playlistRecord = {
        playlist_id: playlist.id,
        beatmap_id: playlist.beatmap_id,
        beatmap_title: playlist.beatmap?.beatmapset?.title || 'Unknown',
        beatmap_artist: playlist.beatmap?.beatmapset?.artist || 'Unknown',
        beatmap_version: playlist.beatmap?.version || 'Unknown',
        beatmap_difficulty: playlist.beatmap?.difficulty_rating || 0,
        beatmap_cover_url: covers.cover || null,
        beatmap_card_url: covers.card || null,
        beatmap_list_url: covers.list || null,
        beatmap_slimcover_url: covers.slimcover || null,
      };

      // Fetch scores with retry logic
      let scores;
      let scoreRetryCount = 0;
      
      while (scoreRetryCount < maxRetries) {
        try {
          scores = await trackedOsuAPI.getAllRoomScores(roomIdNum, playlist.id);
          break;
        } catch (scoreError) {
          scoreRetryCount++;
          if (scoreRetryCount >= maxRetries) {
            console.error(`❌ Request ${requestId}: Failed to fetch scores for playlist ${playlist.id} after ${maxRetries} attempts`);
            throw scoreError;
          }
          await new Promise(resolve => setTimeout(resolve, 500 * scoreRetryCount));
        }
      }
      
      const apiCalls = Math.ceil((scores?.length || 0) / 50);
      const playlistScoresData = [];
      const playlistUsersData = [];
      
      if (scores && scores.length > 0) {
        for (const score of scores) {
          try {
            // Deduplicate users
            const userKey = score.user_id.toString();
            if (!userMap.has(userKey)) {
              const userData = {
                osu_id: score.user_id,
                username: score.user?.username || 'Unknown',
                avatar_url: score.user?.avatar_url || null,
                country: score.user?.country_code || null,
                updated_at: new Date().toISOString()
              };
              userMap.set(userKey, userData);
              playlistUsersData.push(userData);
            }

            // Process mods with detailed information
            const modData = processModsData(score.mods);
            const scoreValue = score.total_score || score.score || 0;
            
            const scoreRecord = {
              playlist_id: playlist.id,
              user_osu_id: score.user_id,
              score: scoreValue,
              accuracy: score.accuracy * 100,
              max_combo: score.max_combo,
              mods: modData.legacy,
              mods_detailed: modData.detailed,
              rank_position: score.position || 999,
              submitted_at: score.ended_at || score.started_at || new Date().toISOString()
            };
            
            playlistScoresData.push(scoreRecord);
          } catch (scoreProcessError) {
            console.error(`❌ Request ${requestId}: Error processing score in playlist ${playlist.id}:`, scoreProcessError);
          }
        }
      }

      console.log(`✅ Request ${requestId}: Playlist ${index + 1}/${roomData.playlist.length} processed (${scores?.length || 0} scores)`);

      return {
        playlistRecord,
        scoresData: playlistScoresData,
        usersData: playlistUsersData,
        apiCalls,
        scoreCount: scores?.length || 0
      };

    } catch (error) {
      console.error(`❌ Request ${requestId}: Error processing playlist ${index + 1}:`, error);
      return null;
    }
  };

  // Process playlists in batches
  const playlists = roomData.playlist;
  for (let batchStart = 0; batchStart < playlists.length; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, playlists.length);
    const batch = playlists.slice(batchStart, batchEnd);
    
    console.log(`📦 Request ${requestId}: Processing batch ${Math.floor(batchStart / batchSize) + 1} (playlists ${batchStart + 1}-${batchEnd})`);
    
    // Process current batch in parallel
    const batchPromises = batch.map((playlist, batchIndex) => 
      concurrencyLimit(() => processPlaylist(playlist, batchStart + batchIndex))
    );
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Collect results from successful operations
    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value) {
        const { playlistRecord, scoresData, usersData, apiCalls, scoreCount } = result.value;
        
        allPlaylistsData.push(playlistRecord);
        allScoresData.push(...scoresData);
        allUsersData.push(...usersData);
        totalApiCallsForPlaylists += apiCalls;
        playlistsProcessed++;
        scoresProcessed += scoreCount;
      } else if (result.status === 'rejected') {
        console.error(`❌ Request ${requestId}: Batch playlist failed:`, result.reason);
      }
    }
    
    // Small delay between batches
    if (batchEnd < playlists.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // Deduplicate users data
  const uniqueUsersData = Array.from(userMap.values());

  console.log(`🎯 Request ${requestId}: Parallel processing complete - ${playlistsProcessed}/${playlists.length} playlists, ${scoresProcessed} scores, ${uniqueUsersData.length} unique users`);

  return {
    playlistsData: allPlaylistsData,
    scoresData: allScoresData,
    usersData: uniqueUsersData,
    totalApiCallsForPlaylists,
    playlistsProcessed,
    scoresProcessed
  };
}

// Optimized database transaction
async function executeOptimizedAtomicUpdate(challengeData, playlistsData, scoresData, usersData, requestId) {
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      console.log(`💾 Request ${requestId}: Executing atomic database transaction (attempt ${retryCount + 1}/${maxRetries})`);
      
      const result = await executeAtomicUpdateWithMods(
        challengeData,
        playlistsData,
        scoresData,
        usersData
      );
      
      console.log(`✅ Request ${requestId}: Database transaction completed`);
      return result;
      
    } catch (transactionError) {
      retryCount++;
      console.error(`❌ Request ${requestId}: Database transaction attempt ${retryCount} failed:`, transactionError);
      
      if (retryCount >= maxRetries) {
        throw new Error(`Database transaction failed after ${maxRetries} attempts: ${transactionError.message}`);
      }
      
      const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
      console.log(`⏳ Request ${requestId}: Retrying database transaction in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Ruleset winner calculation
async function updateChallengeRulesetWinner(challengeId, requestId) {
  try {
    console.log(`🏆 Request ${requestId}: Calculating ruleset winner for challenge ${challengeId}`);
    
    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from('challenges')
      .select('id, has_ruleset, ruleset_name, required_mods, ruleset_match_type')
      .eq('id', challengeId)
      .single();

    if (challengeError || !challenge) {
      console.warn(`⚠️ Request ${requestId}: Challenge ${challengeId} not found for ruleset update`);
      return { success: false, error: 'Challenge not found' };
    }

    if (!challenge.has_ruleset) {
      console.log(`📝 Request ${requestId}: Challenge ${challengeId} has no ruleset, skipping winner calculation`);
      return { success: true, has_ruleset: false };
    }

    const { data: winnerResult, error: winnerError } = await supabaseAdmin
      .rpc('update_challenge_ruleset_winner', { challenge_id_param: challengeId });

    if (winnerError) {
      console.error(`❌ Request ${requestId}: Error calculating ruleset winner:`, winnerError);
      return { success: false, error: winnerError.message };
    }

    if (winnerResult && winnerResult.winner_updated) {
      console.log(`🏆 Request ${requestId}: Ruleset winner updated - ${winnerResult.winner_username} with score ${winnerResult.winner_score}`);
    } else {
      console.log(`📝 Request ${requestId}: No qualifying scores found for ruleset "${challenge.ruleset_name}"`);
    }

    return {
      success: true,
      has_ruleset: true,
      ruleset_name: challenge.ruleset_name,
      winner_result: winnerResult
    };

  } catch (error) {
    console.error(`❌ Request ${requestId}: Error in ruleset winner calculation:`, error);
    return { success: false, error: error.message };
  }
}

// Database-based distributed locking
const LOCK_TIMEOUT = 4 * 60 * 1000;

async function acquireDistributedLock(roomId, requestId, timeoutMs = LOCK_TIMEOUT) {
  const lockId = `challenge_update_${roomId}`;
  const expiresAt = new Date(Date.now() + timeoutMs).toISOString();
  
  try {
    const { data, error } = await supabaseAdmin
      .from('api_locks')
      .insert({
        lock_id: lockId,
        request_id: requestId,
        created_at: new Date().toISOString(),
        expires_at: expiresAt,
        resource_type: 'challenge_update',
        resource_id: roomId.toString()
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        const { data: existingLock } = await supabaseAdmin
          .from('api_locks')
          .select('*')
          .eq('lock_id', lockId)
          .single();
        
        if (existingLock && new Date(existingLock.expires_at) < new Date()) {
          const { data: updatedLock, error: updateError } = await supabaseAdmin
            .from('api_locks')
            .update({
              request_id: requestId,
              created_at: new Date().toISOString(),
              expires_at: expiresAt
            })
            .eq('lock_id', lockId)
            .eq('expires_at', existingLock.expires_at)
            .select()
            .single();
          
          if (!updateError && updatedLock) {
            console.log(`🔐 Request ${requestId}: Acquired expired lock for room ${roomId}`);
            return { success: true, lock: updatedLock };
          }
        }
        
        return { 
          success: false, 
          error: 'Resource is currently locked',
          existingLock 
        };
      }
      
      throw error;
    }
    
    console.log(`🔐 Request ${requestId}: Acquired new lock for room ${roomId}`);
    return { success: true, lock: data };
    
  } catch (error) {
    console.error(`❌ Request ${requestId}: Lock acquisition error:`, error);
    return { success: false, error: error.message };
  }
}

async function releaseDistributedLock(roomId, requestId) {
  const lockId = `challenge_update_${roomId}`;
  
  try {
    const { error } = await supabaseAdmin
      .from('api_locks')
      .delete()
      .eq('lock_id', lockId)
      .eq('request_id', requestId);
    
    if (error) {
      console.error(`❌ Request ${requestId}: Failed to release lock for room ${roomId}:`, error);
    } else {
      console.log(`🔓 Request ${requestId}: Released lock for room ${roomId}`);
    }
  } catch (error) {
    console.error(`❌ Request ${requestId}: Lock release error:`, error);
  }
}

async function cleanupExpiredLocks() {
  try {
    const { data, error } = await supabaseAdmin
      .from('api_locks')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select();
    
    if (data && data.length > 0) {
      console.log(`🧹 Cleaned up ${data.length} expired locks`);
    }
  } catch (error) {
    console.error('❌ Lock cleanup error:', error);
  }
}

// MAIN HANDLER - CLEAN VERSION
async function handler(req, res) {
  const requestId = Math.random().toString(36).substr(2, 9);
  const totalStartTime = Date.now();

  // MINIMAL LOGGING: Start
  const logId = syncLogger.syncStart('update-challenge', req.body?.roomId || 'unknown', { requestId });

  await cleanupExpiredLocks();

  try {
    validateRequest(req, {
      method: 'POST',
      body: {
        roomId: { required: true }
      }
    });

    const { roomId } = req.body;
    const roomIdNum = parseInt(roomId);
    
    if (isNaN(roomIdNum) || roomIdNum <= 0) {
      throw new Error('Invalid room ID - must be a positive number');
    }

    // Acquire distributed lock
    const lockResult = await acquireDistributedLock(roomIdNum, requestId);
    
    if (!lockResult.success) {
      console.log(`🔒 Request ${requestId}: Room ${roomIdNum} is locked: ${lockResult.error}`);
      
      return res.status(429).json({ 
        success: false,
        error: 'Challenge update already in progress',
        details: {
          roomId: roomIdNum,
          requestId,
          message: 'Another instance is currently updating this challenge'
        }
      });
    }

    try {
      // Check API limits
      const limitStatus = apiTracker.checkLimits();
      const usageStats = apiTracker.getUsageStats();
      
      console.log(`📊 Request ${requestId}: Current API usage: ${usageStats.usage?.functions?.percentage || '0'}%`);
      
      if (limitStatus === 'critical') {
        throw new Error('API usage critical - temporarily limiting requests');
      }

      console.log(`🔄 Request ${requestId}: Starting challenge update for room ${roomIdNum}`);

      // 1. Fetch room data
      let roomData;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          roomData = await trackedOsuAPI.getRoom(roomIdNum);
          break;
        } catch (apiError) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw apiError;
          }
          console.warn(`⚠️ Request ${requestId}: API retry ${retryCount}/${maxRetries} for room ${roomIdNum}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      console.log(`📡 Request ${requestId}: Room data fetched successfully`);
      
      if (!roomData || !roomData.id) {
        throw new Error('Room not found');
      }

      // 2. Prepare challenge data
      let backgroundImageUrl = null;
      if (roomData.playlist && roomData.playlist.length > 0) {
        const firstBeatmap = roomData.playlist[0];
        if (firstBeatmap.beatmap?.beatmapset?.covers?.cover) {
          backgroundImageUrl = firstBeatmap.beatmap.beatmapset.covers.cover;
        }
      }

      const challengeData = {
        room_id: roomIdNum,
        name: roomData.name,
        host: roomData.host?.username || 'Unknown',
        room_type: roomData.type || 'playlists',
        start_date: roomData.starts_at,
        end_date: roomData.ends_at,
        participant_count: roomData.participant_count || 0,
        is_active: roomData.active || false,
        background_image_url: backgroundImageUrl,
        updated_at: new Date().toISOString()
      };

      // 3. Process playlists and scores
      const {
        playlistsData,
        scoresData,
        usersData,
        totalApiCallsForPlaylists,
        playlistsProcessed,
        scoresProcessed
      } = await processPlaylistsInParallel(roomData, roomIdNum, requestId);
      
      console.log(`⚡ Request ${requestId}: Processed ${playlistsProcessed} playlists, ${scoresProcessed} scores`);

      // 4. Update database
      let challengeDbId = null;
      
      try {
        const result = await executeOptimizedAtomicUpdate(
          challengeData,
          playlistsData,
          scoresData,
          usersData,
          requestId
        );
        
        challengeDbId = result.challenge_id;
        
      } catch (transactionError) {
        console.error(`❌ Request ${requestId}: Database transaction failed:`, transactionError);
        throw new Error(`Database transaction failed: ${transactionError.message}`);
      }

      // 5. Calculate ruleset winner
      let rulesetResult = { success: false, has_ruleset: false };
      
      if (challengeDbId) {
        try {
          rulesetResult = await updateChallengeRulesetWinner(challengeDbId, requestId);
        } catch (rulesetError) {
          console.warn(`⚠️ Request ${requestId}: Ruleset winner calculation failed:`, rulesetError);
          rulesetResult = { success: false, error: rulesetError.message };
        }
      }
      
      const totalTime = Date.now() - totalStartTime;

      // 6. Update global tracking cache
      markChallengeUpdated(roomIdNum);

      const finalUsage = apiTracker.getUsageStats();
      
      console.log(`✅ Request ${requestId}: Challenge update complete in ${Math.round(totalTime)}ms`);

      // MINIMAL LOGGING: Success
      syncLogger.syncComplete('update-challenge', roomIdNum, totalStartTime, {
        requestId,
        playlistsProcessed,
        scoresProcessed,
        totalTime: Math.round(totalTime)
      });

      return res.status(200).json({ 
        success: true, 
        challenge: challengeData,
        message: 'Challenge data updated successfully',
        stats: {
          playlistsProcessed,
          scoresProcessed,
          totalPlaylists: roomData.playlist?.length || 0,
          estimatedExternalCalls: totalApiCallsForPlaylists,
          uniqueUsers: usersData.length
        },
        performance: {
          totalTimeMs: Math.round(totalTime)
        },
        apiUsage: {
          percentage: finalUsage.usage?.functions?.percentage || '0',
          remaining: finalUsage.usage?.functions?.remaining || 100000
        },
        ruleset: rulesetResult,
        requestId
      });

    } catch (error) {
      console.error(`❌ Request ${requestId}: Update challenge error:`, error);
      return handleAPIError(res, error);
    } finally {
      await releaseDistributedLock(roomIdNum, requestId);
    }

  } catch (error) {
    console.error(`❌ Request validation error:`, error);
    syncLogger.syncError('update-challenge', req.body?.roomId || 'unknown', error, totalStartTime, { requestId });
    return handleAPIError(res, error);
  }
}

export default withAPITracking(handler, { memoryMB: 512 });