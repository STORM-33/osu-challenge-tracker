import { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import Layout from '../components/Layout';
import ChallengeCard from '../components/ChallengeCard';
import { challengeQueries } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

const fetcher = () => challengeQueries.getActiveChallenges();

export default function Home() {
  const { data: challenges, error, isLoading } = useSWR('challenges', fetcher, {
    refreshInterval: 60000, // Refresh every minute
    revalidateOnFocus: false,
  });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Active Challenges
          </h1>
          <p className="text-gray-400 text-lg">
            Compete in community challenges and climb the leaderboards!
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">Failed to load challenges</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        ) : challenges?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No active challenges at the moment</p>
            <Link href="/admin">
              <a className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors inline-block">
                Add First Challenge
              </a>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {challenges?.map(challenge => (
              <Link key={challenge.id} href={`/challenges/${challenge.room_id}`}>
                <a>
                  <ChallengeCard challenge={challenge} />
                </a>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Data updates automatically when you visit
          </p>
        </div>
      </div>
    </Layout>
  );
}