import { supabaseAdmin } from '../../lib/supabase-admin';
import { getOsuClient } from '../../lib/osu-api';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    console.log(`Updating challenge data for room ${roomId}`);

    // Initialize osu! API client
    const osuClient = getOsuClient();
    if (!osuClient) {
      return res.status(500).json({ error: 'Failed to initialize osu! client' });
    }

    // Fetch room details from osu! API
    const roomData = await osuClient.getRoomInfo(roomId);
    
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

    // Process playlists
    if (roomData.playlist && roomData.playlist.length > 0) {
      for (const playlist of roomData.playlist) {
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

        // Fetch and process scores for this playlist
        try {
          const scores = await osuClient.getAllPlaylistScores(roomId, playlist.id);
          
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
                  score: scoreValue, // FIXED: Now using total_score from API
                  accuracy: score.accuracy * 100,
                  max_combo: score.max_combo,
                  mods: score.mods?.length > 0 ? score.mods.map(m => m.acronym).join('') : 'None',
                  rank_position: score.position || 999,
                  submitted_at: score.created_at
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

    res.status(200).json({ 
      success: true, 
      challenge,
      message: 'Challenge data updated successfully' 
    });

  } catch (error) {
    console.error('Update challenge error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}