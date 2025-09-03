/**
 * Message Thread Component
 * Manages message threading and conversation branching
 */

import React, { useState, useMemo } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  Tooltip, 
  Tree, 
  Modal,
  Input,
  message as antMessage
} from 'antd';
import {
  BranchesOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  MessageOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useChatStore } from '../../stores/chatStore';
import type { ChatMessage } from '../../types/chat';
import type { DataNode } from 'antd/es/tree';
import './MessageThread.css';

const { Text } = Typography;
const { TextArea } = Input;

interface MessageThreadProps {
  visible: boolean;
  onClose: () => void;
  onMessageSelect: (messageId: string) => void;
  className?: string;
}

interface ThreadNode extends DataNode {
  messageId: string;
  message: ChatMessage;
  children?: ThreadNode[];
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  visible,
  onClose,
  onMessageSelect,
  className,
}) => {
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [branchContent, setBranchContent] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  const { 
    messages, 
    getActiveSession,
    addMessage,
    deleteMessage,
    updateMessage
  } = useChatStore();

  // Build thread tree structure
  const threadTree = useMemo(() => {
    if (!messages.length) return [];

    // Create a map of message threads
    const messageMap = new Map<string, ChatMessage>();
    
    messages.forEach(msg => {
      messageMap.set(msg.id, msg);
    });

    // Build parent-child relationships (simplified - in real app this would be more complex)
    // For now, we'll create a simple linear thread with potential branches
    const rootNodes: ThreadNode[] = [];
    const processedIds = new Set<string>();

    const buildNode = (message: ChatMessage): ThreadNode => {
      const node: ThreadNode = {
        key: message.id,
        messageId: message.id,
        message,
        title: (
          <div className="thread-node-title">
            <Space size="small">
              <span className={`role-indicator role-${message.role}`}>
                {message.role.charAt(0).toUpperCase()}
              </span>
              <Text style={{ fontSize: 12 }}>
                {message.content.slice(0, 50)}
                {message.content.length > 50 ? '...' : ''}
              </Text>
              <Text type="secondary" style={{ fontSize: 10 }}>
                {new Date(message.timestamp).toLocaleTimeString()}
              </Text>
            </Space>
          </div>
        ),
        children: [],
      };

      return node;
    };

    // Create linear thread for now (can be enhanced for true branching)
    messages.forEach((message) => {
      if (!processedIds.has(message.id)) {
        const node = buildNode(message);
        rootNodes.push(node);
        processedIds.add(message.id);
      }
    });

    return rootNodes;
  }, [messages]);

  // Handle node selection
  const handleNodeSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0) {
      const messageId = selectedKeys[0] as string;
      setSelectedMessageId(messageId);
      onMessageSelect(messageId);
    }
  };

  // Handle create branch
  const handleCreateBranch = () => {
    if (!selectedMessageId || !branchContent.trim()) {
      antMessage.warning('Please select a message and enter branch content');
      return;
    }

    // Create a new message as a branch
    const newMessage: Omit<ChatMessage, 'id'> = {
      role: 'user',
      content: branchContent.trim(),
      timestamp: Date.now(),
      attachments: [],
    };

    addMessage(newMessage);
    setBranchContent('');
    setIsCreatingBranch(false);
    antMessage.success('Branch created successfully');
  };

  // Handle delete message
  const handleDeleteMessage = (messageId: string) => {
    Modal.confirm({
      title: 'Delete Message',
      content: 'Are you sure you want to delete this message? This action cannot be undone.',
      icon: <ExclamationCircleOutlined />,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        deleteMessage(messageId);
        antMessage.success('Message deleted');
      },
    });
  };

  // Handle edit message
  const handleEditMessage = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    Modal.confirm({
      title: 'Edit Message',
      content: (
        <div style={{ marginTop: 16 }}>
          <TextArea
            defaultValue={message.content}
            rows={4}
            placeholder="Edit message content..."
            id="edit-message-content"
          />
        </div>
      ),
      okText: 'Save',
      cancelText: 'Cancel',
      onOk: () => {
        const textarea = document.getElementById('edit-message-content') as HTMLTextAreaElement;
        if (textarea && textarea.value.trim()) {
          updateMessage(messageId, { content: textarea.value.trim() });
          antMessage.success('Message updated');
        }
      },
    });
  };

  // Get message statistics
  const getThreadStats = () => {
    const totalMessages = messages.length;
    const userMessages = messages.filter(m => m.role === 'user').length;
    const assistantMessages = messages.filter(m => m.role === 'assistant').length;
    const totalTokens = messages.reduce((sum, m) => sum + (m.tokens?.total || 0), 0);

    return {
      totalMessages,
      userMessages,
      assistantMessages,
      totalTokens,
    };
  };

  const stats = getThreadStats();
  const activeSession = getActiveSession();
  const selectedMessage = selectedMessageId ? messages.find(m => m.id === selectedMessageId) : null;

  if (!visible) return null;

  return (
    <Card 
      className={`message-thread ${className || ''}`}
      title={
        <Space>
          <BranchesOutlined />
          <span>Message Thread</span>
          {activeSession && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              "{activeSession.title}"
            </Text>
          )}
        </Space>
      }
      extra={
        <Button
          type="text"
          icon={<DeleteOutlined />}
          onClick={onClose}
          size="small"
        />
      }
      size="small"
    >
      {/* Thread Statistics */}
      <div className="thread-stats">
        <Space size="large" wrap>
          <div className="stat-item">
            <Text type="secondary" style={{ fontSize: 11 }}>Messages</Text>
            <br />
            <Text strong>{stats.totalMessages}</Text>
          </div>
          <div className="stat-item">
            <Text type="secondary" style={{ fontSize: 11 }}>User</Text>
            <br />
            <Text strong style={{ color: '#1890ff' }}>{stats.userMessages}</Text>
          </div>
          <div className="stat-item">
            <Text type="secondary" style={{ fontSize: 11 }}>AI</Text>
            <br />
            <Text strong style={{ color: '#52c41a' }}>{stats.assistantMessages}</Text>
          </div>
          <div className="stat-item">
            <Text type="secondary" style={{ fontSize: 11 }}>Tokens</Text>
            <br />
            <Text strong>{stats.totalTokens.toLocaleString()}</Text>
          </div>
        </Space>
      </div>

      {/* Thread Tree */}
      <div className="thread-tree-container">
        {threadTree.length === 0 ? (
          <div className="thread-empty">
            <MessageOutlined style={{ fontSize: 32, color: '#8c8c8c' }} />
            <Text type="secondary">No messages in this conversation</Text>
          </div>
        ) : (
          <Tree
            treeData={threadTree}
            onSelect={handleNodeSelect}
            selectedKeys={selectedMessageId ? [selectedMessageId] : []}
            expandedKeys={expandedKeys}
            onExpand={setExpandedKeys}
            showLine={{ showLeafIcon: false }}
            className="message-tree"
          />
        )}
      </div>

      {/* Selected Message Actions */}
      {selectedMessage && (
        <div className="selected-message-actions">
          <div className="selected-message-info">
            <Text strong style={{ fontSize: 12 }}>
              Selected: {selectedMessage.role} message
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {new Date(selectedMessage.timestamp).toLocaleString()}
            </Text>
          </div>
          
          <Space size="small">
            <Tooltip title="Create Branch">
              <Button
                type="text"
                icon={<PlusOutlined />}
                size="small"
                onClick={() => setIsCreatingBranch(true)}
              />
            </Tooltip>
            
            <Tooltip title="Edit Message">
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={() => handleEditMessage(selectedMessage.id)}
              />
            </Tooltip>
            
            <Tooltip title="Delete Message">
              <Button
                type="text"
                icon={<DeleteOutlined />}
                size="small"
                danger
                onClick={() => handleDeleteMessage(selectedMessage.id)}
              />
            </Tooltip>
          </Space>
        </div>
      )}

      {/* Create Branch Modal */}
      <Modal
        title="Create Message Branch"
        open={isCreatingBranch}
        onOk={handleCreateBranch}
        onCancel={() => {
          setIsCreatingBranch(false);
          setBranchContent('');
        }}
        okText="Create Branch"
        cancelText="Cancel"
        width={500}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            Create an alternative message branch from the selected point in the conversation.
          </Text>
        </div>
        
        <TextArea
          value={branchContent}
          onChange={(e) => setBranchContent(e.target.value)}
          placeholder="Enter the alternative message content..."
          rows={4}
          showCount
          maxLength={2000}
        />
        
        {selectedMessage && (
          <div style={{ marginTop: 12, padding: 8, background: 'var(--bg-tertiary)', borderRadius: 4 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Branching from:
            </Text>
            <br />
            <Text style={{ fontSize: 12 }}>
              {selectedMessage.content.slice(0, 100)}
              {selectedMessage.content.length > 100 ? '...' : ''}
            </Text>
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default MessageThread;