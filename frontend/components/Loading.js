import React from 'react';

const LoadingSpinner = ({ 
  message = "Loading...", 
  size = "large", 
  className = "",
  showMessage = true 
}) => {
  const sizeClasses = {
    small: "h-8 w-8 border-2",
    medium: "h-12 w-12 border-3",
    large: "h-16 w-16 border-4"
  };

  const textSizeClasses = {
    small: "text-sm",
    medium: "text-base", 
    large: "text-lg"
  };

  return (
    <div className={`text-center ${className}`}>
      <div 
        className={`animate-spin rounded-full border-t-purple-500 border-b-purple-500 border-l-transparent border-r-transparent mx-auto mb-4 ${sizeClasses[size]}`}
      ></div>
      {showMessage && (
        <p className={`text-gray-600 font-medium ${textSizeClasses[size]}`}>
          {message}
        </p>
      )}
    </div>
  );
};

// Full page loading component
const FullPageLoading = ({ message = "Loading..." }) => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner message={message} size="large" />
    </div>
  );
};

// Section loading component (for loading parts of a page)
const SectionLoading = ({ message = "Loading...", className = "" }) => {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <LoadingSpinner message={message} size="medium" />
    </div>
  );
};

// Inline loading component (for buttons, small areas)
const InlineLoading = ({ message = "", size = "small", className = "" }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <LoadingSpinner 
        message={message} 
        size={size} 
        showMessage={!!message}
      />
    </div>
  );
};

// Export individual components and a main Loading object
export { LoadingSpinner, FullPageLoading, SectionLoading, InlineLoading };

export default {
  Spinner: LoadingSpinner,
  FullPage: FullPageLoading,
  Section: SectionLoading,
  Inline: InlineLoading
};