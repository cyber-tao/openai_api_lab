/**
 * Loading Component
 * Displays loading states with accessibility support
 */

import React from 'react';
import { Spin, Typography } from 'antd';
import { Loader2 } from 'lucide-react';

const { Text } = Typography;

interface LoadingProps {
  size?: 'small' | 'default' | 'large';
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'default',
  message = 'Loading...',
  fullScreen = false,
  className = '',
}) => {
  const content = (
    <div
      className={`loading-container ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '24px',
      }}
    >
      <Spin
        size={size}
        indicator={<Loader2 className="loading-spinner" />}
        aria-label="Loading"
      />
      {message && (
        <Text type="secondary" aria-live="polite">
          {message}
        </Text>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className="layout-loading"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-bg-base)',
          zIndex: 9999,
        }}
      >
        {content}
      </div>
    );
  }

  return content;
};

export default Loading;