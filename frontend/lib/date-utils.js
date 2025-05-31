// Date formatting and utility functions

export function formatDate(date, format = 'short') {
    if (!date) return 'N/A';
    
    const d = new Date(date);
    
    switch (format) {
      case 'short':
        return d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      
      case 'long':
        return d.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
      
      case 'time':
        return d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });
      
      case 'datetime':
        return d.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      
      case 'relative':
        return getRelativeTime(d);
      
      default:
        return d.toLocaleDateString();
    }
  }
  
  export function getRelativeTime(date) {
    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now - then) / 1000);
    
    if (seconds < 60) return 'just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    
    const years = Math.floor(days / 365);
    return `${years}y ago`;
  }
  
  export function getDaysRemaining(endDate) {
    if (!endDate) return null;
    
    const end = new Date(endDate);
    const now = new Date();
    const diff = end - now;
    
    if (diff <= 0) return 0;
    
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  
  export function getTimeRemaining(endDate) {
    if (!endDate) return null;
    
    const end = new Date(endDate);
    const now = new Date();
    const diff = end - now;
    
    if (diff <= 0) return { expired: true };
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { days, hours, minutes, expired: false };
  }
  
  export function formatDuration(seconds) {
    if (!seconds || seconds < 0) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
  
  export function isToday(date) {
    const today = new Date();
    const d = new Date(date);
    
    return d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
  }
  
  export function isThisWeek(date) {
    const now = new Date();
    const d = new Date(date);
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 6));
    
    return d >= weekStart && d <= weekEnd;
  }
  
  export function getDateRange(start, end) {
    if (!start || !end) return 'N/A';
    
    const startDate = formatDate(start, 'short');
    const endDate = formatDate(end, 'short');
    
    return `${startDate} - ${endDate}`;
  }
  
  // Format timestamps for display
  export function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Today at ${formatDate(date, 'time')}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${formatDate(date, 'time')}`;
    } else if (diffDays < 7) {
      return formatDate(date, 'datetime');
    } else {
      return formatDate(date, 'short');
    }
  }