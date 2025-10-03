import { useState, useEffect, useRef, useCallback, memo } from 'react';
import Layout from '../components/Layout';
import PartnerCard from '../components/PartnerCard';
import TeamCard from '../components/TeamCard';
import ExpandedPartnerModal from '../components/ExpandedPartnerModal';
import ExpandedTeamModal from '../components/ExpandedTeamModal';
import Loading from '../components/Loading';
import { Users, Heart, Sparkles, AlertCircle, UserCheck } from 'lucide-react';

// Memoized error component
const ErrorDisplay = memo(function ErrorDisplay({ error, onRetry, title }) {
  return (
    <div className="glass-1 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto mb-8 sm:mb-12">
      <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-8 h-8 text-red-400" />
      </div>
      <p className="text-red-400 mb-6 font-medium text-shadow-adaptive-sm">{error}</p>
      <button 
        onClick={onRetry}
        className="bg-gradient-to-b from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold px-6 py-3 rounded-full transition-all hover:shadow-lg transform hover:scale-105"
      >
        Try Again
      </button>
    </div>
  );
});

// Memoized empty state component
const EmptyState = memo(function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="glass-1 rounded-2xl sm:rounded-3xl p-8 sm:p-16 text-center max-w-2xl mx-auto mb-8 sm:mb-12">
      <div className="w-20 h-20 glass-1 rounded-full flex items-center justify-center mx-auto mb-6">
        <Icon className="w-10 h-10 text-white/60" />
      </div>
      <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 text-shadow-adaptive">{title}</h3>
      <p className="text-white/80 text-sm sm:text-base text-shadow-adaptive-sm">
        {description}
      </p>
    </div>
  );
});

export default function Partners() {
  const [partners, setPartners] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamError, setTeamError] = useState(null);
  
  // Morphing animation state for partners
  const [expandedPartner, setExpandedPartner] = useState(null);
  const [partnerStartPosition, setPartnerStartPosition] = useState(null);
  const partnerCardRefs = useRef({});

  // Morphing animation state for team
  const [expandedTeamMember, setExpandedTeamMember] = useState(null);
  const [teamStartPosition, setTeamStartPosition] = useState(null);
  const teamCardRefs = useRef({});

  useEffect(() => {
    // Start both fetches in parallel
    const fetchData = async () => {
      await Promise.allSettled([fetchPartners(), fetchTeam()]);
    };
    fetchData();
  }, []);

  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/partners');
      
      if (!response.ok) {
        throw new Error('Failed to fetch partners');
      }
      
      const data = await response.json();
      
      if (data.success) {
        const partnersData = data.data?.partners || data.partners || data.data || [];
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
  }, []);

  const fetchTeam = useCallback(async () => {
    try {
      setTeamLoading(true);
      setTeamError(null);
      const response = await fetch('/api/team');
      
      if (!response.ok) {
        throw new Error('Failed to fetch team');
      }
      
      const data = await response.json();
      
      if (data.success) {
        const teamData = data.data?.team || data.team || data.data || [];
        setTeam(Array.isArray(teamData) ? teamData : []);
      } else {
        throw new Error(data.error || 'Failed to load team');
      }
    } catch (err) {
      console.error('Error fetching team:', err);
      setTeamError(err.message);
    } finally {
      setTeamLoading(false);
    }
  }, []);

  const handleExpandPartner = useCallback((partner) => {
    const cardElement = partnerCardRefs.current[partner.id];
    if (cardElement) {
      const rect = cardElement.getBoundingClientRect();
      setPartnerStartPosition({
        x: rect.left + rect.width / 2 - 300,
        y: rect.top + rect.height / 2 - 250,
      });
    }
    setExpandedPartner(partner);
  }, []);

  const handleClosePartnerModal = useCallback(() => {
    setExpandedPartner(null);
    setPartnerStartPosition(null);
  }, []);

  const handleExpandTeamMember = useCallback((member) => {
    const cardElement = teamCardRefs.current[member.id];
    if (cardElement) {
      const rect = cardElement.getBoundingClientRect();
      setTeamStartPosition({
        x: rect.left + rect.width / 2 - 300,
        y: rect.top + rect.height / 2 - 250,
      });
    }
    setExpandedTeamMember(member);
  }, []);

  const handleCloseTeamModal = useCallback(() => {
    setExpandedTeamMember(null);
    setTeamStartPosition(null);
  }, []);

  if (loading && teamLoading) {
    return (
      <Layout>
        <Loading.FullPage message="Loading partners and team..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen py-4 sm:py-6 lg:py-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          {/* Header */}
          <div className="mb-8 sm:mb-10 lg:mb-12">
            <div className="text-center">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="relative">
                  <Users className="w-8 h-8 sm:w-10 sm:h-10 text-white icon-shadow-adaptive-lg" />
                  <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 absolute -top-1 -right-1 animate-pulse" />
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white text-shadow-adaptive-lg">
                  Our Partners
                </h1>
              </div>
              
              {/* Description */}
              <p className="text-white/85 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto text-shadow-adaptive px-4 sm:px-0 leading-relaxed">
                Meet the incredible creators and communities that make osu!Challengers possible! 
              </p>
            </div>
          </div>

          {/* Partners Grid */}
          {error ? (
            <ErrorDisplay error={error} onRetry={fetchPartners} />
          ) : partners.length === 0 ? (
            <EmptyState 
              icon={Users} 
              title="No Partners Yet" 
              description="Check out these awesome creators and communities that are part of the osu!Challengers family. Click on any partner to learn more about them!" 
            />
          ) : (
            <div className="relative mb-8 sm:mb-12">
              {/* Background decoration */}
              <div className="absolute -inset-4 bg-gradient-to-br from-purple-100/50 via-transparent to-pink-100/50 rounded-3xl blur-2xl"></div>
              
              {/* Main container */}
              <div className="relative glass-1 rounded-2xl sm:rounded-3xl p-6 sm:p-8">
                {/* Inner decorative border */}
                <div className="absolute inset-4 rounded-2xl border border-purple-100/30 pointer-events-none"></div>
                
                {/* Discord-style icon grid with morphing support */}
                <div className="relative grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                  {partners.map((partner) => (
                    <PartnerCard 
                      key={partner.id} 
                      partner={partner}
                      size="medium"
                      onClick={handleExpandPartner}
                      isExpanded={expandedPartner?.id === partner.id}
                      cardRef={(el) => partnerCardRefs.current[partner.id] = el}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Meet the Team Section */}
          <div className="mb-8 sm:mb-12">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="relative">
                <UserCheck className="w-8 h-8 sm:w-10 sm:h-10 text-white icon-shadow-adaptive-lg" />
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white text-shadow-adaptive-lg">
                Meet the Team
              </h2>
            </div>

            <div className="text-center mb-6 sm:mb-8">
              <p className="text-white/85 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto text-shadow-adaptive px-4 sm:px-0 leading-relaxed">
                The passionate individuals who make osu!Challengers possible. Click on any team member to learn more about them!
              </p>
            </div>

            {/* Team Grid */}
            {teamError ? (
              <ErrorDisplay error={teamError} onRetry={fetchTeam} />
            ) : team.length === 0 ? (
              <EmptyState 
                icon={UserCheck} 
                title="Team Information Coming Soon" 
                description="We're working on introducing you to the amazing people behind osu!Challengers." 
              />
            ) : (
              <div className="relative">
                {/* Background decoration */}
                <div className="absolute -inset-4 bg-gradient-to-br from-blue-100/50 via-transparent to-green-100/50 rounded-3xl blur-2xl"></div>
                
                {/* Main container */}
                <div className="relative glass-1 rounded-2xl sm:rounded-3xl p-6 sm:p-8">
                  {/* Inner decorative border */}
                  <div className="absolute inset-4 rounded-2xl border border-blue-100/30 pointer-events-none"></div>
                  
                  {/* Team grid - optimized for performance */}
                  <div className="relative grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                    {team.map((member) => (
                      <TeamCard 
                        key={`team-${member.id}`} 
                        member={member}
                        size="medium"
                        onClick={handleExpandTeamMember}
                        isExpanded={expandedTeamMember?.id === member.id}
                        cardRef={(el) => teamCardRefs.current[member.id] = el}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Partnership Invitation Footer */}
          <div className="mt-8 sm:mt-12 text-center">
            <div className="glass-1 rounded-xl sm:rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Heart className="w-6 h-6 text-red-400 animate-pulse" />
                <h3 className="text-xl sm:text-2xl font-bold text-white text-shadow-adaptive">
                  Interested in Partnering?
                </h3>
                <Heart className="w-6 h-6 text-red-400 animate-pulse" />
              </div>
              
              <p className="text-white/80 text-sm sm:text-base leading-relaxed text-shadow-adaptive-sm mb-6">
                We're always looking to collaborate with awesome creators, communities, and developers in the osu! space. 
                If you'd like to partner with us, we'd love to hear from you!
              </p>
              
              <div className="border-t border-white/20 pt-4">
                <p className="text-white/70 text-sm text-shadow-adaptive-sm mb-2">
                  Contact us at:
                </p>
                <p className="text-white font-mono text-lg font-semibold text-shadow-adaptive">
                  challengersnexus@gmail.com
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Modals */}
      <ExpandedPartnerModal
        partner={expandedPartner}
        isVisible={!!expandedPartner}
        onClose={handleClosePartnerModal}
        startPosition={partnerStartPosition}
      />

      <ExpandedTeamModal
        member={expandedTeamMember}
        isVisible={!!expandedTeamMember}
        onClose={handleCloseTeamModal}
        startPosition={teamStartPosition}
      />
    </Layout>
  );
}