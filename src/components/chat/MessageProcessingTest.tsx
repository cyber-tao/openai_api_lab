/**
 * Message Processing Test Component
 * Simple test component to verify message processing functionality
 */

import React, { useState } from 'react';
import { Card, Button, Input, Space, Typography, Alert, Progress } from 'antd';
import { SendOutlined, StopOutlined } from '@ant-design/icons';
import { useMessageProcessing } from '../../hooks/useMessageProcessing';
import { useChatStore } from '../../stores/chatStore';

const { Title, Text } = Typography;
const { TextArea } = Input;

export const MessageProcessingTest: React.FC = () => {
  const [testMessage, setTestMessage] = useState('Hello, this is a test message for the message processing system.');
  
  const { activeSessionId, createSession } = useChatStore();
  const {
    state,
    sendMessage,
    cancelMessage,
    clearError,
    estimateTokens,
  } = useMessageProcessing();

  const handleCreateSession = () => {
    createSession('Test Session', 'gpt-3.5-turbo', 'test-config');
  };

  const handleSendMessage = async () => {
    if (!testMessage.trim()) return;
    await sendMessage(testMessage);
  };

  const handleCancel = () => {
    cancelMessage();
  };

  const estimatedTokens = estimateTokens(testMessage);

  return (
    <Card title="Message Processing Test" style={{ maxWidth: 600, margin: '20px auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* Session Status */}
        <div>
          <Text strong>Active Session: </Text>
          {activeSessionId ? (
            <Text code>{activeSessionId.slice(-8)}</Text>
          ) : (
            <Text type="secondary">None</Text>
          )}
          {!activeSessionId && (
            <Button 
              type="link" 
              onClick={handleCreateSession}
              style={{ padding: 0, marginLeft: 8 }}
            >
              Create Test Session
            </Button>
          )}
        </div>

        {/* Processing Status */}
        {state.isProcessing && state.progress && (
          <Alert
            message={`Processing: ${state.progress.stage}`}
            description={
              <Progress 
                percent={state.progress.progress} 
                size="small" 
                status="active"
              />
            }
            type="info"
            showIcon
          />
        )}

        {/* Error Display */}
        {state.error && (
          <Alert
            message="Processing Error"
            description={state.error}
            type="error"
            showIcon
            closable
            onClose={clearError}
          />
        )}

        {/* Message Input */}
        <div>
          <Title level={5}>Test Message</Title>
          <TextArea
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Enter a test message..."
            rows={3}
            disabled={state.isProcessing}
          />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">
              Estimated tokens: {estimatedTokens} | Characters: {testMessage.length}
            </Text>
          </div>
        </div>

        {/* Current Processing Info */}
        {(state.currentTokens || state.currentCost || state.streamingContent) && (
          <Card size="small" title="Processing Info">
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {state.currentTokens && (
                <div>
                  <Text strong>Tokens: </Text>
                  <Text>
                    Input: {state.currentTokens.input}, 
                    Output: {state.currentTokens.output}, 
                    Total: {state.currentTokens.total}
                  </Text>
                </div>
              )}
              
              {state.currentCost && state.currentCost > 0 && (
                <div>
                  <Text strong>Cost: </Text>
                  <Text>${state.currentCost.toFixed(6)}</Text>
                </div>
              )}
              
              {state.streamingContent && (
                <div>
                  <Text strong>Streaming Content: </Text>
                  <Text code style={{ fontSize: 11 }}>
                    {state.streamingContent.substring(0, 100)}
                    {state.streamingContent.length > 100 ? '...' : ''}
                  </Text>
                </div>
              )}
            </Space>
          </Card>
        )}

        {/* Action Buttons */}
        <Space>
          {state.isProcessing ? (
            <Button
              type="primary"
              danger
              icon={<StopOutlined />}
              onClick={handleCancel}
            >
              Cancel Processing
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSendMessage}
              disabled={!activeSessionId || !testMessage.trim()}
            >
              Send Test Message
            </Button>
          )}
        </Space>

        {/* Instructions */}
        <Alert
          message="Test Instructions"
          description={
            <div>
              <p>1. Create a test session if none exists</p>
              <p>2. Enter a test message</p>
              <p>3. Click "Send Test Message" to test the processing</p>
              <p>4. Watch the processing status and streaming content</p>
              <p><strong>Note:</strong> This will attempt to call the API, so make sure you have a valid configuration.</p>
            </div>
          }
          type="info"
          showIcon
        />
      </Space>
    </Card>
  );
};

export default MessageProcessingTest;