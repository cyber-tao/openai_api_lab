/**
 * Message List Component
 * Displays chat messages with role-based styling and streaming support
 */

import React, { useState, useRef } from 'react';
import { 
  List, 
  Card, 
  Typography, 
  Space, 
  Button, 
  Tag, 
  Tooltip, 
  Avatar,
  Alert,
  Spin,
  Empty,
  Popconfirm,
  message as antMessage
} from 'antd';
import {
  UserOutlined,
  RobotOutlined,
  SettingOutlined,
  CopyOutlined,
  RedoOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  BranchesOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { useChatStore } from '../../stores/chatStore';
import { useMessageProcessing } from '../../hooks/useMessageProcessing';
import type { ChatMessage } from '../../types/chat';
import { MessageContent } from './MessageContent';
import MessageSearch from './MessageSearch';
import MessageThread from './MessageThread';
import FilePreview from '../common/FilePreview';
import type { FileAttachment } from '../../types/file';
import './MessageList.css';

const { Text } = Typography;

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  loading: boolean;
  error: string | null;
  className?: string;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isStreaming,
  loading,
  error,
  className,
}) => {
  const [previewFile, setPreviewFile] = useState<FileAttachment | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const [copiedMessages, setCopiedMessages] = useState<Set<string>>(new Set());
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  const { streamingMessageId } = useChatStore();
  const { 
    retryMessage, 
    canRetry, 
    getRetryAttempts,
    state: processingState 
  } = useMessageProcessing();

  // Get role-specific styling
  const getRoleConfig = (role: ChatMessage['role']) => {
    switch (role) {
      case 'user':
        return {
          avatar: <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />,
          title: 'You',
          cardClass: 'message-user',
          align: 'right' as const,
        };
      case 'assistant':
        return {
          avatar: <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#52c41a' }} />,
          title: 'Assistant',
          cardClass: 'message-assistant',
          align: 'left' as const,
        };
      case 'system':
        return {
          avatar: <Avatar icon={<SettingOutlined />} style={{ backgroundColor: '#faad14' }} />,
          title: 'System',
          cardClass: 'message-system',
          align: 'left' as const,
        };
      default:
        return {
          avatar: <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#8c8c8c' }} />,
          title: 'Unknown',
          cardClass: 'message-unknown',
          align: 'left' as const,
        };
    }
  };

  // Handle copy message content
  const handleCopyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessages(prev => new Set(prev).add(messageId));
      antMessage.success('Message copied to clipboard');
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
      antMessage.error('Failed to copy message');
    }
  };

  // Handle message selection from search/thread
  const handleMessageSelect = (messageId: string) => {
    const messageElement = messageRefs.current.get(messageId);
    if (messageElement) {
      messageElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
      // Highlight the message briefly
      messageElement.classList.add('message-highlighted');
      setTimeout(() => {
        messageElement.classList.remove('message-highlighted');
      }, 2000);
    }
  };

  // Handle retry message (for failed messages)
  const handleRetryMessage = async (messageId: string) => {
    await retryMessage(messageId);
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Format response time
  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Render message metadata
  const renderMessageMeta = (message: ChatMessage) => {
    const hasTokens = message.tokens && message.tokens.total > 0;
    const hasCost = message.cost && message.cost > 0;
    const hasResponseTime = message.responseTime && message.responseTime > 0;
    const hasError = message.error;

    if (!hasTokens && !hasCost && !hasResponseTime && !hasError) {
      return null;
    }

    return (
      <div className="message-meta">
        <Space size="small" wrap>
          {hasTokens && (
            <Tooltip title={`Input: ${message.tokens!.input}, Output: ${message.tokens!.output}`}>
              <Tag color="blue">
                {message.tokens!.total} tokens
              </Tag>
            </Tooltip>
          )}

          {hasCost && (
            <Tooltip title="Estimated cost">
              <Tag color="green" icon={<DollarOutlined />}>
                ${message.cost!.toFixed(6)}
              </Tag>
            </Tooltip>
          )}

          {hasResponseTime && (
            <Tooltip title="Response time">
              <Tag color="orange" icon={<ClockCircleOutlined />}>
                {formatResponseTime(message.responseTime!)}
              </Tag>
            </Tooltip>
          )}

          <Text type="secondary" style={{ fontSize: 11 }}>
            {formatTimestamp(message.timestamp)}
          </Text>
        </Space>

        {hasError && (
          <Alert
            message={
              <Space>
                <span>Error</span>
                {getRetryAttempts(message.id) > 0 && (
                  <Tag color="orange">
                    Retry {getRetryAttempts(message.id)}/3
                  </Tag>
                )}
              </Space>
            }
            description={message.error}
            type="error"
            showIcon
            style={{ marginTop: 8 }}
            action={
              canRetry(message.id) ? (
                <Popconfirm
                  title="Retry this message?"
                  description="This will attempt to regenerate the response."
                  onConfirm={() => handleRetryMessage(message.id)}
                  okText="Retry"
                  cancelText="Cancel"
                  icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
                >
                  <Button
                    size="small"
                    type="text"
                    icon={<RedoOutlined />}
                    loading={processingState.isProcessing}
                    disabled={processingState.isProcessing}
                  >
                    Retry
                  </Button>
                </Popconfirm>
              ) : (
                <Tooltip title="Maximum retry attempts reached">
                  <Button
                    size="small"
                    type="text"
                    icon={<RedoOutlined />}
                    disabled
                  >
                    Retry
                  </Button>
                </Tooltip>
              )
            }
          />
        )}
      </div>
    );
  };

  // Render file attachments
  const renderAttachments = (attachments: FileAttachment[]) => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <div className="message-attachments">
        <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
          Attachments:
        </Text>
        <Space wrap size="small">
          {attachments.map(attachment => (
            <Card
              key={attachment.id}
              size="small"
              className="attachment-card"
              bodyStyle={{ padding: '8px 12px' }}
            >
              <Space size="small">
                <FileOutlined />
                <div className="attachment-info">
                  <Text strong style={{ fontSize: 12 }}>
                    {attachment.name}
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {attachment.fileType} • {(attachment.size / 1024).toFixed(1)}KB
                  </Text>
                </div>
                <Button
                  type="text"
                  icon={<EyeOutlined />}
                  size="small"
                  onClick={() => setPreviewFile(attachment)}
                />
              </Space>
            </Card>
          ))}
        </Space>
      </div>
    );
  };

  // Render individual message
  const renderMessage = (message: ChatMessage) => {
    const roleConfig = getRoleConfig(message.role);
    const isStreamingMessage = message.id === streamingMessageId;
    const isCopied = copiedMessages.has(message.id);

    return (
      <div 
        key={message.id} 
        className={`message-wrapper ${roleConfig.align}`}
        ref={(el) => {
          if (el) {
            messageRefs.current.set(message.id, el);
          } else {
            messageRefs.current.delete(message.id);
          }
        }}
      >
        <Card
          className={`message-card ${roleConfig.cardClass} ${isStreamingMessage ? 'streaming' : ''}`}
          size="small"
        >
          <div className="message-header">
            <Space>
              {roleConfig.avatar}
              <Text strong>{roleConfig.title}</Text>
            </Space>

            <Space size="small">
              <Tooltip title={isCopied ? 'Copied!' : 'Copy message'}>
                <Button
                  type="text"
                  icon={isCopied ? <CheckOutlined /> : <CopyOutlined />}
                  size="small"
                  onClick={() => handleCopyMessage(message.content, message.id)}
                  className={isCopied ? 'copied' : ''}
                />
              </Tooltip>
            </Space>
          </div>

          {/* File Attachments */}
          {message.attachments && renderAttachments(message.attachments)}

          {/* Message Content */}
          <div className="message-body">
            <MessageContent
              content={message.content}
              isStreaming={isStreamingMessage && isStreaming}
            />
          </div>

          {/* Message Metadata */}
          {renderMessageMeta(message)}
        </Card>
      </div>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <div className="message-list-loading">
        <Spin size="large" />
        <Text type="secondary">Loading messages...</Text>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="message-list-error">
        <Alert
          message="Failed to load messages"
          description={error}
          type="error"
          showIcon
        />
      </div>
    );
  }

  // Show empty state
  if (messages.length === 0) {
    return (
      <div className="message-list-empty">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No messages yet"
          style={{ padding: '60px 20px' }}
        >
          <Text type="secondary">
            Start the conversation by sending a message below
          </Text>
        </Empty>
      </div>
    );
  }

  return (
    <div className={`message-list ${className || ''}`}>
      {/* Message List Controls */}
      <div className="message-list-controls">
        <Space size="small">
          <Tooltip title="Search Messages">
            <Button
              type="text"
              icon={<SearchOutlined />}
              size="small"
              onClick={() => setShowSearch(!showSearch)}
              className={showSearch ? 'active' : ''}
            />
          </Tooltip>
          
          <Tooltip title="Message Thread">
            <Button
              type="text"
              icon={<BranchesOutlined />}
              size="small"
              onClick={() => setShowThread(!showThread)}
              className={showThread ? 'active' : ''}
            />
          </Tooltip>
        </Space>
      </div>

      {/* Messages */}
      <List
        dataSource={messages}
        renderItem={renderMessage}
        className="messages"
        split={false}
      />

      {/* Streaming indicator */}
      {isStreaming && (
        <div className="streaming-indicator">
          <Space>
            <Spin size="small" />
            <Text type="secondary">AI is typing...</Text>
          </Space>
        </div>
      )}

      {/* Message Search */}
      <MessageSearch
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        onMessageSelect={handleMessageSelect}
      />

      {/* Message Thread */}
      <MessageThread
        visible={showThread}
        onClose={() => setShowThread(false)}
        onMessageSelect={handleMessageSelect}
      />

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          visible={true}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
};

export default MessageList;