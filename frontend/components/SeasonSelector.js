// frontend/components/SeasonSelector.js
import { useState, useEffect } from 'react';
import { ChevronDown, Calendar, Clock } from 'lucide-react';

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
      <div className="w-64 h-12 glass-card-subtle animate-pulse rounded-lg"></div>
    );
  }

  if (seasons.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-64 px-4 py-3 glass-card rounded-lg hover:glass-card-enhanced transition-all shadow-sm"
      >
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-primary-600 icon-glow-sm" />
          <div className="text-left">
            <p className="font-medium text-neutral-800">
              {selectedSeason?.name || 'Select Season'}
            </p>
            {selectedSeason && (
              <p className="text-xs text-neutral-500">
                {formatDateRange(selectedSeason)}
              </p>
            )}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform icon-glow-sm ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 glass-card border border-neutral-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto backdrop-blur-lg">
          {seasons.map((season) => (
            <button
              key={season.id}
              onClick={() => handleSeasonSelect(season)}
              className={`w-full px-4 py-3 text-left hover:bg-white/20 transition-colors border-b border-neutral-100/50 last:border-b-0 ${
                selectedSeason?.id === season.id ? 'bg-primary-50/80 text-primary-700' : 'text-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    {season.name}
                    {season.is_current && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100/80 text-green-700 text-xs rounded-full backdrop-blur-sm border border-green-200/50">
                        <Clock className="w-3 h-3" />
                        Current
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
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