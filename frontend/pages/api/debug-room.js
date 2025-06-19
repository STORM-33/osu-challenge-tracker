// pages/api/debug-room.js
// Temporary endpoint to debug the osu! API response structure

import { getOsuClient } from '../../lib/osu-api';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomId } = req.query;

  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  try {
    const osuClient = getOsuClient();
    const roomInfo = await osuClient.getRoomInfo(roomId);

    // Return the raw response so we can see the structure
    res.status(200).json({
      success: true,
      roomId,
      rawResponse: roomInfo,
      playlistCount: roomInfo.playlist?.length || 0,
      firstPlaylist: roomInfo.playlist?.[0] || null,
      playlistStructure: roomInfo.playlist?.[0] ? Object.keys(roomInfo.playlist[0]) : []
    });

  } catch (error) {
    console.error('Debug API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch room data',
      details: error.message
    });
  }
}