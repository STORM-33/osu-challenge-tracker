import { supabaseAdmin } from '../../lib/supabase-admin';
import { trackedOsuAPI } from '../../lib/osu-api'; 
import apiTracker from '../../lib/api-tracker';
import { withAPITracking } from '../../middleware';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    // 🚨 CRITICAL: Check Vercel API limits before proceeding
    const limitStatus = apiTracker.checkLimits();
    const usageStats = apiTracker.getUsageStats();
    
    console.log(`📊 Current API usage: ${usageStats.usage?.functions?.percentage || '0'}% (${usageStats.monthly?.total || 0}/${usageStats.limits?.functions || 100000})`);
    
    if (limitStatus === 'critical') {
      console.warn('🚨 API usage is critical! Aborting challenge update to preserve limits.');
      return res.status(429).json({ 
        error: 'API usage critical - temporarily limiting requests',
        usage: usageStats.usage
      });
    } else if (limitStatus === 'warning') {
      console.warn('⚠️ API usage is high - proceeding with caution');
    }

    console.log(`📊 Triggering challenge update - this will make multiple osu! API calls`);
    console.log(`Updating challenge data for room ${roomId}`);

    // 🔄 TRACKED: Fetch room details from osu! API (now automatically tracked)
    const roomData = await trackedOsuAPI.getRoom(roomId);
    
    if (!roomData || !roomData.id) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Extract the first beatmap's cover image for background
    let backgroundImageUrl = null;
    if (roomData.playlist && roomData.playlist.length > 0) {
      const firstBeatmap = roomData.playlist[0];
      if (firstBeatmap.beatmap?.beatmapset?.covers?.cover) {
        backgroundImageUrl = firstBeatmap.beatmap.beatmapset.covers.cover;
      }
    }

    // Upsert challenge
    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from('challenges')
      .upsert({
        room_id: parseInt(roomId),
        name: roomData.name,
        host: roomData.host?.username || 'Unknown',
        room_type: roomData.type || 'playlists',
        start_date: roomData.starts_at,
        end_date: roomData.ends_at,
        participant_count: roomData.participant_count || 0,
        is_active: roomData.active || false,
        background_image_url: backgroundImageUrl,
        updated_at: new Date().toISOString()
      }, { onConflict: 'room_id' })
      .select()
      .single();

    if (challengeError) {
      console.error('Challenge upsert error:', challengeError);
      return res.status(500).json({ error: 'Failed to update challenge' });
    }

    let totalApiCallsForPlaylists = 0;

    // Process playlists
    if (roomData.playlist && roomData.playlist.length > 0) {
      for (const [index, playlist] of roomData.playlist.entries()) {
        // Check limits before each playlist (since each can make many API calls)
        const currentLimitStatus = apiTracker.checkLimits();
        const currentUsage = apiTracker.getUsageStats();
        
        if (currentLimitStatus === 'critical') {
          console.warn(`🚨 Hit critical limit during playlist ${index + 1}/${roomData.playlist.length}. Stopping here.`);
          break;
        }

        // Extract beatmap cover images
        const covers = playlist.beatmap?.beatmapset?.covers || {};
        
        // Upsert playlist with image URLs
        const { data: playlistData, error: playlistError } = await supabaseAdmin
          .from('playlists')
          .upsert({
            playlist_id: playlist.id,
            challenge_id: challenge.id,
            beatmap_id: playlist.beatmap_id,
            beatmap_title: playlist.beatmap?.beatmapset?.title || 'Unknown',
            beatmap_artist: playlist.beatmap?.beatmapset?.artist || 'Unknown',
            beatmap_version: playlist.beatmap?.version || 'Unknown',
            beatmap_difficulty: playlist.beatmap?.difficulty_rating || 0,
            beatmap_cover_url: covers.cover || null,
            beatmap_card_url: covers.card || null,
            beatmap_list_url: covers.list || null,
            beatmap_slimcover_url: covers.slimcover || null,
          }, { onConflict: 'playlist_id' })
          .select()
          .single();

        if (playlistError) {
          console.error(`Playlist ${playlist.id} upsert error:`, playlistError);
          continue;
        }

        // 🔄 TRACKED: Fetch and process scores for this playlist
        try {
          console.log(`📊 Before fetching scores for playlist ${index + 1}: Usage at ${currentUsage.usage?.functions?.percentage || '0'}%`);
          
          // FIXED: Use the correct method name
          const scores = await trackedOsuAPI.getAllRoomScores(roomId, playlist.id);
          totalApiCallsForPlaylists += Math.ceil(scores.length / 50); // Estimate API calls made
          
          const afterUsage = apiTracker.getUsageStats();
          console.log(`📊 After fetching ${scores.length} scores: Usage at ${afterUsage.usage?.functions?.percentage || '0'}%`);
          
          if (scores && scores.length > 0) {
            for (const score of scores) {
              // Upsert user
              const { data: userData, error: userError } = await supabaseAdmin
                .from('users')
                .upsert({
                  osu_id: score.user_id,
                  username: score.user?.username || 'Unknown',
                  avatar_url: score.user?.avatar_url || null,
                  country: score.user?.country_code || null,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'osu_id' })
                .select()
                .single();

              if (userError) {
                console.error(`User ${score.user_id} upsert error:`, userError);
                continue;
              }

              // FIXED: Use total_score instead of score
              // Also added better error handling for missing fields
              const scoreValue = score.total_score || score.score || 0;
              
              if (scoreValue === 0) {
                console.warn(`Score value is 0 for user ${score.user_id} in playlist ${playlist.id}`);
              }

              // Upsert score
              const { error: scoreError } = await supabaseAdmin
              .from('scores')
              .upsert({
                playlist_id: playlistData.id,
                user_id: userData.id,
                score: scoreValue,
                accuracy: score.accuracy * 100,
                max_combo: score.max_combo,
                mods: score.mods?.length > 0 ? score.mods.map(m => m.acronym).join('') : 'None',
                rank_position: score.position || 999,
                submitted_at: score.ended_at || score.started_at || new Date().toISOString()
              }, { 
                onConflict: 'playlist_id,user_id',
                ignoreDuplicates: false 
              });

              if (scoreError) {
                console.error(`Score upsert error:`, scoreError);
              }
            }
          }
        } catch (scoreError) {
          console.error(`Error fetching scores for playlist ${playlist.id}:`, scoreError);
        }
      }
    }

    // FIXED: Update user participation - simpler approach
    try {
      // First, get all playlist IDs for this challenge
      const { data: challengePlaylists, error: playlistsError } = await supabaseAdmin
        .from('playlists')
        .select('id')
        .eq('challenge_id', challenge.id);

      if (!playlistsError && challengePlaylists && challengePlaylists.length > 0) {
        const playlistIds = challengePlaylists.map(p => p.id);
        
        // Then get all unique users who have scores in these playlists
        const { data: scoreUsers, error: scoresError } = await supabaseAdmin
          .from('scores')
          .select('user_id')
          .in('playlist_id', playlistIds);

        if (!scoresError && scoreUsers && scoreUsers.length > 0) {
          const uniqueUserIds = [...new Set(scoreUsers.map(s => s.user_id))];
          
          // Update participation for each user
          for (const userId of uniqueUserIds) {
            const { error: participationError } = await supabaseAdmin
              .from('user_challenges')
              .upsert({
                user_id: userId,
                challenge_id: challenge.id,
                first_participated: new Date().toISOString(),
                last_updated: new Date().toISOString()
              }, { 
                onConflict: 'user_id,challenge_id',
                ignoreDuplicates: false 
              });

            if (participationError) {
              console.error(`Error updating participation for user ${userId}:`, participationError);
            }
          }
          
          console.log(`Updated participation for ${uniqueUserIds.length} users`);
        } else if (scoresError) {
          console.error('Error fetching score users:', scoresError);
        }
      } else if (playlistsError) {
        console.error('Error fetching challenge playlists:', playlistsError);
      }
    } catch (participationError) {
      console.error('Participation update error:', participationError);
    }

    // 📊 Final usage report
    const finalUsage = apiTracker.getUsageStats();
    console.log(`✅ Challenge update complete. Final API usage: ${finalUsage.usage?.functions?.percentage || '0'}% (estimated ${totalApiCallsForPlaylists} external API calls made)`);

    res.status(200).json({ 
      success: true, 
      challenge,
      message: 'Challenge data updated successfully',
      apiUsage: {
        percentage: finalUsage.usage?.functions?.percentage || '0',
        remaining: finalUsage.usage?.functions?.remaining || 100000,
        estimatedExternalCalls: totalApiCallsForPlaylists
      }
    });

  } catch (error) {
    console.error('Update challenge error:', error);
    
    // Even on error, report current usage
    const errorUsage = apiTracker.getUsageStats();
    console.log(`❌ Error occurred at ${errorUsage.usage?.functions?.percentage || '0'}% API usage`);
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      apiUsage: errorUsage.usage
    });
  }
}

export default withAPITracking(handler, { memoryMB: 512 });