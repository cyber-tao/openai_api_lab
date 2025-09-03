/**
 * Chat Stats Component
 * Displays real-time statistics for the current chat session
 */

import React from 'react';
import { Card, Statistic, Space, Typography, Progress, Tag, Spin, Alert, Button } from 'antd';
import {
  MessageOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileOutlined,
  BarChartOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useChatStore } from '../../stores/chatStore';
import { useConfigStore } from '../../stores/configStore';
import { useRealTimeStats } from '../../hooks/useRealTimeStats';
import './ChatStats.css';

const { Title, Text } = Typography;

interface ChatStatsProps {
  sessionId: string | null;
  className?: string;
}

export const ChatStats: React.FC<ChatStatsProps> = ({
  className,
}) => {
  const { getActiveSession } = useChatStore();
  const { configs } = useConfigStore();
  
  // Get session data
  const session = getActiveSession();
  
  // Get real-time statistics
  const {
    stats,
    loading,
    error,
    refresh,
    formatCurrency,
    formatTime,
    formatNumber,
    lastUpdated,
  } = useRealTimeStats({
    sessionId: session?.id,
    autoRefresh: true,
    refreshInterval: 3000, // 3 seconds for chat stats
  });

  // Get current session statistics
  const sessionStats = stats?.current;

  // Get current model info
  const currentConfig = configs.find(c => c.id === session?.apiConfigId);

  // Show loading state
  if (loading && !sessionStats) {
    return (
      <div className={`chat-stats loading ${className || ''}`}>
        <Card>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Spin size="large" />
            <Title level={4} type="secondary">Loading Statistics</Title>
          </div>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`chat-stats error ${className || ''}`}>
        <Card>
          <Alert
            message="Failed to load statistics"
            description={error}
            type="error"
            showIcon
            action={
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={refresh}
              >
                Retry
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={`chat-stats empty ${className || ''}`}>
        <Card>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <BarChartOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
            <Title level={4} type="secondary">No Active Session</Title>
            <Text type="secondary">
              Start a chat session to see statistics
            </Text>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`chat-stats ${className || ''}`}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* Session Info */}
        <Card size="small" className="stats-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Title level={5}>Current Session</Title>
            {lastUpdated && (
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined />}
                onClick={refresh}
                title="Refresh statistics"
              />
            )}
          </div>
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <div className="stat-row">
              <Text strong>Model:</Text>
              <Tag color="blue">{session.modelId || 'Not configured'}</Tag>
            </div>
            
            {currentConfig && (
              <div className="stat-row">
                <Text strong>Endpoint:</Text>
                <Text type="secondary" ellipsis style={{ maxWidth: 200 }}>
                  {currentConfig.name}
                </Text>
              </div>
            )}
            
            <div className="stat-row">
              <Text strong>Created:</Text>
              <Text type="secondary">
                {new Date(session.createdAt).toLocaleDateString()}
              </Text>
            </div>

            {sessionStats?.errorCount && sessionStats.errorCount > 0 && (
              <div className="stat-row">
                <Text strong>Errors:</Text>
                <Tag color="red" icon={<ExclamationCircleOutlined />}>
                  {sessionStats.errorCount}
                </Tag>
              </div>
            )}
          </Space>
        </Card>

        {/* Message Statistics */}
        <Card size="small" className="stats-card">
          <Title level={5}>Messages</Title>
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <Statistic
              title="Total Messages"
              value={sessionStats?.messageCount || 0}
              prefix={<MessageOutlined />}
              valueStyle={{ fontSize: 16 }}
            />
            
            {sessionStats?.attachmentCount && sessionStats.attachmentCount > 0 && (
              <Statistic
                title="Attachments"
                value={sessionStats.attachmentCount}
                prefix={<FileOutlined />}
                valueStyle={{ fontSize: 14 }}
              />
            )}

            {sessionStats?.duration && sessionStats.duration > 0 && (
              <div className="stat-row">
                <Text type="secondary">Session duration:</Text>
                <Text type="secondary">{formatTime(sessionStats.duration)}</Text>
              </div>
            )}
          </Space>
        </Card>

        {/* Token Statistics */}
        {sessionStats?.totalTokens && sessionStats.totalTokens.total > 0 && (
          <Card size="small" className="stats-card">
            <Title level={5}>Token Usage</Title>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Statistic
                title="Total Tokens"
                value={formatNumber(sessionStats.totalTokens.total)}
                valueStyle={{ fontSize: 16 }}
              />
              
              <div className="token-breakdown">
                <div className="stat-row">
                  <Text>Input:</Text>
                  <Text strong>{formatNumber(sessionStats.totalTokens.input)}</Text>
                </div>
                <div className="stat-row">
                  <Text>Output:</Text>
                  <Text strong>{formatNumber(sessionStats.totalTokens.output)}</Text>
                </div>
              </div>

              {sessionStats && sessionStats.messageCount > 0 && (
                <div className="stat-row">
                  <Text type="secondary">Avg per message:</Text>
                  <Text type="secondary">
                    {formatNumber(sessionStats.totalTokens.total / sessionStats.messageCount, 1)}
                  </Text>
                </div>
              )}
            </Space>
          </Card>
        )}

        {/* Cost Statistics */}
        {sessionStats?.totalCost && sessionStats.totalCost > 0 && (
          <Card size="small" className="stats-card">
            <Title level={5}>Cost Analysis</Title>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Statistic
                title="Total Cost"
                value={formatCurrency(sessionStats.totalCost)}
                prefix={<DollarOutlined />}
                valueStyle={{ fontSize: 16, color: '#52c41a' }}
              />
              
              {sessionStats && sessionStats.messageCount > 0 && (
                <div className="stat-row">
                  <Text type="secondary">Avg per message:</Text>
                  <Text type="secondary">
                    {formatCurrency(sessionStats.totalCost / sessionStats.messageCount)}
                  </Text>
                </div>
              )}
            </Space>
          </Card>
        )}

        {/* Performance Statistics */}
        {sessionStats?.averageResponseTime && sessionStats.averageResponseTime > 0 && (
          <Card size="small" className="stats-card">
            <Title level={5}>Performance</Title>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Statistic
                title="Avg Response Time"
                value={formatTime(sessionStats.averageResponseTime)}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ fontSize: 16 }}
              />
              
              {sessionStats && sessionStats.totalTokens.output > 0 && sessionStats.averageResponseTime > 0 && (
                <div className="stat-row">
                  <Text type="secondary">Tokens/second:</Text>
                  <Text type="secondary">
                    {formatNumber(sessionStats.totalTokens.output / (sessionStats.averageResponseTime / 1000), 1)}
                  </Text>
                </div>
              )}
            </Space>
          </Card>
        )}

        {/* Session Progress */}
        {sessionStats?.messageCount && sessionStats.messageCount > 0 && (
          <Card size="small" className="stats-card">
            <Title level={5}>Session Activity</Title>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <div className="activity-indicator">
                <Text type="secondary">Messages exchanged</Text>
                <Progress
                  percent={Math.min((sessionStats.messageCount / 50) * 100, 100)}
                  showInfo={false}
                  strokeColor="#1890ff"
                  size="small"
                />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {sessionStats.messageCount}/50 messages
                </Text>
              </div>
              
              {sessionStats && sessionStats.totalCost > 0 && (
                <div className="activity-indicator">
                  <Text type="secondary">Cost accumulation</Text>
                  <Progress
                    percent={Math.min((sessionStats.totalCost / 1) * 100, 100)}
                    showInfo={false}
                    strokeColor="#52c41a"
                    size="small"
                  />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {formatCurrency(sessionStats.totalCost)} spent
                  </Text>
                </div>
              )}
            </Space>
          </Card>
        )}

        {/* Quick Actions */}
        <Card size="small" className="stats-card">
          <Title level={5}>Quick Info</Title>
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <div className="stat-row">
              <Text type="secondary">Session ID:</Text>
              <Text code style={{ fontSize: 10 }}>
                {session.id.slice(-8)}
              </Text>
            </div>
            
            <div className="stat-row">
              <Text type="secondary">Last updated:</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {new Date(session.updatedAt).toLocaleTimeString()}
              </Text>
            </div>

            {lastUpdated && (
              <div className="stat-row">
                <Text type="secondary">Stats updated:</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {new Date(lastUpdated).toLocaleTimeString()}
                </Text>
              </div>
            )}
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default ChatStats;