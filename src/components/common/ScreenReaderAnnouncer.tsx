/**
 * Screen Reader Announcer Component
 * Provides live announcements for screen readers
 */

import React, { useEffect, useRef } from 'react';

interface ScreenReaderAnnouncerProps {
  message: string;
  priority?: 'polite' | 'assertive';
  clearAfter?: number; // Clear message after X milliseconds
}

export const ScreenReaderAnnouncer: React.FC<ScreenReaderAnnouncerProps> = ({
  message,
  priority = 'polite',
  clearAfter = 5000,
}) => {
  const announcerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && announcerRef.current) {
      announcerRef.current.textContent = message;

      if (clearAfter > 0) {
        const timer = setTimeout(() => {
          if (announcerRef.current) {
            announcerRef.current.textContent = '';
          }
        }, clearAfter);

        return () => clearTimeout(timer);
      }
    }
  }, [message, clearAfter]);

  return (
    <div
      ref={announcerRef}
      aria-live={priority}
      aria-atomic="true"
      style={{
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
    />
  );
};



export default ScreenReaderAnnouncer;