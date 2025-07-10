// frontend/components/SeasonSelector.js
import { useState, useEffect } from 'react';
import { ChevronDown, Calendar, Clock, X } from 'lucide-react';

export default function SeasonSelector({ onSeasonChange, currentSeasonId }) {
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSeasons();
  }, []);

  useEffect(() => {
    if (currentSeasonId && seasons.length > 0) {
      const season = seasons.find(s => s.id === currentSeasonId);
      setSelectedSeason(season || seasons[0]);
    } else if (seasons.length > 0) {
      const currentSeason = seasons.find(s => s.is_current) || seasons[0];
      setSelectedSeason(currentSeason);
    }
  }, [currentSeasonId, seasons]);

  const fetchSeasons = async () => {
    try {
      const response = await fetch('/api/seasons');
      const data = await response.json();
      
      if (data.success) {
        setSeasons(data.seasons);
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeasonSelect = (season) => {
    setSelectedSeason(season);
    setIsOpen(false);
    if (onSeasonChange) {
      onSeasonChange(season);
    }
  };

  const formatDateRange = (season) => {
    if (!season.start_date || !season.end_date) return '';
    
    const start = new Date(season.start_date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    const end = new Date(season.end_date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    
    return `${start} - ${end}`;
  };

  if (loading) {
    return (
      <div className="w-64 h-12 glass-2 animate-pulse rounded-full"></div>
    );
  }

  if (seasons.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="season-selector-btn flex items-center justify-between w-64 px-5 py-3 backdrop-blur-md bg-white/15 rounded-2xl transition-all duration-300 hover:bg-white/20"
      >
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-white" />
          <div className="text-left">
            <p className="font-medium text-white text-sm">
              {selectedSeason?.name || 'Select Season'}
            </p>
            {selectedSeason && (
              <p className="text-xs text-white/70">
                {formatDateRange(selectedSeason)}
              </p>
            )}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-white/70 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full max-w-64 mt-2 season-dropdown rounded-2xl shadow-lg z-50 max-h-64 overflow-y-auto backdrop-blur-lg">
          {seasons.map((season) => (
            <button
              key={season.id}
              onClick={() => handleSeasonSelect(season)}
              className={`w-full px-5 py-3 text-left hover:bg-white/10 transition-colors border-b border-white/10 last:border-b-0 first:rounded-t-2xl last:rounded-b-2xl ${
                selectedSeason?.id === season.id ? 'bg-white/15 text-white' : 'text-white/90'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium flex items-center gap-2 text-sm text-shadow-adaptive-lg">
                    {season.name}
                  </p>
                  <p className="text-xs text-white/60 mt-1 text-shadow-adaptive-lg">
                    {formatDateRange(season)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}