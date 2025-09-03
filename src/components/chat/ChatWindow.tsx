/**
 * Chat Window Component
 * Main chat interface layout with session list, message area, and input
 */

import React, { useState, useEffect, useRef } from 'react';
import { Layout, Card, Typography, Space, Button, Tooltip, Divider } from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  ExportOutlined,
  SettingOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { useChatStore } from '../../stores/chatStore';
import { useConfigStore } from '../../stores/configStore';
import { SessionList } from './SessionList';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ChatStats } from './ChatStats';

import './ChatWindow.css';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

interface ChatWindowProps {
  className?: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ className }) => {
  const [sessionSiderCollapsed, setSessionSiderCollapsed] = useState(false);
  const [statsSiderCollapsed, setStatsSiderCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    activeSessionId,
    messages,
    isStreaming,
    createSession,
    setActiveSession,
    deleteSession,
    clearMessages,
    getActiveSession,
    loading,
    errors,
  } = useChatStore();

  const { configs } = useConfigStore();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Create new session
  const handleNewSession = () => {
    const defaultConfig = configs.find(c => c.isDefault) || configs[0];
    const title = `Chat ${new Date().toLocaleString()}`;
    
    createSession(title, defaultConfig?.model, defaultConfig?.id);
  };

  // Handle session selection
  const handleSessionSelect = (sessionId: string) => {
    setActiveSession(sessionId);
  };

  // Handle session deletion
  const handleSessionDelete = (sessionId: string) => {
    deleteSession(sessionId);
  };

  // Handle clear messages
  const handleClearMessages = () => {
    clearMessages();
  };

  // Handle export session
  const handleExportSession = () => {
    const session = getActiveSession();
    if (!session) return;

    // Create markdown content
    const markdown = [
      `# ${session.title}`,
      `**Model:** ${session.modelId}`,
      `**Created:** ${new Date(session.createdAt).toLocaleString()}`,
      `**Messages:** ${session.messages.length}`,
      '',
      '---',
      '',
      ...session.messages.map(msg => [
        `## ${msg.role.charAt(0).toUpperCase() + msg.role.slice(1)}`,
        '',
        msg.content,
        '',
        msg.attachments && msg.attachments.length > 0 && [
          '**Attachments:**',
          ...msg.attachments.map(att => `- ${att.name} (${att.fileType})`),
          '',
        ],
        msg.tokens && [
          `**Tokens:** ${msg.tokens.total} (${msg.tokens.input} input, ${msg.tokens.output} output)`,
          msg.cost && `**Cost:** $${msg.cost.toFixed(6)}`,
          msg.responseTime && `**Response Time:** ${msg.responseTime}ms`,
          '',
        ],
        '---',
        '',
      ].flat()).filter(Boolean),
    ].flat().join('\n');

    // Download as file
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const activeSession = getActiveSession();
  const hasMessages = messages.length > 0;
  const hasConfigs = configs.length > 0;

  return (
    <div className={`chat-window ${className || ''}`}>
      <Layout className="chat-layout">
        {/* Session List Sidebar */}
        <Sider
          width={280}
          collapsedWidth={0}
          collapsed={sessionSiderCollapsed}
          onCollapse={setSessionSiderCollapsed}
          className="session-sider"
          trigger={null}
          breakpoint="lg"
        >
          <div className="session-panel">
            <div className="session-header">
              <Title level={4}>Chat Sessions</Title>
              <Tooltip title="New Chat Session">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleNewSession}
                  disabled={!hasConfigs}
                  size="small"
                >
                  New Chat
                </Button>
              </Tooltip>
            </div>
            
            <SessionList
              onSessionSelect={handleSessionSelect}
              onSessionDelete={handleSessionDelete}
              activeSessionId={activeSessionId}
            />
          </div>
        </Sider>

        {/* Main Chat Area */}
        <Layout className="chat-main">
          <Content className="chat-content">
            {!activeSession ? (
              // Welcome Screen
              <div className="chat-welcome">
                <Card className="welcome-card">
                  <Space direction="vertical" align="center" size="large">
                    <MessageOutlined style={{ fontSize: 64, color: '#1890ff' }} />
                    <Title level={2}>Welcome to OpenAI API Lab</Title>
                    <Text type="secondary" style={{ textAlign: 'center', maxWidth: 400 }}>
                      Start a new chat session to test and interact with AI models. 
                      Configure your API settings first if you haven't already.
                    </Text>
                    
                    <Space>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleNewSession}
                        disabled={!hasConfigs}
                        size="large"
                      >
                        Start New Chat
                      </Button>
                      
                      {!hasConfigs && (
                        <Button
                          icon={<SettingOutlined />}
                          onClick={() => window.location.href = '/config'}
                          size="large"
                        >
                          Configure API
                        </Button>
                      )}
                    </Space>
                    
                    {!hasConfigs && (
                      <Text type="warning">
                        Please configure at least one API endpoint to start chatting
                      </Text>
                    )}
                  </Space>
                </Card>
              </div>
            ) : (
              // Active Chat Interface
              <div className="chat-interface">
                {/* Chat Header */}
                <div className="chat-header">
                  <div className="chat-title">
                    <Title level={4} style={{ margin: 0 }}>
                      {activeSession.title}
                    </Title>
                    <Text type="secondary">
                      Model: {activeSession.modelId || 'Not configured'}
                    </Text>
                  </div>
                  
                  <Space>
                    <Tooltip title="Clear Messages">
                      <Button
                        icon={<DeleteOutlined />}
                        onClick={handleClearMessages}
                        disabled={!hasMessages || isStreaming}
                        size="small"
                      />
                    </Tooltip>
                    
                    <Tooltip title="Export Chat">
                      <Button
                        icon={<ExportOutlined />}
                        onClick={handleExportSession}
                        disabled={!hasMessages}
                        size="small"
                      />
                    </Tooltip>
                  </Space>
                </div>

                <Divider style={{ margin: '12px 0' }} />

                {/* Messages Area */}
                <div className="messages-container">
                  <MessageList
                    messages={messages}
                    isStreaming={isStreaming}
                    loading={loading.messages}
                    error={errors.messages}
                  />
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="message-input-container">
                  <MessageInput
                    disabled={!activeSession.modelId || isStreaming}
                    placeholder={
                      !activeSession.modelId 
                        ? "Please configure a model for this session"
                        : isStreaming 
                        ? "AI is responding..."
                        : "Type your message..."
                    }
                  />
                </div>
              </div>
            )}
          </Content>

          {/* Stats Sidebar */}
          <Sider
            width={300}
            collapsedWidth={0}
            collapsed={statsSiderCollapsed}
            onCollapse={setStatsSiderCollapsed}
            className="stats-sider"
            trigger={null}
            reverseArrow
            breakpoint="xl"
          >
            <div className="stats-panel">
              <ChatStats sessionId={activeSessionId} />
            </div>
          </Sider>
        </Layout>
      </Layout>
    </div>
  );
};

export default ChatWindow;