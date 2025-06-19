import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Plus, Loader2, CheckCircle, AlertCircle, Edit3, Settings } from 'lucide-react';
import { auth } from '../lib/supabase';
import { useRouter } from 'next/router';

export default function Admin() {
  const [roomId, setRoomId] = useState('');
  const [customName, setCustomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const userData = await auth.getCurrentUser();
      if (!userData) {
        router.push('/');
        return;
      }
      
      if (!userData.admin) {
        router.push('/');
        return;
      }
      
      setUser(userData);
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/');
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!roomId.trim()) {
      setResult({ success: false, message: 'Please enter a room ID' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomId: parseInt(roomId),
          custom_name: customName.trim() || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: `Successfully added challenge: ${data.challenge.custom_name || data.challenge.name}`,
          challenge: data.challenge
        });
        setRoomId('');
        setCustomName('');
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

  if (checkingAuth) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-neutral-800">Admin Panel</h1>
          </div>
          <p className="text-neutral-600">
            Welcome, {user?.username}! Manage challenges and seasons from here.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Add Challenge Section */}
          <div className="glass-card rounded-xl p-6 border border-primary-200">
            <div className="flex items-center gap-2 mb-6">
              <Plus className="w-6 h-6 text-primary-600" />
              <h2 className="text-xl font-semibold text-neutral-800">Add New Challenge</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="roomId" className="block text-sm font-medium mb-2 text-neutral-700">
                  osu! Multiplayer Room ID *
                </label>
                <input
                  type="text"
                  id="roomId"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="e.g., 1392361"
                  className="w-full px-4 py-3 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                  disabled={loading}
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Find the room ID in the URL: osu.ppy.sh/multiplayer/rooms/<strong>1392361</strong>
                </p>
              </div>

              <div>
                <label htmlFor="customName" className="block text-sm font-medium mb-2 text-neutral-700">
                  Custom Display Name
                </label>
                <input
                  type="text"
                  id="customName"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Override the default room name (optional)"
                  className="w-full px-4 py-3 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                  disabled={loading}
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Leave empty to use the original room name from osu!
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !roomId.trim()}
                className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-neutral-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-all font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Adding Challenge...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Add Challenge
                  </>
                )}
              </button>
            </form>

            {result && (
              <div className={`mt-6 p-4 rounded-lg flex items-start gap-3 ${
                result.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={result.success ? 'text-green-800' : 'text-red-800'}>
                    {result.message}
                  </p>
                  {result.challenge && (
                    <div className="mt-2 text-sm text-neutral-600">
                      <p>Room ID: {result.challenge.room_id}</p>
                      <p>Host: {result.challenge.host}</p>
                      {result.challenge.custom_name && (
                        <p>Custom Name: {result.challenge.custom_name}</p>
                      )}
                      <p className="text-green-600 font-medium">✅ Active Challenge</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions Section */}
          <div className="space-y-6">
            
            {/* Example Rooms */}
            <div className="glass-card rounded-xl p-6 border border-neutral-200">
              <h3 className="text-lg font-semibold mb-4 text-neutral-800">Example Rooms</h3>
              <p className="text-sm text-neutral-600 mb-4">
                Click on any room ID to try it:
              </p>
              <div className="space-y-2">
                {[
                  { id: '1392361', name: 'osu!Challengers CE' },
                  { id: '1392360', name: 'Weekly Challenge' },
                  { id: '1392359', name: 'Monthly Tournament' }
                ].map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setRoomId(room.id)}
                    className="w-full text-left p-3 bg-neutral-50 hover:bg-neutral-100 rounded-lg transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-primary-600 font-mono font-medium">{room.id}</span>
                      <span className="text-sm text-neutral-600">{room.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="glass-card rounded-xl p-6 border border-neutral-200">
              <h3 className="text-lg font-semibold mb-4 text-neutral-800">Quick Admin Actions</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center gap-3 p-3 text-left bg-neutral-50 hover:bg-neutral-100 rounded-lg transition-colors">
                  <Edit3 className="w-5 h-5 text-neutral-600" />
                  <div>
                    <p className="font-medium text-neutral-800">Manage Challenges</p>
                    <p className="text-sm text-neutral-600">Edit existing challenges</p>
                  </div>
                </button>
                
                <button className="w-full flex items-center gap-3 p-3 text-left bg-neutral-50 hover:bg-neutral-100 rounded-lg transition-colors">
                  <Settings className="w-5 h-5 text-neutral-600" />
                  <div>
                    <p className="font-medium text-neutral-800">Season Management</p>
                    <p className="text-sm text-neutral-600">Create and manage seasons</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="mt-8 p-4 bg-neutral-50 rounded-lg">
          <h4 className="font-medium text-neutral-800 mb-2">Important Notes:</h4>
          <ul className="text-sm text-neutral-600 space-y-1">
            <li>• Only public multiplayer rooms can be tracked</li>
            <li>• Data will update automatically every 2 minutes when users view the challenge</li>
            <li>• All challenges appear on the main page when active</li>
            <li>• Custom names will override the original room name for display</li>
            <li>• New challenges are automatically assigned to the current season (6-month cycles)</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}