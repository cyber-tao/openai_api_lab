/**
 * Screen Reader Announcer Hook
 * Hook for managing screen reader announcements
 */

import React from 'react';

/**
 * Hook for managing announcements
 */
export const useScreenReaderAnnouncer = () => {
  const [announcement, setAnnouncement] = React.useState<{
    message: string;
    priority: 'polite' | 'assertive';
  } | null>(null);

  const announce = React.useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement({ message, priority });
  }, []);

  const clear = React.useCallback(() => {
    setAnnouncement(null);
  }, []);

  return {
    announcement,
    announce,
    clear,
  };
};