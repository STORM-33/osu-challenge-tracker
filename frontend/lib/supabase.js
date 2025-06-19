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
  console.log('admin loaded')
}

// Helper functions for common queries
export const challengeQueries = {
  // Get all active challenges with season information
  getActiveChallenges: async () => {
    const { data, error } = await supabase
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

  // Get featured challenges for main page
  getFeaturedChallenges: async () => {
    const { data, error } = await supabase
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
          beatmap_title,
          beatmap_artist,
          beatmap_version
        )
      `)
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) throw error;
    return data;
  },

  // Get challenges by season
  getChallengesBySeason: async (seasonId) => {
    const { data, error } = await supabase
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
          beatmap_title,
          beatmap_artist,
          beatmap_version
        )
      `)
      .eq('season_id', seasonId)
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
        seasons (
          id,
          name,
          start_date,
          end_date,
          is_current
        ),
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
            custom_name,
            room_id,
            seasons (
              name
            )
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

// Season helper functions
export const seasonQueries = {
  // Get current season
  getCurrentSeason: async () => {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('is_current', true)
      .single();

    if (error) throw error;
    return data;
  },

  // Get all seasons
  getAllSeasons: async () => {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Create new season
  createSeason: async (seasonData) => {
    // Only admin can create seasons (this should be called server-side)
    const { data, error } = await supabase
      .from('seasons')
      .insert(seasonData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// Auth helper functions
export const auth = {
  getCurrentUser: async () => {
    console.log('🔍 auth.getCurrentUser() called');
    
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        console.log('❌ Server-side environment, no user');
        return null;
      }

      // Call our auth status API (which can read HttpOnly cookies)
      console.log('📡 Calling auth status API...');
      const response = await fetch('/api/auth/status', {
        method: 'GET',
        credentials: 'include' // Important: include cookies in request
      });

      if (!response.ok) {
        console.error('❌ Auth status API failed:', response.status);
        return null;
      }

      const data = await response.json();
      console.log('📡 Auth status response:', data);

      if (!data.authenticated || !data.user) {
        console.log('❌ User not authenticated');
        return null;
      }

      console.log('✅ User authenticated successfully:', data.user.username, 'Admin:', data.user.admin);
      return data.user;

    } catch (error) {
      console.error('🚨 Error in getCurrentUser:', error);
      return null;
    }
  },

  // Check if user is admin
  isAdmin: async () => {
    const user = await auth.getCurrentUser();
    return user?.admin || false;
  },

  // Sign out
  signOut: async () => {
    console.log('🚪 Signing out...');
    
    try {
      // Call logout API which will clear the HttpOnly cookie
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        console.warn('⚠️ Logout API failed, clearing manually');
      }
      
      console.log('✅ Signed out successfully');
    } catch (error) {
      console.error('🚨 Signout error:', error);
      throw error;
    }
  }
};