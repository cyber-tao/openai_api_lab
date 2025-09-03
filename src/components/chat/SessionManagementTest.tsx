/**
 * Session Management Test Component
 * Test component to verify session management functionality
 */

import React, { useState } from 'react';
import { Button, Space, Input, Card, Typography, List, message } from 'antd';
import { 
  PlusOutlined, 
  CopyOutlined, 
  DeleteOutlined, 
  ExportOutlined,
  DownloadOutlined 
} from '@ant-design/icons';
import { useChatStore } from '../../stores/chatStore';
import { useSessionManagement } from '../../hooks/useSessionManagement';

const { Title, Text } = Typography;

export const SessionManagementTest: React.FC = () => {
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { sessions, activeSessionId } = useChatStore();
  const {
    createNewSession,
    duplicateSession,
    deleteSessionWithConfirm,
    renameSession,
    exportSessionAsMarkdown,
    exportSessionAsJSON,
    exportAllSessionsAsMarkdown,
    exportAllSessionsAsJSON,
    searchSessions,
    getTotalStats,
  } = useSessionManagement();

  const handleCreateSession = () => {
    if (!newSessionTitle.trim()) {
      message.error('Please enter a session title');
      return;
    }
    
    createNewSession(newSessionTitle.trim());
    setNewSessionTitle('');
  };

  const handleRenameSession = (sessionId: string) => {
    const newTitle = prompt('Enter new title:');
    if (newTitle) {
      renameSession(sessionId, newTitle);
    }
  };

  const filteredSessions = searchQuery ? searchSessions(searchQuery) : sessions;
  const stats = getTotalStats();

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Session Management Test</Title>
      
      {/* Statistics */}
      <Card title="Statistics" style={{ marginBottom: 16 }}>
        <Space direction="vertical">
          <Text>Total Sessions: {stats.totalSessions}</Text>
          <Text>Total Messages: {stats.totalMessages}</Text>
          <Text>Total Tokens: {stats.totalTokens.toLocaleString()}</Text>
          <Text>Total Cost: ${stats.totalCost.toFixed(6)}</Text>
          <Text>Average Session Length: {stats.averageSessionLength.toFixed(1)} messages</Text>
          <Text>Most Used Model: {stats.mostUsedModel || 'None'}</Text>
        </Space>
      </Card>

      {/* Create Session */}
      <Card title="Create New Session" style={{ marginBottom: 16 }}>
        <Space>
          <Input
            placeholder="Session title"
            value={newSessionTitle}
            onChange={(e) => setNewSessionTitle(e.target.value)}
            onPressEnter={handleCreateSession}
          />
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleCreateSession}
          >
            Create Session
          </Button>
        </Space>
      </Card>

      {/* Export All */}
      <Card title="Export All Sessions" style={{ marginBottom: 16 }}>
        <Space>
          <Button 
            icon={<ExportOutlined />}
            onClick={() => exportAllSessionsAsMarkdown()}
            disabled={sessions.length === 0}
          >
            Export as Markdown
          </Button>
          <Button 
            icon={<DownloadOutlined />}
            onClick={() => exportAllSessionsAsJSON()}
            disabled={sessions.length === 0}
          >
            Export as JSON
          </Button>
        </Space>
      </Card>

      {/* Search Sessions */}
      <Card title="Search Sessions" style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search sessions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
        />
      </Card>

      {/* Session List */}
      <Card title={`Sessions (${filteredSessions.length})`}>
        <List
          dataSource={filteredSessions}
          renderItem={(session) => (
            <List.Item
              key={session.id}
              style={{
                background: session.id === activeSessionId ? '#e6f7ff' : undefined,
                padding: 16,
                marginBottom: 8,
                borderRadius: 8,
                border: '1px solid #d9d9d9',
              }}
              actions={[
                <Button
                  key="rename"
                  size="small"
                  onClick={() => handleRenameSession(session.id)}
                >
                  Rename
                </Button>,
                <Button
                  key="duplicate"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => duplicateSession(session.id)}
                >
                  Duplicate
                </Button>,
                <Button
                  key="export-md"
                  size="small"
                  icon={<ExportOutlined />}
                  onClick={() => exportSessionAsMarkdown(session.id)}
                >
                  Export MD
                </Button>,
                <Button
                  key="export-json"
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => exportSessionAsJSON(session.id)}
                >
                  Export JSON
                </Button>,
                <Button
                  key="delete"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => deleteSessionWithConfirm(session.id)}
                >
                  Delete
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong>{session.title}</Text>
                    {session.id === activeSessionId && (
                      <Text type="success">(Active)</Text>
                    )}
                  </Space>
                }
                description={
                  <Space direction="vertical" size="small">
                    <Text type="secondary">
                      Model: {session.modelId || 'Not set'}
                    </Text>
                    <Text type="secondary">
                      Messages: {session.messages.length} | 
                      Tokens: {(session.totalTokens || 0).toLocaleString()} | 
                      Cost: ${(session.totalCost || 0).toFixed(6)}
                    </Text>
                    <Text type="secondary">
                      Created: {new Date(session.createdAt).toLocaleString()} | 
                      Updated: {new Date(session.updatedAt).toLocaleString()}
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

export default SessionManagementTest;