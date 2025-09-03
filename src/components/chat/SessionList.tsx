/**
 * Session List Component
 * Displays and manages chat sessions with search and organization
 */

import React, { useState, useMemo } from 'react';
import { 
  List, 
  Input, 
  Button, 
  Dropdown, 
  Typography, 
  Space, 
  Tag, 
  Tooltip,
  Empty,
  Spin,
  Select,
  Modal,
  message
} from 'antd';
import {
  MoreOutlined,
  DeleteOutlined,
  CopyOutlined,
  EditOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  ExportOutlined,
  DownloadOutlined,
  SortAscendingOutlined,
  FilterOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useChatStore } from '../../stores/chatStore';
import type { ChatSession } from '../../types/chat';
import { ExportService } from '../../services/exportService';
import './SessionList.css';

const { Text } = Typography;
const { Search } = Input;

interface SessionListProps {
  onSessionSelect: (sessionId: string) => void;
  onSessionDelete: (sessionId: string) => void;
  activeSessionId: string | null;
  className?: string;
}

type SortOption = 'updated' | 'created' | 'title' | 'messages' | 'cost';
type FilterOption = 'all' | 'recent' | 'withMessages' | 'expensive';

export const SessionList: React.FC<SessionListProps> = ({
  onSessionSelect,
  onSessionDelete,
  activeSessionId,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);

  const {
    sessions,
    updateSession,
    duplicateSession,
    loading,
  } = useChatStore();

  // Filter and sort sessions
  const filteredAndSortedSessions = useMemo(() => {
    let filtered = sessions;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(session =>
        session.title.toLowerCase().includes(query) ||
        session.modelId.toLowerCase().includes(query) ||
        session.messages.some(msg => 
          msg.content.toLowerCase().includes(query)
        )
      );
    }

    // Apply category filter
    switch (filterBy) {
      case 'recent':
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        filtered = filtered.filter(session => session.updatedAt > weekAgo);
        break;
      case 'withMessages':
        filtered = filtered.filter(session => session.messages.length > 0);
        break;
      case 'expensive':
        filtered = filtered.filter(session => (session.totalCost || 0) > 0.01);
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'created':
          return b.createdAt - a.createdAt;
        case 'title':
          return a.title.localeCompare(b.title);
        case 'messages':
          return b.messages.length - a.messages.length;
        case 'cost':
          return (b.totalCost || 0) - (a.totalCost || 0);
        case 'updated':
        default:
          return b.updatedAt - a.updatedAt;
      }
    });

    return sorted;
  }, [sessions, searchQuery, sortBy, filterBy]);

  // Handle session title editing
  const handleEditStart = (session: ChatSession) => {
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const handleEditSave = () => {
    if (editingSessionId && editingTitle.trim()) {
      updateSession(editingSessionId, { title: editingTitle.trim() });
    }
    setEditingSessionId(null);
    setEditingTitle('');
  };

  const handleEditCancel = () => {
    setEditingSessionId(null);
    setEditingTitle('');
  };

  // Handle session duplication
  const handleDuplicate = (sessionId: string) => {
    const newSessionId = duplicateSession(sessionId);
    if (newSessionId) {
      onSessionSelect(newSessionId);
      message.success('Session duplicated successfully');
    }
  };

  // Handle single session export
  const handleExportSession = (sessionId: string, format: 'markdown' | 'json' = 'markdown') => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      message.error('Session not found');
      return;
    }

    try {
      if (format === 'markdown') {
        ExportService.exportSessionToFile(session, {
          includeMetadata: true,
          includeStatistics: true,
          includeTimestamps: true,
        });
      } else {
        ExportService.exportSessionAsJSON(session);
      }
      message.success(`Session exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      message.error('Failed to export session');
    }
  };

  // Handle bulk export
  const handleBulkExport = (format: 'markdown' | 'json' = 'markdown') => {
    const sessionsToExport = selectedSessions.length > 0 
      ? sessions.filter(s => selectedSessions.includes(s.id))
      : filteredAndSortedSessions;

    if (sessionsToExport.length === 0) {
      message.warning('No sessions to export');
      return;
    }

    try {
      if (format === 'markdown') {
        ExportService.exportSessionsToFile(sessionsToExport, 'chat-sessions.md', {
          includeMetadata: true,
          includeStatistics: true,
          includeTimestamps: true,
        });
      } else {
        ExportService.exportSessionsAsJSON(sessionsToExport);
      }
      message.success(`${sessionsToExport.length} session${sessionsToExport.length !== 1 ? 's' : ''} exported as ${format.toUpperCase()}`);
      setExportModalVisible(false);
      setSelectedSessions([]);
    } catch (error) {
      console.error('Bulk export failed:', error);
      message.error('Failed to export sessions');
    }
  };

  // Format relative time
  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  };

  // Create dropdown menu for session actions
  const createSessionMenu = (session: ChatSession): MenuProps => ({
    items: [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Rename',
        onClick: () => handleEditStart(session),
      },
      {
        key: 'duplicate',
        icon: <CopyOutlined />,
        label: 'Duplicate',
        onClick: () => handleDuplicate(session.id),
      },
      {
        type: 'divider',
      },
      {
        key: 'export',
        icon: <ExportOutlined />,
        label: 'Export',
        children: [
          {
            key: 'export-markdown',
            label: 'Export as Markdown',
            onClick: () => handleExportSession(session.id, 'markdown'),
          },
          {
            key: 'export-json',
            label: 'Export as JSON',
            onClick: () => handleExportSession(session.id, 'json'),
          },
        ],
      },
      {
        type: 'divider',
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: 'Delete',
        danger: true,
        onClick: () => onSessionDelete(session.id),
      },
    ],
  });

  // Render session item
  const renderSessionItem = (session: ChatSession) => {
    const isActive = session.id === activeSessionId;
    const isEditing = editingSessionId === session.id;

    return (
      <List.Item
        key={session.id}
        className={`session-item ${isActive ? 'active' : ''}`}
        onClick={() => !isEditing && onSessionSelect(session.id)}
      >
        <div className="session-content">
          <div className="session-header">
            {isEditing ? (
              <Input
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onPressEnter={handleEditSave}
                onBlur={handleEditSave}
                onKeyDown={(e) => e.key === 'Escape' && handleEditCancel()}
                autoFocus
                size="small"
                className="session-title-input"
              />
            ) : (
              <div className="session-title">
                <Text strong={isActive} ellipsis={{ tooltip: session.title }}>
                  {session.title}
                </Text>
              </div>
            )}

            <Dropdown
              menu={createSessionMenu(session)}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button
                type="text"
                icon={<MoreOutlined />}
                size="small"
                className="session-menu-button"
                onClick={(e) => e.stopPropagation()}
              />
            </Dropdown>
          </div>

          <div className="session-meta">
            <Space size="small">
              <Tooltip title="Message count">
                <Space size={4}>
                  <MessageOutlined style={{ fontSize: 12 }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {session.messageCount || session.messages.length}
                  </Text>
                </Space>
              </Tooltip>

              <Tooltip title="Last updated">
                <Space size={4}>
                  <ClockCircleOutlined style={{ fontSize: 12 }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {formatRelativeTime(session.updatedAt)}
                  </Text>
                </Space>
              </Tooltip>
            </Space>
          </div>

          <div className="session-info">
            {session.modelId && (
              <Tag color="blue">
                {session.modelId}
              </Tag>
            )}
            
            {session.totalCost > 0 && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                ${session.totalCost.toFixed(4)}
              </Text>
            )}
          </div>

          {/* Preview of last message */}
          {session.messages.length > 0 && (
            <div className="session-preview">
              <Text type="secondary" ellipsis={{ tooltip: session.messages[session.messages.length - 1].content }}>
                {session.messages[session.messages.length - 1].content}
              </Text>
            </div>
          )}
        </div>
      </List.Item>
    );
  };

  if (loading.sessions) {
    return (
      <div className="session-list-loading">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={`session-list ${className || ''}`}>
      {/* Search and Controls */}
      <div className="session-controls">
        <Search
          placeholder="Search sessions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
          size="small"
          style={{ marginBottom: 8 }}
        />
        
        <Space size="small" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space size="small">
            <Select
              value={sortBy}
              onChange={setSortBy}
              size="small"
              style={{ width: 100 }}
              suffixIcon={<SortAscendingOutlined />}
            >
              <Select.Option value="updated">Recent</Select.Option>
              <Select.Option value="created">Created</Select.Option>
              <Select.Option value="title">Title</Select.Option>
              <Select.Option value="messages">Messages</Select.Option>
              <Select.Option value="cost">Cost</Select.Option>
            </Select>
            
            <Select
              value={filterBy}
              onChange={setFilterBy}
              size="small"
              style={{ width: 90 }}
              suffixIcon={<FilterOutlined />}
            >
              <Select.Option value="all">All</Select.Option>
              <Select.Option value="recent">Recent</Select.Option>
              <Select.Option value="withMessages">Active</Select.Option>
              <Select.Option value="expensive">Costly</Select.Option>
            </Select>
          </Space>
          
          <Tooltip title="Export Sessions">
            <Button
              icon={<DownloadOutlined />}
              size="small"
              onClick={() => setExportModalVisible(true)}
              disabled={sessions.length === 0}
            />
          </Tooltip>
        </Space>
      </div>

      {/* Session List */}
      <div className="session-list-container">
        {filteredAndSortedSessions.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              searchQuery || filterBy !== 'all'
                ? "No sessions match your criteria"
                : "No chat sessions yet"
            }
            style={{ padding: '40px 20px' }}
          />
        ) : (
          <List
            dataSource={filteredAndSortedSessions}
            renderItem={renderSessionItem}
            className="sessions"
            size="small"
          />
        )}
      </div>

      {/* Quick Stats */}
      {sessions.length > 0 && (
        <div className="session-stats">
          <Space split={<span style={{ color: '#666' }}>•</span>} size="small">
            <Text type="secondary" style={{ fontSize: 12 }}>
              {filteredAndSortedSessions.length} of {sessions.length} sessions
            </Text>
            {sessions.reduce((sum, s) => sum + s.messages.length, 0) > 0 && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {sessions.reduce((sum, s) => sum + s.messages.length, 0)} messages
              </Text>
            )}
          </Space>
        </div>
      )}

      {/* Export Modal */}
      <Modal
        title="Export Sessions"
        open={exportModalVisible}
        onCancel={() => {
          setExportModalVisible(false);
          setSelectedSessions([]);
        }}
        footer={null}
        width={400}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>Export Options</Text>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Export {selectedSessions.length > 0 
                  ? `${selectedSessions.length} selected session${selectedSessions.length !== 1 ? 's' : ''}`
                  : `all ${filteredAndSortedSessions.length} session${filteredAndSortedSessions.length !== 1 ? 's' : ''}`
                }
              </Text>
            </div>
          </div>
          
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              type="primary"
              icon={<ExportOutlined />}
              onClick={() => handleBulkExport('markdown')}
              block
            >
              Export as Markdown
            </Button>
            
            <Button
              icon={<DownloadOutlined />}
              onClick={() => handleBulkExport('json')}
              block
            >
              Export as JSON
            </Button>
          </Space>
          
          <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Markdown format includes conversation history with formatting. 
              JSON format preserves all data for backup/import purposes.
            </Text>
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default SessionList;