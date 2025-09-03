/**
 * Statistics Summary Cards
 * Displays key metrics in card format
 */

import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { 
  MessageOutlined, 
  DollarOutlined, 
  ClockCircleOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
  CreditCardOutlined
} from '@ant-design/icons';
import './StatsSummaryCards.css';

interface StatsSummaryCardsProps {
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  totalSessions: number;
  averageResponseTime: number;
  averageTokensPerMessage: number;
  averageCostPerMessage: number;
}

export const StatsSummaryCards: React.FC<StatsSummaryCardsProps> = ({
  totalMessages,
  totalTokens,
  totalCost,
  totalSessions,
  averageResponseTime,
  averageTokensPerMessage,
  averageCostPerMessage,
}) => {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(4)}`;
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) {
      return `${Math.round(ms)}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="stats-summary-cards">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="summary-card messages-card">
            <Statistic
              title="Total Messages"
              value={totalMessages}
              formatter={(value) => formatNumber(Number(value))}
              prefix={<MessageOutlined />}
              valueStyle={{ color: 'var(--accent-primary)' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="summary-card sessions-card">
            <Statistic
              title="Total Sessions"
              value={totalSessions}
              formatter={(value) => formatNumber(Number(value))}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: 'var(--accent-success)' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="summary-card tokens-card">
            <Statistic
              title="Total Tokens"
              value={totalTokens}
              formatter={(value) => formatNumber(Number(value))}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: 'var(--accent-warning)' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="summary-card cost-card">
            <Statistic
              title="Total Cost"
              value={totalCost}
              formatter={(value) => formatCurrency(Number(value))}
              prefix={<DollarOutlined />}
              valueStyle={{ color: 'var(--accent-error)' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={8}>
          <Card className="summary-card avg-card">
            <Statistic
              title="Avg Response Time"
              value={averageResponseTime}
              formatter={(value) => formatTime(Number(value))}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: 'var(--text-primary)' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card className="summary-card avg-card">
            <Statistic
              title="Avg Tokens/Message"
              value={averageTokensPerMessage}
              precision={0}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: 'var(--text-primary)' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card className="summary-card avg-card">
            <Statistic
              title="Avg Cost/Message"
              value={averageCostPerMessage}
              formatter={(value) => formatCurrency(Number(value))}
              prefix={<CreditCardOutlined />}
              valueStyle={{ color: 'var(--text-primary)' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};