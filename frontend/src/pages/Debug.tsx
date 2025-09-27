import React, { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabaseClient';

const Debug: React.FC = () => {
  const [token, setToken] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const supabase = getSupabase();
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          return;
        }

        if (session) {
          setToken(session.access_token);
          setUser(session.user);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Debug Token</h1>

      {user ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">User Info:</h2>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Access Token:</h2>
            <div className="bg-gray-100 p-3 rounded">
              <code className="text-sm break-all">{token}</code>
              <button
                onClick={() => copyToClipboard(token)}
                className="ml-2 px-2 py-1 bg-blue-500 text-white rounded text-xs"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <p>No user session found. Please sign in first.</p>
        </div>
      )}
    </div>
  );
};

export default Debug;