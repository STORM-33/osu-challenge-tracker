import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import PartnerCard from '../components/PartnerCard';
import Loading from '../components/Loading';
import { Users, Heart, Sparkles, AlertCircle } from 'lucide-react';

export default function Partners() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/partners');
      
      if (!response.ok) {
        throw new Error('Failed to fetch partners');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Handle the response structure properly - look for partners array
        const partnersData = data.data?.partners || data.partners || data.data || [];
        // Ensure it's always an array
        setPartners(Array.isArray(partnersData) ? partnersData : []);
      } else {
        throw new Error(data.error || 'Failed to load partners');
      }
    } catch (err) {
      console.error('Error fetching partners:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Loading.FullPage message="Loading partners..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="mb-12 text-center relative">
            {/* Decorative elements */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-96 h-96 bg-gradient-to-br from-purple-100/20 to-pink-100/20 rounded-full blur-3xl"></div>
            </div>
            
            <div className="relative">
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="relative">
                  <Users className="w-10 h-10 text-primary-600" />
                  <Heart className="w-5 h-5 text-red-500 absolute -top-1 -right-1 animate-pulse" />
                </div>
                <h1 className="text-4xl font-bold text-neutral-800">
                  Our Partners
                </h1>
              </div>
              
              {/* Decorative line elements */}
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="h-px bg-gradient-to-r from-transparent via-purple-300 to-transparent w-32"></div>
                <Sparkles className="w-5 h-5 text-purple-400" />
                <div className="h-px bg-gradient-to-l from-transparent via-purple-300 to-transparent w-32"></div>
              </div>
            </div>
          </div>

          {/* Partners Grid */}
          {error ? (
            <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-3xl p-12 text-center border border-red-200 max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-red-700 mb-6 font-medium">{error}</p>
              <button 
                onClick={fetchPartners}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-full transition-all hover:shadow-lg transform hover:scale-105"
              >
                Try Again
              </button>
            </div>
          ) : partners.length === 0 ? (
            <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-3xl p-16 text-center border border-neutral-200 max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-neutral-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-neutral-400" />
              </div>
              <h3 className="text-xl font-bold text-neutral-700 mb-3">No Partners Yet</h3>
              <p className="text-neutral-600">
                Partner announcements coming soon!
              </p>
            </div>
          ) : (
            <>
              {/* Partners container with glass frame */}
              <div className="relative">
                {/* Background decoration */}
                <div className="absolute -inset-4 bg-gradient-to-br from-purple-100/50 via-transparent to-pink-100/50 rounded-3xl blur-2xl"></div>
                
                {/* Main container */}
                <div className="relative glass-card-enhanced rounded-3xl p-8 border border-purple-200/50 bg-gradient-to-br from-white/80 to-purple-50/30">
                  {/* Inner decorative border */}
                  <div className="absolute inset-4 rounded-2xl border border-purple-100 pointer-events-none"></div>
                  
                  {/* Corner decorations */}
                  <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-purple-300 rounded-tl-xl"></div>
                  <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-purple-300 rounded-tr-xl"></div>
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-purple-300 rounded-bl-xl"></div>
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-purple-300 rounded-br-xl"></div>
                  
                  {/* Discord-style icon grid */}
                  <div className="relative grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {partners.map((partner) => (
                      <PartnerCard 
                        key={partner.id} 
                        partner={partner}
                        size="medium"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}