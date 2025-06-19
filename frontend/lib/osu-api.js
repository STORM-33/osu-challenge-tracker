// osu! API client for Next.js server-side
import { supabase } from './supabase';

class OsuAPIClient {
  constructor() {
    this.clientId = process.env.OSU_CLIENT_ID;
    this.clientSecret = process.env.OSU_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.baseUrl = 'https://osu.ppy.sh/api/v2';
    
    // Validate environment variables
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Missing osu! API credentials. Please set OSU_CLIENT_ID and OSU_CLIENT_SECRET environment variables.');
    }
  }

  async authenticate() {
    // Check if we have a valid token (with 5 minute buffer)
    if (this.accessToken && this.tokenExpiry && new Date() < new Date(this.tokenExpiry.getTime() - 5 * 60 * 1000)) {
      return true;
    }

    console.log('Authenticating with osu! API...');
    
    try {
      const response = await fetch('https://osu.ppy.sh/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: parseInt(this.clientId), // Ensure it's a number
          client_secret: this.clientSecret,
          grant_type: 'client_credentials',
          scope: 'public'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('osu! API auth response:', response.status, errorText);
        throw new Error(`Failed to authenticate with osu! API: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);
      
      console.log('osu! API authentication successful');
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
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    console.log(`Making osu! API request: ${url.pathname}${url.search}`);

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`osu! API request failed: ${response.status} - ${errorText}`);
        
        // If unauthorized, try to re-authenticate once
        if (response.status === 401) {
          console.log('Token might be expired, re-authenticating...');
          this.accessToken = null;
          this.tokenExpiry = null;
          
          const reauth = await this.authenticate();
          if (reauth) {
            // Retry the request with new token
            const retryResponse = await fetch(url.toString(), {
              headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
            });
            
            if (retryResponse.ok) {
              return await retryResponse.json();
            }
          }
        }
        
        throw new Error(`osu! API request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`osu! API request successful: ${endpoint}`);
      return data;
    } catch (error) {
      console.error('osu! API request error:', error);
      throw error;
    }
  }

  async getRoomInfo(roomId) {
    if (!roomId) {
      throw new Error('Room ID is required');
    }
    return this.makeRequest(`/rooms/${roomId}`);
  }

  async getPlaylistScores(roomId, playlistId, params = {}) {
    if (!roomId || !playlistId) {
      throw new Error('Room ID and Playlist ID are required');
    }
    
    return this.makeRequest(`/rooms/${roomId}/playlist/${playlistId}/scores`, {
      limit: params.limit || 50,
      sort: params.sort || 'score_desc',
      ...params
    });
  }

  async getAllPlaylistScores(roomId, playlistId, maxScores = 1000) {
    const allScores = [];
    let cursor = null;
    let hasMore = true;
    let requestCount = 0;
    const maxRequests = Math.ceil(maxScores / 50); // Prevent infinite loops

    console.log(`Fetching all scores for room ${roomId}, playlist ${playlistId}`);

    while (hasMore && requestCount < maxRequests) {
      const params = { limit: 50 };
      if (cursor) {
        params.cursor_string = cursor;
      }

      try {
        const data = await this.getPlaylistScores(roomId, playlistId, params);
        
        if (!data || !data.scores || data.scores.length === 0) {
          console.log('No more scores found');
          hasMore = false;
          break;
        }

        allScores.push(...data.scores);
        cursor = data.cursor_string;
        requestCount++;
        
        console.log(`Fetched ${data.scores.length} scores (total: ${allScores.length})`);
        
        if (!cursor || allScores.length >= maxScores) {
          hasMore = false;
        }

        // Rate limiting - be nice to the API
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error('Error fetching scores batch:', error);
        hasMore = false;
        
        // If we have some scores, return them instead of failing completely
        if (allScores.length > 0) {
          console.log(`Returning ${allScores.length} scores despite error`);
          break;
        }
        throw error;
      }
    }

    console.log(`Finished fetching scores: ${allScores.length} total`);
    return allScores;
  }

  async getUser(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    return this.makeRequest(`/users/${userId}`);
  }

  async getBeatmap(beatmapId) {
    if (!beatmapId) {
      throw new Error('Beatmap ID is required');
    }
    return this.makeRequest(`/beatmaps/${beatmapId}`);
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

// Enhanced cache management with better error handling
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
const STALE_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for stale data

export async function getCachedOrFetch(cacheKey, fetchFunction, options = {}) {
  const { maxAge = CACHE_DURATION, useStaleOnError = true } = options;
  
  try {
    // Check database cache first
    const { data: cached, error } = await supabase
      .from('cache')
      .select('*')
      .eq('key', cacheKey)
      .single();

    if (!error && cached && cached.data) {
      const cacheAge = Date.now() - new Date(cached.updated_at).getTime();
      
      if (cacheAge < maxAge) {
        console.log(`Cache hit for ${cacheKey} (age: ${Math.round(cacheAge/1000)}s)`);
        return JSON.parse(cached.data);
      }
      
      console.log(`Cache expired for ${cacheKey} (age: ${Math.round(cacheAge/1000)}s)`);
    }

    // Cache miss or expired, fetch fresh data
    console.log(`Fetching fresh data for ${cacheKey}`);
    
    try {
      const freshData = await fetchFunction();
      
      // Store in cache
      const { error: upsertError } = await supabase
        .from('cache')
        .upsert({
          key: cacheKey,
          data: JSON.stringify(freshData),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (upsertError) {
        console.error('Failed to update cache:', upsertError);
      } else {
        console.log(`Cache updated for ${cacheKey}`);
      }

      return freshData;
    } catch (fetchError) {
      console.error(`Fetch failed for ${cacheKey}:`, fetchError);
      
      // If fetch fails but we have stale cache and useStaleOnError is true, return it
      if (useStaleOnError && cached && cached.data) {
        const cacheAge = Date.now() - new Date(cached.updated_at).getTime();
        if (cacheAge < STALE_CACHE_DURATION) {
          console.log(`Returning stale cache for ${cacheKey} due to fetch error`);
          return JSON.parse(cached.data);
        }
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error(`Cache operation failed for ${cacheKey}:`, error);
    throw error;
  }
}