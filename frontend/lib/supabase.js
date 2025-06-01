import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Import admin client for server-side operations
let supabaseAdmin = null;
if (typeof window === 'undefined') {
  // Only import on server side
  try {
    const { supabaseAdmin: admin } = require('./supabase-admin');
    supabaseAdmin = admin;
  } catch (error) {
    console.warn('Could not load admin client:', error.message);
  }
}

// Helper functions for common queries
export const challengeQueries = {
  // Get all active challenges
  getActiveChallenges: async () => {
    const { data, error } = await supabase
      .from('challenges')
      .select(`
        *,
        playlists (
          id,
          playlist_id,
          beatmap_title,
          beatmap_artist,
          beatmap_version
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get single challenge with all details
  getChallengeDetails: async (roomId) => {
    const { data, error } = await supabase
      .from('challenges')
      .select(`
        *,
        playlists (
          *,
          scores (
            *,
            users (
              username,
              avatar_url,
              country
            )
          )
        )
      `)
      .eq('room_id', roomId)
      .single();

    if (error) throw error;
    
    // Sort scores for each playlist
    if (data?.playlists) {
      data.playlists = data.playlists.map(playlist => ({
        ...playlist,
        scores: playlist.scores?.sort((a, b) => b.score - a.score) || []
      }));
    }
    
    return data;
  },

  // Get user scores
  getUserScores: async (userId) => {
    const { data, error } = await supabase
      .from('scores')
      .select(`
        *,
        playlists (
          *,
          challenges (
            name,
            room_id
          )
        )
      `)
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get user stats
  getUserStats: async (userId) => {
    const { data: scores, error: scoresError } = await supabase
      .from('scores')
      .select('accuracy, rank_position')
      .eq('user_id', userId);

    if (scoresError) throw scoresError;

    const { count: challengeCount, error: countError } = await supabase
      .from('user_challenges')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) throw countError;

    const avgAccuracy = scores.length > 0
      ? scores.reduce((acc, s) => acc + s.accuracy, 0) / scores.length
      : 0;

    const bestRank = scores.length > 0
      ? Math.min(...scores.map(s => s.rank_position))
      : null;

    return {
      totalChallenges: challengeCount || 0,
      avgAccuracy: avgAccuracy.toFixed(2),
      bestRank
    };
  }
};

// Auth helper functions
export const auth = {
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const osuId = user.user_metadata?.osu_id;

    if (!osuId) return null;
    
    console.log(user.user_metadata)

    // Use admin client for user upsert if available (server-side)
    const client = supabaseAdmin || supabase;

    const { data: userInDb, error: upsertError } = await client
      .from('users')
      .upsert({
        osu_id: osuId,
        username: user.user_metadata?.username || 'Unknown',
        avatar_url: user.user_metadata?.avatar_url || null,
        country: user.user_metadata?.country || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'osu_id' })
      .select()
      .single();

    if (upsertError) {
      console.error('Failed to upsert user into public.users', upsertError);
      return null;
    }

    return userInDb;
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
};