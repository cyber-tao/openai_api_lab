/**
 * Chat Page Component
 * Main chat interface for interacting with AI models
 */

import React from 'react';
import { Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

export const ChatPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={2}>Chat</Title>
        <Paragraph>
          Interactive chat interface with AI models. This page will contain the main chat functionality.
        </Paragraph>
      </Card>
    </div>
  );
};

export default ChatPage;