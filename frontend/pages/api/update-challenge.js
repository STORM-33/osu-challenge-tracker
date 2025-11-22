import { supabaseAdmin } from '../../lib/supabase-admin';
import { trackedOsuAPI } from '../../lib/osu-api'; 
import apiTracker from '../../lib/api-tracker';
import { handleAPIError, validateRequest } from '../../lib/api-utils';
import { markChallengeUpdated } from '../../lib/update-tracker';
import pLimit from 'p-limit';

// Helper function to process mods
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

// Atomic update function
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

// Process playlists in parallel
async function processPlaylistsInParallel(roomData, roomIdNum, requestId, maxRetries = 3) {
  console.log(`🚀 Request ${requestId}: Processing ${roomData.playlist?.length || 0} playlists`);
  
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

  const concurrencyLimit = pLimit(4);
  const batchSize = 8;
  
  let totalApiCallsForPlaylists = 0;
  let playlistsProcessed = 0;
  let scoresProcessed = 0;
  
  const allPlaylistsData = [];
  const allScoresData = [];
  const allUsersData = [];
  const userMap = new Map();

  const processPlaylist = async (playlist, index) => {
    try {
      const currentLimitStatus = apiTracker.checkLimits();
      if (currentLimitStatus === 'critical') {
        console.warn(`🚨 Request ${requestId}: Hit critical limit at playlist ${index + 1}`);
        return null;
      }

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

      let scores;
      let scoreRetryCount = 0;
      
      while (scoreRetryCount < maxRetries) {
        try {
          scores = await trackedOsuAPI.getAllRoomScores(roomIdNum, playlist.id);
          break;
        } catch (scoreError) {
          scoreRetryCount++;
          if (scoreRetryCount >= maxRetries) {
            console.error(`❌ Request ${requestId}: Failed to fetch scores for playlist ${playlist.id}`);
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
            console.error(`❌ Request ${requestId}: Error processing score:`, scoreProcessError);
          }
        }
      }

      console.log(`✅ Request ${requestId}: Playlist ${index + 1}/${roomData.playlist.length} done (${scores?.length || 0} scores)`);

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

  const playlists = roomData.playlist;
  for (let batchStart = 0; batchStart < playlists.length; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, playlists.length);
    const batch = playlists.slice(batchStart, batchEnd);
    
    console.log(`📦 Request ${requestId}: Batch ${Math.floor(batchStart / batchSize) + 1}`);
    
    const batchPromises = batch.map((playlist, batchIndex) => 
      concurrencyLimit(() => processPlaylist(playlist, batchStart + batchIndex))
    );
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value) {
        const { playlistRecord, scoresData, usersData, apiCalls, scoreCount } = result.value;
        
        allPlaylistsData.push(playlistRecord);
        allScoresData.push(...scoresData);
        allUsersData.push(...usersData);
        totalApiCallsForPlaylists += apiCalls;
        playlistsProcessed++;
        scoresProcessed += scoreCount;
      }
    }
    
    if (batchEnd < playlists.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  const uniqueUsersData = Array.from(userMap.values());

  console.log(`🎯 Request ${requestId}: Complete - ${playlistsProcessed}/${playlists.length} playlists, ${scoresProcessed} scores`);

  return {
    playlistsData: allPlaylistsData,
    scoresData: allScoresData,
    usersData: uniqueUsersData,
    totalApiCallsForPlaylists,
    playlistsProcessed,
    scoresProcessed
  };
}

// Execute database update with retries
async function executeOptimizedAtomicUpdate(challengeData, playlistsData, scoresData, usersData, requestId) {
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      console.log(`💾 Request ${requestId}: Database transaction (attempt ${retryCount + 1})`);
      
      const result = await executeAtomicUpdateWithMods(
        challengeData,
        playlistsData,
        scoresData,
        usersData
      );
      
      console.log(`✅ Request ${requestId}: Transaction complete`);
      return result;
      
    } catch (transactionError) {
      retryCount++;
      console.error(`❌ Request ${requestId}: Transaction failed (attempt ${retryCount})`);
      
      if (retryCount >= maxRetries) {
        throw new Error(`Transaction failed after ${maxRetries} attempts: ${transactionError.message}`);
      }
      
      const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Calculate ruleset winner
async function updateChallengeRulesetWinner(challengeId, requestId) {
  try {
    console.log(`🏆 Request ${requestId}: Calculating ruleset winner for ${challengeId}`);
    
    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from('challenges')
      .select('id, room_id, has_ruleset, required_mods, ruleset_match_type')
      .eq('id', challengeId)
      .single();

    if (challengeError || !challenge) {
      console.warn(`⚠️ Request ${requestId}: Challenge ${challengeId} not found`);
      return { success: false, error: 'Challenge not found' };
    }

    if (!challenge.has_ruleset) {
      console.log(`📝 Request ${requestId}: No ruleset, skipping`);
      return { success: true, has_ruleset: false };
    }

    const { data: winnerResult, error: winnerError } = await supabaseAdmin
      .rpc('update_challenge_ruleset_winner', { challenge_id_param: challengeId });

    if (winnerError) {
      console.error(`❌ Request ${requestId}: Ruleset winner error:`, winnerError);
      return { success: false, error: winnerError.message };
    }

    if (winnerResult?.winner_updated) {
      console.log(`🏆 Request ${requestId}: Winner: ${winnerResult.winner_username}`);
    }

    return {
      success: true,
      has_ruleset: true,
      winner_result: winnerResult
    };

  } catch (error) {
    console.error(`❌ Request ${requestId}: Ruleset calculation error:`, error);
    return { success: false, error: error.message };
  }
}

// MAIN HANDLER
async function handler(req, res) {
  const requestId = Math.random().toString(36).substr(2, 9);
  const totalStartTime = Date.now();

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
      throw new Error('Invalid room ID');
    }

    // Check API limits
    const limitStatus = apiTracker.checkLimits();
    if (limitStatus === 'critical') {
      throw new Error('API usage critical');
    }

    console.log(`🔄 Request ${requestId}: Updating challenge ${roomIdNum}`);

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
        if (retryCount >= maxRetries) throw apiError;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
    
    if (!roomData?.id) {
      throw new Error('Room not found');
    }

    // 2. Prepare challenge data
    let backgroundImageUrl = null;
    if (roomData.playlist?.length > 0) {
      const firstBeatmap = roomData.playlist[0];
      backgroundImageUrl = firstBeatmap.beatmap?.beatmapset?.covers?.cover || null;
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
      updated_at: new Date().toISOString(),
      custom_name: null 
    };

    // Auto-rename inactive challenges based on type (set custom_name)
    if (challengeData.is_active === false && roomData.playlist && roomData.playlist.length > 0) {
      try {
        let customName = null;
        
        if (roomData.playlist.length === 1) {
          // Weekly challenge: rename to [song title] - [artist]
          const firstMap = roomData.playlist[0];
          const metadata = firstMap.beatmap?.beatmapset;

          if (metadata && metadata.title && metadata.artist) {
            customName = `${metadata.title} - ${metadata.artist}`;
            console.log(`Request ${requestId}: Weekly challenge ended. Setting custom name: "${customName}"`);
          }
        } else {
          // Cycle End challenge: rename to "osu!Challengers CE - [month]"
          const startDate = new Date(roomData.starts_at || challengeData.start_date);
          const monthName = startDate.toLocaleString('en-US', { month: 'long' });
          customName = `osu!Challengers CE - ${monthName}`;
          console.log(`Request ${requestId}: Cycle End challenge ended. Setting custom name: "${customName}"`);
        }
        
        // Add custom_name to challengeData
        if (customName) {
          challengeData.custom_name = customName;
        }
      } catch (err) {
        console.warn(`Request ${requestId}: Failed to generate custom name:`, err.message);
      }
    }

    // 3. Process playlists and scores
    const {
      playlistsData,
      scoresData,
      usersData,
      totalApiCallsForPlaylists,
      playlistsProcessed,
      scoresProcessed
    } = await processPlaylistsInParallel(roomData, roomIdNum, requestId);

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
      throw new Error(`Database update failed: ${transactionError.message}`);
    }

    // 5. Calculate ruleset winner
    let rulesetResult = { success: false, has_ruleset: false };
    if (challengeDbId) {
      try {
        rulesetResult = await updateChallengeRulesetWinner(challengeDbId, requestId);
      } catch (rulesetError) {
        console.warn(`⚠️ Request ${requestId}: Ruleset failed:`, rulesetError);
      }
    }
    
    const totalTime = Date.now() - totalStartTime;

    // 6. Mark as updated
    markChallengeUpdated(roomIdNum);

    const finalUsage = apiTracker.getUsageStats();
    
    console.log(`✅ Request ${requestId}: Complete in ${Math.round(totalTime)}ms`);

    return res.status(200).json({ 
      success: true, 
      challenge: challengeData,
      message: 'Challenge updated successfully',
      stats: {
        playlistsProcessed,
        scoresProcessed,
        totalPlaylists: roomData.playlist?.length || 0,
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
    console.error(`❌ Request error:`, error);
    return handleAPIError(res, error);
  }
}

export default handler;