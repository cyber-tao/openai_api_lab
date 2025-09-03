/**
 * Message Search Component
 * Provides search functionality within chat sessions
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Input, 
  Button, 
  Space, 
  Typography, 
  Card, 
  List, 
  Tag, 

  Empty,
  Divider
} from 'antd';
import {
  SearchOutlined,
  CloseOutlined,
  UpOutlined,
  DownOutlined,
  UserOutlined,
  RobotOutlined,
  SettingOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { useChatStore } from '../../stores/chatStore';
import type { ChatMessage } from '../../types/chat';
import './MessageSearch.css';

const { Text } = Typography;
const { Search } = Input;

interface MessageSearchProps {
  visible: boolean;
  onClose: () => void;
  onMessageSelect: (messageId: string) => void;
  className?: string;
}

interface SearchResult {
  message: ChatMessage;
  matchedText: string;
  matchIndex: number;
  contextBefore: string;
  contextAfter: string;
}

export const MessageSearch: React.FC<MessageSearchProps> = ({
  visible,
  onClose,
  onMessageSelect,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [searchInRole, setSearchInRole] = useState<'all' | 'user' | 'assistant' | 'system'>('all');

  const { messages, getActiveSession } = useChatStore();

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = caseSensitive ? searchQuery : searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    messages.forEach(message => {
      // Filter by role if specified
      if (searchInRole !== 'all' && message.role !== searchInRole) {
        return;
      }

      const content = caseSensitive ? message.content : message.content.toLowerCase();
      const queryIndex = content.indexOf(query);

      if (queryIndex !== -1) {
        // Extract context around the match
        const contextLength = 50;
        const start = Math.max(0, queryIndex - contextLength);
        const end = Math.min(content.length, queryIndex + query.length + contextLength);
        
        const contextBefore = message.content.slice(start, queryIndex);
        const matchedText = message.content.slice(queryIndex, queryIndex + query.length);
        const contextAfter = message.content.slice(queryIndex + query.length, end);

        results.push({
          message,
          matchedText,
          matchIndex: queryIndex,
          contextBefore: start > 0 ? '...' + contextBefore : contextBefore,
          contextAfter: end < message.content.length ? contextAfter + '...' : contextAfter,
        });
      }
    });

    return results;
  }, [searchQuery, messages, caseSensitive, searchInRole]);

  // Reset current index when search results change
  useEffect(() => {
    setCurrentResultIndex(0);
  }, [searchResults]);

  // Handle search input
  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  // Navigate to previous result
  const handlePreviousResult = () => {
    if (searchResults.length > 0) {
      const newIndex = currentResultIndex > 0 ? currentResultIndex - 1 : searchResults.length - 1;
      setCurrentResultIndex(newIndex);
      onMessageSelect(searchResults[newIndex].message.id);
    }
  };

  // Navigate to next result
  const handleNextResult = () => {
    if (searchResults.length > 0) {
      const newIndex = currentResultIndex < searchResults.length - 1 ? currentResultIndex + 1 : 0;
      setCurrentResultIndex(newIndex);
      onMessageSelect(searchResults[newIndex].message.id);
    }
  };

  // Handle result click
  const handleResultClick = (result: SearchResult, index: number) => {
    setCurrentResultIndex(index);
    onMessageSelect(result.message.id);
  };

  // Get role icon
  const getRoleIcon = (role: ChatMessage['role']) => {
    switch (role) {
      case 'user':
        return <UserOutlined style={{ color: '#1890ff' }} />;
      case 'assistant':
        return <RobotOutlined style={{ color: '#52c41a' }} />;
      case 'system':
        return <SettingOutlined style={{ color: '#faad14' }} />;
      default:
        return <UserOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Highlight search query in text
  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, caseSensitive ? 'g' : 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      const isMatch = regex.test(part);
      return isMatch ? (
        <mark key={index} className="search-highlight">
          {part}
        </mark>
      ) : (
        part
      );
    });
  };

  const activeSession = getActiveSession();

  if (!visible) return null;

  return (
    <Card 
      className={`message-search ${className || ''}`}
      title={
        <Space>
          <SearchOutlined />
          <span>Search Messages</span>
          {activeSession && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              in "{activeSession.title}"
            </Text>
          )}
        </Space>
      }
      extra={
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
          size="small"
        />
      }
      size="small"
    >
      {/* Search Input */}
      <div className="search-input-section">
        <Search
          placeholder="Search in messages..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onSearch={handleSearch}
          allowClear
          size="small"
        />
        
        {/* Search Options */}
        <div className="search-options">
          <Space size="small" wrap>
            <Button
              type={caseSensitive ? 'primary' : 'default'}
              size="small"
              onClick={() => setCaseSensitive(!caseSensitive)}
            >
              Aa
            </Button>
            
            <Button
              type={searchInRole === 'user' ? 'primary' : 'default'}
              size="small"
              icon={<UserOutlined />}
              onClick={() => setSearchInRole(searchInRole === 'user' ? 'all' : 'user')}
            >
              User
            </Button>
            
            <Button
              type={searchInRole === 'assistant' ? 'primary' : 'default'}
              size="small"
              icon={<RobotOutlined />}
              onClick={() => setSearchInRole(searchInRole === 'assistant' ? 'all' : 'assistant')}
            >
              AI
            </Button>
          </Space>
        </div>
      </div>

      {/* Search Results Summary */}
      {searchQuery && (
        <div className="search-summary">
          <Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </Text>
            
            {searchResults.length > 0 && (
              <>
                <Divider type="vertical" />
                <Space size="small">
                  <Button
                    type="text"
                    icon={<UpOutlined />}
                    size="small"
                    onClick={handlePreviousResult}
                    disabled={searchResults.length === 0}
                  />
                  <Text style={{ fontSize: 12 }}>
                    {currentResultIndex + 1} / {searchResults.length}
                  </Text>
                  <Button
                    type="text"
                    icon={<DownOutlined />}
                    size="small"
                    onClick={handleNextResult}
                    disabled={searchResults.length === 0}
                  />
                </Space>
              </>
            )}
          </Space>
        </div>
      )}

      {/* Search Results */}
      <div className="search-results">
        {!searchQuery ? (
          <div className="search-placeholder">
            <Text type="secondary">
              Enter a search term to find messages in this conversation
            </Text>
          </div>
        ) : searchResults.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No messages found"
            style={{ padding: '20px 0' }}
          />
        ) : (
          <List
            dataSource={searchResults}
            renderItem={(result, index) => (
              <List.Item
                key={result.message.id}
                className={`search-result-item ${index === currentResultIndex ? 'active' : ''}`}
                onClick={() => handleResultClick(result, index)}
              >
                <div className="search-result-content">
                  <div className="search-result-header">
                    <Space size="small">
                      {getRoleIcon(result.message.role)}
                      <Text strong style={{ fontSize: 12 }}>
                        {result.message.role.charAt(0).toUpperCase() + result.message.role.slice(1)}
                      </Text>
                      <CalendarOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
                      <Text type="secondary" style={{ fontSize: 10 }}>
                        {formatTimestamp(result.message.timestamp)}
                      </Text>
                    </Space>
                  </div>
                  
                  <div className="search-result-text">
                    <Text style={{ fontSize: 12 }}>
                      {highlightText(result.contextBefore, '')}
                      {highlightText(result.matchedText, searchQuery)}
                      {highlightText(result.contextAfter, '')}
                    </Text>
                  </div>
                  
                  {result.message.tokens && (
                    <div className="search-result-meta">
                      <Tag color="blue">
                        {result.message.tokens.total} tokens
                      </Tag>
                    </div>
                  )}
                </div>
              </List.Item>
            )}
            size="small"
          />
        )}
      </div>
    </Card>
  );
};

export default MessageSearch;