import { supabase } from '../../../lib/supabase';
import { handleAPIResponse, handleAPIError, validateRequest } from '../../../lib/api-utils';
import { memoryCache, createCacheKey, CACHE_DURATIONS } from '../../../lib/memory-cache';
import { isStale } from '../../../lib/sync-config';

async function handler(req, res) {
  try {
    validateRequest(req, {
      method: 'GET',
      query: {
        roomId: { required: true, pattern: /^\d+$/ }
      }
    });

    const { roomId } = req.query;
    const roomIdNum = parseInt(roomId);

    // CREATE CACHE KEY
    const cacheKey = createCacheKey('challenge_detail', roomId);

    // TRY CACHE FIRST
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      console.log(`📋 Serving challenge ${roomId} from cache`);
      return handleAPIResponse(res, cached, {
        cache: true,
        cacheTime: 300,
        enableETag: true,
        req
      });
    }

    console.log(`📋 Fetching challenge ${roomId} from database`);

    // FETCH FROM DATABASE
    const { data: challenge, error } = await supabase
      .from('challenges')
      .select(`
        *,
        seasons (id, name, start_date, end_date, is_current),
        playlists (
          id, playlist_id, beatmap_id, beatmap_title, beatmap_artist,
          beatmap_version, beatmap_difficulty, beatmap_cover_url,
          beatmap_card_url, beatmap_list_url, beatmap_slimcover_url,
          scores (
            id, score, accuracy, max_combo, mods, mods_detailed, submitted_at,
            users (id, osu_id, username, avatar_url, country)
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

    // SORT SCORES
    if (challenge.playlists) {
      challenge.playlists = challenge.playlists.map(playlist => ({
        ...playlist,
        scores: playlist.scores 
          ? playlist.scores.sort((a, b) => b.score - a.score)
          : []
      }));
    }

    // GET RULESET WINNER
    let rulesetWinner = null;
    let rulesetInfo = null;

    if (challenge.has_ruleset) {
      rulesetInfo = {
        ruleset_name: challenge.ruleset_name,
        ruleset_description: challenge.ruleset_description,
        required_mods: challenge.required_mods || [],
        ruleset_match_type: challenge.ruleset_match_type
      };

      const { data: winnerData } = await supabase
        .from('challenge_ruleset_winners')
        .select(`
          score_id, won_at,
          scores (
            id, score, accuracy, max_combo, mods, mods_detailed,
            users (id, osu_id, username, avatar_url, country)
          )
        `)
        .eq('challenge_id', challenge.id)
        .single();

      if (winnerData) {
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

    // ADD DATA INFO
    const dataAgeMinutes = challenge.updated_at 
      ? Math.floor((Date.now() - new Date(challenge.updated_at).getTime()) / 60000)
      : null;

    const responseData = {
      challenge,
      ruleset_info: rulesetInfo,
      ruleset_winner: rulesetWinner,
      data_info: {
        last_updated: challenge.updated_at,
        data_age_minutes: dataAgeMinutes,
        is_fresh: !isStale(challenge.updated_at),
        next_update_in_minutes: Math.max(0, 5 - (dataAgeMinutes || 0))
      }
    };

    // CACHE THE RESULT
    const cacheDuration = challenge.is_active 
      ? CACHE_DURATIONS.CHALLENGE_DETAIL 
      : 3600000;
    
    memoryCache.set(cacheKey, responseData, cacheDuration);

    console.log(`📋 Challenge ${roomId} loaded (age: ${dataAgeMinutes}min)`);

    return handleAPIResponse(res, responseData, {
      cache: true,
      cacheTime: 300,
      enableETag: true,
      req
    });

  } catch (error) {
    console.error('Challenge detail API error:', error);
    return handleAPIError(res, error);
  }
}

export default handler;