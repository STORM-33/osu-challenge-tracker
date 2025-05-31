import { supabase } from '../../lib/supabase';
import { getOsuClient, getCachedOrFetch } from '../../lib/osu-api';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomId } = req.body;

  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  try {
    console.log(`Updating challenge ${roomId}`);
    
    // Get osu! API client
    const osuClient = getOsuClient();
    
    // Fetch room info with caching
    const roomInfo = await getCachedOrFetch(
      `room-${roomId}`,
      () => osuClient.getRoomInfo(roomId)
    );

    if (!roomInfo) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Update challenge in database
    const challengeData = {
      room_id: roomId,
      name: roomInfo.name || 'Unknown',
      host: roomInfo.host?.username || 'Unknown',
      room_type: roomInfo.type || 'Unknown',
      participant_count: roomInfo.participant_count || 0,
      is_active: roomInfo.active !== false,
      start_date: roomInfo.starts_at || null,
      end_date: roomInfo.ends_at || null,
      updated_at: new Date().toISOString()
    };

    const { data: challenge, error: challengeError } = await supabase
      .table('challenges')
      .upsert(challengeData, { onConflict: 'room_id' })
      .select()
      .single();

    if (challengeError) {
      throw new Error(`Failed to update challenge: ${challengeError.message}`);
    }

    // Process playlists
    const playlists = roomInfo.playlist || [];
    const updatedPlaylists = [];

    for (const playlist of playlists) {
      const playlistData = {
        playlist_id: playlist.id,
        challenge_id: challenge.id,
        beatmap_id: playlist.beatmap?.id || null,
        beatmap_title: playlist.beatmap?.title || 'Unknown',
        beatmap_artist: playlist.beatmap?.artist || 'Unknown',
        beatmap_version: playlist.beatmap?.version || 'Unknown',
        beatmap_difficulty: playlist.beatmap?.difficulty_rating || 0
      };

      const { data: dbPlaylist, error: playlistError } = await supabase
        .table('playlists')
        .upsert(playlistData, { onConflict: 'playlist_id' })
        .select()
        .single();

      if (playlistError) {
        console.error('Error updating playlist:', playlistError);
        continue;
      }

      // Fetch scores for this playlist with caching
      const scores = await getCachedOrFetch(
        `scores-${roomId}-${playlist.id}`,
        () => osuClient.getAllPlaylistScores(roomId, playlist.id)
      );

      // Update scores
      let updatedScoreCount = 0;
      for (let rank = 0; rank < scores.length; rank++) {
        const score = scores[rank];
        const userData = score.user;
        
        if (!userData?.id) continue;

        // Upsert user
        const { data: dbUser } = await supabase
          .table('users')
          .upsert({
            osu_id: userData.id,
            username: userData.username || 'Unknown',
            avatar_url: userData.avatar_url || null,
            country: userData.country_code || null,
            updated_at: new Date().toISOString()
          }, { onConflict: 'osu_id' })
          .select()
          .single();

        if (!dbUser) continue;

        // Upsert score
        const { error: scoreError } = await supabase
          .table('scores')
          .upsert({
            playlist_id: dbPlaylist.id,
            user_id: dbUser.id,
            score: score.total_score || 0,
            accuracy: (score.accuracy || 0) * 100,
            max_combo: score.max_combo || 0,
            mods: score.mods?.join(',') || '',
            rank_position: rank + 1,
            submitted_at: score.ended_at || new Date().toISOString()
          }, { onConflict: 'playlist_id,user_id' });

        if (!scoreError) {
          updatedScoreCount++;
        }
      }

      updatedPlaylists.push({
        ...dbPlaylist,
        updated_scores: updatedScoreCount
      });
    }

    // Update user challenge participation
    const { data: participants } = await supabase
      .from('scores')
      .select('user_id')
      .in('playlist_id', updatedPlaylists.map(p => p.id))
      .limit(1000);

    if (participants) {
      const uniqueUserIds = [...new Set(participants.map(p => p.user_id))];
      for (const userId of uniqueUserIds) {
        await supabase
          .table('user_challenges')
          .upsert({
            user_id: userId,
            challenge_id: challenge.id,
            last_updated: new Date().toISOString()
          }, { onConflict: 'user_id,challenge_id' });
      }
    }

    res.status(200).json({
      success: true,
      challenge: {
        ...challenge,
        playlists: updatedPlaylists.length,
        last_update: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Update challenge error:', error);
    res.status(500).json({ 
      error: 'Failed to update challenge',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}