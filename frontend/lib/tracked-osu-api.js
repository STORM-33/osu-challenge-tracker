// frontend/lib/tracked-osu-api.js
// Wrapper for osu! API calls with Vercel usage tracking

import { trackedFetch } from './api-tracker';

class TrackedOsuAPI {
  constructor() {
    this.baseURL = 'https://osu.ppy.sh/api/v2';
    this.token = null;
  }

  // Get OAuth token (tracked)
  async getToken() {
    if (this.token && this.token.expires > Date.now()) {
      return this.token.access_token;
    }

    const response = await trackedFetch('https://osu.ppy.sh/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.OSU_CLIENT_ID,
        client_secret: process.env.OSU_CLIENT_SECRET,
        grant_type: 'client_credentials',
        scope: 'public'
      })
    }, 'osu-auth');

    if (!response.ok) {
      throw new Error(`Failed to get osu! token: ${response.status}`);
    }

    const tokenData = await response.json();
    this.token = {
      access_token: tokenData.access_token,
      expires: Date.now() + (tokenData.expires_in * 1000) - 60000 // 1 min buffer
    };

    return this.token.access_token;
  }

  // Get user data (tracked)
  async getUser(userId) {
    const token = await this.getToken();
    
    const response = await trackedFetch(`${this.baseURL}/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, 'osu-api');

    if (!response.ok) {
      throw new Error(`Failed to get user ${userId}: ${response.status}`);
    }

    return response.json();
  }

  // Get multiplayer room (tracked)
  async getRoom(roomId) {
    const token = await this.getToken();
    
    const response = await trackedFetch(`${this.baseURL}/rooms/${roomId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, 'osu-api');

    if (!response.ok) {
      throw new Error(`Failed to get room ${roomId}: ${response.status}`);
    }

    return response.json();
  }

  // Get room scores (tracked)
  async getRoomScores(roomId, playlistId, limit = 50) {
    const token = await this.getToken();
    
    const url = `${this.baseURL}/rooms/${roomId}/playlist/${playlistId}/scores?limit=${limit}&sort=score_desc`;
    
    const response = await trackedFetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, 'osu-api');

    if (!response.ok) {
      throw new Error(`Failed to get scores for room ${roomId}, playlist ${playlistId}: ${response.status}`);
    }

    return response.json();
  }

  // Get beatmap data (tracked)
  async getBeatmap(beatmapId) {
    const token = await this.getToken();
    
    const response = await trackedFetch(`${this.baseURL}/beatmaps/${beatmapId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, 'osu-api');

    if (!response.ok) {
      throw new Error(`Failed to get beatmap ${beatmapId}: ${response.status}`);
    }

    return response.json();
  }

  // Batch get users (tracked - but counts as multiple calls)
  async getUsers(userIds) {
    const users = [];
    
    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const batchPromises = batch.map(id => this.getUser(id).catch(err => {
        console.warn(`Failed to get user ${id}:`, err.message);
        return null;
      }));
      
      const batchResults = await Promise.all(batchPromises);
      users.push(...batchResults.filter(user => user !== null));
      
      // Small delay between batches
      if (i + batchSize < userIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return users;
  }
}

// Export singleton instance
export const trackedOsuAPI = new TrackedOsuAPI();