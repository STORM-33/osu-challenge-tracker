import { supabaseAdmin } from '../../lib/supabase-admin';
import { trackedOsuAPI } from '../../lib/osu-api'; 
import apiTracker from '../../lib/api-tracker';
import { withAPITracking } from '../../middleware';
import { handleAPIError, validateRequest } from '../../lib/api-utils';

// 🚀 FIXED: Database-based distributed locking instead of memory-only
const LOCK_TIMEOUT = 10 * 60 * 1000; // 10 minutes max lock time

// 🚀 NEW: Database-based locking functions
async function acquireDistributedLock(roomId, requestId, timeoutMs = LOCK_TIMEOUT) {
  const lockId = `challenge_update_${roomId}`;
  const expiresAt = new Date(Date.now() + timeoutMs).toISOString();
  
  try {
    // Try to insert a new lock
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
      // Check if it's a conflict (lock already exists)
      if (error.code === '23505') { // unique_violation
        // Check if existing lock is expired
        const { data: existingLock } = await supabaseAdmin
          .from('api_locks')
          .select('*')
          .eq('lock_id', lockId)
          .single();
        
        if (existingLock && new Date(existingLock.expires_at) < new Date()) {
          // Lock is expired, try to update it
          const { data: updatedLock, error: updateError } = await supabaseAdmin
            .from('api_locks')
            .update({
              request_id: requestId,
              created_at: new Date().toISOString(),
              expires_at: expiresAt
            })
            .eq('lock_id', lockId)
            .eq('expires_at', existingLock.expires_at) // Ensure we're updating the same expired lock
            .select()
            .single();
          
          if (!updateError && updatedLock) {
            console.log(`🔐 Acquired expired lock for room ${roomId}`);
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
    
    console.log(`🔐 Acquired new lock for room ${roomId}`);
    return { success: true, lock: data };
    
  } catch (error) {
    console.error('Lock acquisition error:', error);
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
      .eq('request_id', requestId); // Only delete if we own the lock
    
    if (error) {
      console.error(`Failed to release lock for room ${roomId}:`, error);
    } else {
      console.log(`🔓 Released lock for room ${roomId}`);
    }
  } catch (error) {
    console.error('Lock release error:', error);
  }
}

// 🚀 NEW: Cleanup expired locks periodically
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
    console.error('Lock cleanup error:', error);
  }
}

// 🚀 NEW: Atomic transaction wrapper for database operations
async function executeAtomicUpdate(challengeData, playlistsData, scoresData, participationData) {
  // Use a single transaction to ensure atomicity
  const { data, error } = await supabaseAdmin.rpc('update_challenge_atomic', {
    challenge_data: challengeData,
    playlists_data: playlistsData,
    scores_data: scoresData,
    participation_data: participationData
  });
  
  if (error) {
    throw new Error(`Atomic update failed: ${error.message}`);
  }
  
  return data;
}

async function handler(req, res) {
  // Add request ID for tracking
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`🆔 Request ${requestId}: /api/update-challenge called`);

  // Cleanup expired locks first
  await cleanupExpiredLocks();

  try {
    // Validate request
    validateRequest(req, {
      method: 'POST',
      body: {
        roomId: { required: true }
      }
    });

    const { roomId } = req.body;
    
    // Convert to number and validate
    const roomIdNum = parseInt(roomId);
    if (isNaN(roomIdNum) || roomIdNum <= 0) {
      throw new Error('Invalid room ID - must be a positive number');
    }

    // 🚀 FIXED: Try to acquire distributed lock
    const lockResult = await acquireDistributedLock(roomIdNum, requestId);
    
    if (!lockResult.success) {
      console.log(`🔒 Request ${requestId}: Room ${roomIdNum} is locked: ${lockResult.error}`);
      
      let lockAge = 0;
      if (lockResult.existingLock) {
        lockAge = Math.floor((Date.now() - new Date(lockResult.existingLock.created_at)) / 1000);
      }
      
      return res.status(429).json({ 
        success: false,
        error: 'Challenge update already in progress',
        details: {
          roomId: roomIdNum,
          lockAge,
          requestId,
          message: 'Another instance is currently updating this challenge'
        }
      });
    }

    try {
      // Check API limits before proceeding
      const limitStatus = apiTracker.checkLimits();
      const usageStats = apiTracker.getUsageStats();
      
      console.log(`📊 Request ${requestId}: Current API usage: ${usageStats.usage?.functions?.percentage || '0'}% (${usageStats.monthly?.total || 0}/${usageStats.limits?.functions || 100000})`);
      
      if (limitStatus === 'critical') {
        throw new Error('API usage critical - temporarily limiting requests');
      }

      console.log(`🔄 Request ${requestId}: Starting challenge update for room ${roomIdNum}`);

      // Fetch room details from osu! API with retry logic
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
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
        }
      }
      
      if (!roomData || !roomData.id) {
        throw new Error('Room not found');
      }

      // Extract background image
      let backgroundImageUrl = null;
      if (roomData.playlist && roomData.playlist.length > 0) {
        const firstBeatmap = roomData.playlist[0];
        if (firstBeatmap.beatmap?.beatmapset?.covers?.cover) {
          backgroundImageUrl = firstBeatmap.beatmap.beatmapset.covers.cover;
        }
      }

      // Prepare data for atomic transaction
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

      let totalApiCallsForPlaylists = 0;
      let playlistsProcessed = 0;
      let scoresProcessed = 0;
      
      const playlistsData = [];
      const scoresData = [];
      const usersData = [];

      // Process playlists with better error handling and batching
      if (roomData.playlist && roomData.playlist.length > 0) {
        console.log(`📝 Request ${requestId}: Processing ${roomData.playlist.length} playlists`);
        
        for (const [index, playlist] of roomData.playlist.entries()) {
          // Check limits before each playlist
          const currentLimitStatus = apiTracker.checkLimits();
          
          if (currentLimitStatus === 'critical') {
            console.warn(`🚨 Request ${requestId}: Hit critical limit during playlist ${index + 1}/${roomData.playlist.length}. Stopping here.`);
            break;
          }

          try {
            // Extract beatmap cover images
            const covers = playlist.beatmap?.beatmapset?.covers || {};
            
            // Prepare playlist data
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
            
            playlistsData.push(playlistRecord);
            playlistsProcessed++;

            // Fetch and process scores for this playlist with retry logic
            try {
              let scores;
              let scoreRetryCount = 0;
              
              while (scoreRetryCount < maxRetries) {
                try {
                  scores = await trackedOsuAPI.getAllRoomScores(roomIdNum, playlist.id);
                  break;
                } catch (scoreError) {
                  scoreRetryCount++;
                  if (scoreRetryCount >= maxRetries) {
                    throw scoreError;
                  }
                  await new Promise(resolve => setTimeout(resolve, 500 * scoreRetryCount));
                }
              }
              
              totalApiCallsForPlaylists += Math.ceil(scores.length / 50);
              
              if (scores && scores.length > 0) {
                console.log(`📊 Request ${requestId}: Processing ${scores.length} scores for playlist ${index + 1}`);
                
                // Process scores in batches
                for (const score of scores) {
                  try {
                    // Prepare user data
                    const userData = {
                      osu_id: score.user_id,
                      username: score.user?.username || 'Unknown',
                      avatar_url: score.user?.avatar_url || null,
                      country: score.user?.country_code || null,
                      updated_at: new Date().toISOString()
                    };
                    
                    usersData.push(userData);

                    // Prepare score data
                    const scoreValue = score.total_score || score.score || 0;
                    
                    const scoreRecord = {
                      playlist_id: playlist.id,
                      user_osu_id: score.user_id, // We'll resolve this to internal user_id in the transaction
                      score: scoreValue,
                      accuracy: score.accuracy * 100,
                      max_combo: score.max_combo,
                      mods: score.mods?.length > 0 ? score.mods.map(m => m.acronym).join('') : 'None',
                      rank_position: score.position || 999,
                      submitted_at: score.ended_at || score.started_at || new Date().toISOString()
                    };
                    
                    scoresData.push(scoreRecord);
                    scoresProcessed++;
                  } catch (scoreProcessError) {
                    console.error(`❌ Request ${requestId}: Error processing score:`, scoreProcessError);
                  }
                }
              }
            } catch (scoreError) {
              console.error(`❌ Request ${requestId}: Error fetching scores for playlist ${playlist.id}:`, scoreError);
            }
          } catch (playlistProcessError) {
            console.error(`❌ Request ${requestId}: Error processing playlist ${playlist.id}:`, playlistProcessError);
          }
        }
      }

      // 🚀 FIXED: Execute everything in a single atomic transaction
      console.log(`💾 Request ${requestId}: Executing atomic database transaction...`);
      
      try {
        const result = await executeAtomicUpdate(
          challengeData,
          playlistsData, 
          scoresData,
          usersData
        );
        
        console.log(`✅ Request ${requestId}: Atomic transaction completed successfully`);
        
      } catch (transactionError) {
        console.error(`❌ Request ${requestId}: Atomic transaction failed:`, transactionError);
        throw new Error(`Database transaction failed: ${transactionError.message}`);
      }

      // Final usage report
      const finalUsage = apiTracker.getUsageStats();
      console.log(`✅ Request ${requestId}: Challenge update complete. Processed ${playlistsProcessed} playlists, ${scoresProcessed} scores. Final API usage: ${finalUsage.usage?.functions?.percentage || '0'}%`);

      const response = { 
        success: true, 
        challenge: challengeData,
        message: 'Challenge data updated successfully',
        stats: {
          playlistsProcessed,
          scoresProcessed,
          totalPlaylists: roomData.playlist?.length || 0,
          estimatedExternalCalls: totalApiCallsForPlaylists
        },
        apiUsage: {
          percentage: finalUsage.usage?.functions?.percentage || '0',
          remaining: finalUsage.usage?.functions?.remaining || 100000
        },
        requestId
      };

      res.status(200).json(response);

    } catch (error) {
      console.error(`❌ Request ${requestId}: Update challenge error:`, error);
      
      // Report current usage even on error
      const errorUsage = apiTracker.getUsageStats();
      console.log(`💥 Request ${requestId}: Error occurred at ${errorUsage.usage?.functions?.percentage || '0'}% API usage`);
      
      return handleAPIError(res, error);
    } finally {
      // 🚀 FIXED: Always release the distributed lock
      await releaseDistributedLock(roomIdNum, requestId);
      console.log(`🔓 Request ${requestId}: Released distributed lock for room ${roomIdNum}`);
    }

  } catch (error) {
    console.error(`❌ Request validation error:`, error);
    return handleAPIError(res, error);
  }
}

export default withAPITracking(handler, { memoryMB: 512 });