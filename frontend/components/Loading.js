import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

const LoadingSpinner = ({ 
  message = "Loading...", 
  size = "large", 
  className = "",
  showMessage = true,
  variant = "default" // default, purple, blue, green
}) => {
  const sizeClasses = {
    small: "h-6 w-6 border-2",
    medium: "h-8 w-8 border-3", 
    large: "h-12 w-12 border-4",
    xlarge: "h-16 w-16 border-4"
  };

  const textSizeClasses = {
    small: "text-xs",
    medium: "text-sm", 
    large: "text-base",
    xlarge: "text-lg"
  };

  const spinnerVariants = {
    default: "border-white/30 border-t-white border-b-white",
    purple: "border-white/30 border-t-purple-400 border-b-pink-400",
    blue: "border-white/30 border-t-blue-400 border-b-cyan-400",
    green: "border-white/30 border-t-emerald-400 border-b-green-400"
  };

  return (
    <div className={`text-center ${className}`}>
      <div 
        className={`animate-spin rounded-full mx-auto mb-3 sm:mb-4 ${sizeClasses[size]} ${spinnerVariants[variant]} icon-shadow-adaptive transition-all duration-300`}
        style={{
          filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.3))'
        }}
      />
      {showMessage && (
        <p className={`text-white/90 font-medium text-shadow-adaptive-sm ${textSizeClasses[size]} transition-all duration-300`}>
          {message}
        </p>
      )}
    </div>
  );
};

// Full page loading component with glass morphism
const FullPageLoading = ({ message = "Loading...", showLogo = false }) => {
  return (
    <div className="min-h-screen flex items-center justify-center relative">
      {/* Background with subtle animation */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute -top-8 -right-8 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse-soft"></div>
        <div className="absolute -bottom-8 -left-8 w-80 h-80 bg-white rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="glass-1 rounded-3xl p-8 sm:p-12 shadow-2xl max-w-md w-full mx-4">
        {showLogo && (
          <div className="flex items-center justify-center gap-3 mb-6">
            <Sparkles className="w-8 h-8 text-purple-400 icon-shadow-adaptive animate-pulse" />
            <h2 className="text-2xl font-bold text-white text-shadow-adaptive">osu!Challengers</h2>
          </div>
        )}
        <LoadingSpinner message={message} size="large" variant="purple" />
      </div>
    </div>
  );
};

// Section loading component for parts of a page
const SectionLoading = ({ 
  message = "Loading...", 
  className = "",
  variant = "default",
  compact = false 
}) => {
  return (
    <div className={`flex items-center justify-center ${compact ? 'py-8' : 'py-12'} ${className}`}>
      <div className="glass-1 rounded-2xl p-6 sm:p-8 shadow-lg">
        <LoadingSpinner 
          message={message} 
          size="medium" 
          variant={variant}
        />
      </div>
    </div>
  );
};

// Inline loading component for buttons, small areas
const InlineLoading = ({ 
  message = "", 
  size = "small", 
  className = "",
  variant = "default",
  minimal = false 
}) => {
  if (minimal) {
    return (
      <div className={`flex items-center justify-center gap-2 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin text-white/80 icon-shadow-adaptive-sm" />
        {message && (
          <span className="text-white/90 text-sm font-medium text-shadow-adaptive-sm">
            {message}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="glass-2 rounded-xl px-4 py-3">
        <LoadingSpinner 
          message={message} 
          size={size} 
          showMessage={!!message}
          variant={variant}
        />
      </div>
    </div>
  );
};

// Skeleton loading for content areas
const SkeletonLoading = ({ 
  lines = 3, 
  className = "",
  showAvatar = false,
  showTitle = true 
}) => {
  return (
    <div className={`glass-1 rounded-2xl p-6 animate-pulse ${className}`}>
      <div className="flex items-start gap-4 mb-4">
        {showAvatar && (
          <div className="w-12 h-12 bg-white/20 rounded-full flex-shrink-0"></div>
        )}
        <div className="flex-1 space-y-3">
          {showTitle && (
            <div className="h-4 bg-white/20 rounded w-1/3"></div>
          )}
          {[...Array(lines)].map((_, i) => (
            <div 
              key={i} 
              className="h-3 bg-white/15 rounded"
              style={{ width: `${Math.random() * 40 + 60}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Card grid skeleton
const CardGridSkeleton = ({ 
  cards = 6, 
  columns = 3,
  className = "" 
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4 sm:gap-6 ${className}`}>
      {[...Array(cards)].map((_, i) => (
        <div key={i} className="glass-1 rounded-2xl p-6 animate-pulse">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl mx-auto"></div>
            <div className="h-4 bg-white/20 rounded w-2/3 mx-auto"></div>
            <div className="h-3 bg-white/15 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Table skeleton for leaderboards/lists
const TableSkeleton = ({ 
  rows = 8, 
  columns = 4,
  className = "" 
}) => {
  return (
    <div className={`glass-1 rounded-2xl overflow-hidden ${className}`}>
      <div className="glass-2 p-4 border-b border-white/10">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(columns)].map((_, i) => (
            <div key={i} className="h-4 bg-white/20 rounded"></div>
          ))}
        </div>
      </div>
      <div className="p-4 space-y-3">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 items-center py-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full"></div>
              <div className="h-3 bg-white/15 rounded w-20"></div>
            </div>
            {[...Array(columns - 1)].map((_, j) => (
              <div key={j} className="h-3 bg-white/15 rounded w-16"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// Export individual components and main Loading object
export { 
  LoadingSpinner, 
  FullPageLoading, 
  SectionLoading, 
  InlineLoading,
  SkeletonLoading,
  CardGridSkeleton,
  TableSkeleton
};

export default {
  Spinner: LoadingSpinner,
  FullPage: FullPageLoading,
  Section: SectionLoading,
  Inline: InlineLoading,
  Skeleton: SkeletonLoading,
  CardGrid: CardGridSkeleton,
  Table: TableSkeleton
};