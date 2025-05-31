import { useState } from 'react';
import Layout from '../components/Layout';
import { Plus, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function Admin() {
  const [roomId, setRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!roomId.trim()) {
      setResult({ success: false, message: 'Please enter a room ID' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/update-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: parseInt(roomId) })
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: `Successfully added challenge: ${data.challenge.name}`,
          challenge: data.challenge
        });
        setRoomId('');
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to add challenge'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const exampleRooms = [
    { id: '1392361', name: 'osu!Challengers CE' },
    { id: '1392360', name: 'Weekly Challenge' },
    { id: '1392359', name: 'Monthly Tournament' }
  ];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Add Challenge</h1>
        
        <div className="bg-black/30 rounded-xl p-6 border border-purple-500/30 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="roomId" className="block text-sm font-medium mb-2">
                osu! Multiplayer Room ID
              </label>
              <input
                type="text"
                id="roomId"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="e.g., 1392361"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Find the room ID in the URL: osu.ppy.sh/multiplayer/rooms/<strong>1392361</strong>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !roomId.trim()}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding Challenge...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Challenge
                </>
              )}
            </button>
          </form>

          {result && (
            <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
              result.success 
                ? 'bg-green-900/20 border border-green-500/30' 
                : 'bg-red-900/20 border border-red-500/30'
            }`}>
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={result.success ? 'text-green-400' : 'text-red-400'}>
                  {result.message}
                </p>
                {result.challenge && (
                  <div className="mt-2 text-sm text-gray-400">
                    <p>Room ID: {result.challenge.room_id}</p>
                    <p>Host: {result.challenge.host}</p>
                    <p>Maps: {result.challenge.playlists}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-black/30 rounded-xl p-6 border border-purple-500/30">
          <h2 className="text-xl font-semibold mb-4">Example Rooms</h2>
          <p className="text-sm text-gray-400 mb-4">
            Click on any room ID to try it:
          </p>
          <div className="space-y-2">
            {exampleRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setRoomId(room.id)}
                className="w-full text-left p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <div className="flex justify-between items-center">
                  <span className="text-purple-400 font-mono">{room.id}</span>
                  <span className="text-sm text-gray-500">{room.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p className="mb-2">
            <strong>Note:</strong> Only public multiplayer rooms can be tracked.
          </p>
          <p>
            Data will update automatically every 2 minutes when users view the challenge.
          </p>
        </div>
      </div>
    </Layout>
  );
}