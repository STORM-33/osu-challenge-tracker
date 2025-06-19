import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import ChallengeCard from '../components/ChallengeCard';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null);

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/challenges?active=true');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data); // Debug log
        
        setChallenges(data.challenges || []);
        
        // Set background image from the most recent challenge
        if (data.challenges && data.challenges.length > 0) {
          const latestChallenge = data.challenges[0];
          if (latestChallenge.background_image_url) {
            setBackgroundImage(latestChallenge.background_image_url);
          }
        }
        
        setError(null);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
  }, []);

  return (
    <Layout backgroundImage={backgroundImage}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-3 text-neutral-800">
            Active Challenges
          </h1>
          <p className="text-neutral-600 text-lg">
            Compete in our community challenges and climb the leaderboards!
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : error ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <p className="text-red-600 mb-4">Failed to load challenges: {error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Retry
            </button>
          </div>
        ) : challenges?.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <p className="text-neutral-600 mb-6 text-lg">No active challenges at the moment</p>
            <Link 
              href="/admin"
              className="btn-secondary inline-flex items-center gap-2"
            >
              add first challenge
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {challenges?.map(challenge => (
              <Link key={challenge.id} href={`/challenges/${challenge.room_id}`}>
                <ChallengeCard challenge={challenge} />
              </Link>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-sm text-neutral-500">
            Data updates automatically when you visit
          </p>
        </div>
      </div>
    </Layout>
  );
}