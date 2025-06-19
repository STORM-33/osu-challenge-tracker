import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthDebug() {
  const [debugInfo, setDebugInfo] = useState('Loading...');
  const [cookies, setCookies] = useState('');
  const [userFromDB, setUserFromDB] = useState(null);

  useEffect(() => {
    testAuth();
  }, []);

  const testAuth = async () => {
    try {
      // Step 1: Check cookies
      const allCookies = document.cookie;
      setCookies(allCookies);
      console.log('🍪 All cookies:', allCookies);

      // Step 2: Find session cookie
      const cookies = document.cookie.split('; ');
      const sessionCookie = cookies.find(c => c.startsWith('osu_session='));
      
      if (!sessionCookie) {
        setDebugInfo('❌ No osu_session cookie found');
        return;
      }

      const userId = sessionCookie.split('=')[1];
      console.log('🆔 User ID from cookie:', userId);
      setDebugInfo(`🆔 User ID: ${userId}`);

      // Step 3: Try to fetch user from database
      console.log('🗃️ Fetching user from database...');
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', parseInt(userId))
        .single();

      console.log('👤 User from DB:', user);
      console.log('❌ DB Error:', error);

      if (error) {
        setDebugInfo(`❌ DB Error: ${error.message}`);
        return;
      }

      if (user) {
        setUserFromDB(user);
        setDebugInfo(`✅ Found user: ${user.username} (Admin: ${user.admin})`);
      } else {
        setDebugInfo('❌ User not found in database');
      }

    } catch (error) {
      console.error('🚨 Test error:', error);
      setDebugInfo(`🚨 Error: ${error.message}`);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg max-w-sm text-xs z-50">
      <h3 className="font-bold mb-2">Auth Debug</h3>
      <div className="space-y-1">
        <div><strong>Status:</strong> {debugInfo}</div>
        <div><strong>Cookies:</strong> {cookies || 'None'}</div>
        {userFromDB && (
          <div className="mt-2 p-2 bg-green-900 rounded">
            <strong>User Found:</strong><br />
            ID: {userFromDB.id}<br />
            Username: {userFromDB.username}<br />
            Admin: {userFromDB.admin ? 'Yes' : 'No'}
          </div>
        )}
        <button 
          onClick={testAuth}
          className="mt-2 px-2 py-1 bg-blue-600 rounded hover:bg-blue-700"
        >
          Test Again
        </button>
      </div>
    </div>
  );
}