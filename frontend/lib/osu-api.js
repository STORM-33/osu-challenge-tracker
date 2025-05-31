// osu! API client for Next.js server-side
import { supabase } from './supabase';

class OsuAPIClient {
  constructor() {
    this.clientId = process.env.OSU_CLIENT_ID;
    this.clientSecret = process.env.OSU_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.baseUrl = 'https://osu.ppy.sh/api/v2';
  }

  async authenticate() {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return true;
    }

    try {
      const response = await fetch('https://osu.ppy.sh/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials',
          scope: 'public'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to authenticate with osu! API');
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      // Token expires in data.expires_in seconds, but we'll refresh 5 minutes early
      this.tokenExpiry = new Date(Date.now() + (data.expires_in - 300) * 1000);
      
      return true;
    } catch (error) {
      console.error('osu! API authentication error:', error);
      return false;
    }
  }

  async makeRequest(endpoint, params = {}) {
    // Ensure we're authenticated
    const authenticated = await this.authenticate();
    if (!authenticated) {
      throw new Error('Failed to authenticate with osu! API');
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      });

      if (!response.ok) {
        throw new Error(`osu! API request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('osu! API request error:', error);
      throw error;
    }
  }

  async getRoomInfo(roomId) {
    return this.makeRequest(`/rooms/${roomId}`);
  }

  async getPlaylistScores(roomId, playlistId, params = {}) {
    return this.makeRequest(`/rooms/${roomId}/playlist/${playlistId}/scores`, {
      limit: params.limit || 50,
      sort: params.sort || 'score_desc',
      ...params
    });
  }

  async getAllPlaylistScores(roomId, playlistId) {
    const allScores = [];
    let cursor = null;
    let hasMore = true;

    while (hasMore) {
      const params = { limit: 50 };
      if (cursor) {
        params.cursor_string = cursor;
      }

      try {
        const data = await this.getPlaylistScores(roomId, playlistId, params);
        
        if (!data || !data.scores || data.scores.length === 0) {
          hasMore = false;
          break;
        }

        allScores.push(...data.scores);
        cursor = data.cursor_string;
        
        if (!cursor) {
          hasMore = false;
        }

        // Small delay to be nice to the API
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Error fetching scores:', error);
        hasMore = false;
      }
    }

    return allScores;
  }
}

// Singleton instance for reuse across requests
let clientInstance = null;

export function getOsuClient() {
  if (!clientInstance) {
    clientInstance = new OsuAPIClient();
  }
  return clientInstance;
}

// Cache management
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

export async function getCachedOrFetch(cacheKey, fetchFunction) {
  // Check database cache first
  const { data: cached, error } = await supabase
    .from('cache')
    .select('*')
    .eq('key', cacheKey)
    .single();

  if (!error && cached && cached.data) {
    const cacheAge = Date.now() - new Date(cached.updated_at).getTime();
    if (cacheAge < CACHE_DURATION) {
      console.log(`Cache hit for ${cacheKey}`);
      return JSON.parse(cached.data);
    }
  }

  // Cache miss or expired, fetch fresh data
  console.log(`Cache miss for ${cacheKey}, fetching fresh data`);
  try {
    const freshData = await fetchFunction();
    
    // Store in cache
    await supabase
      .from('cache')
      .upsert({
        key: cacheKey,
        data: JSON.stringify(freshData),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      });

    return freshData;
  } catch (error) {
    // If fetch fails but we have stale cache, return it
    if (cached && cached.data) {
      console.log('Fetch failed, returning stale cache');
      return JSON.parse(cached.data);
    }
    throw error;
  }
}