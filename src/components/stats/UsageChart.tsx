/**
 * Usage Chart Component
 * Displays usage trends over time
 */

import React from 'react';
import { Spin } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TimeSeriesData } from '../../types';
import './UsageChart.css';

interface UsageChartProps {
  data: TimeSeriesData[];
  period: 'daily' | 'weekly' | 'monthly';
  loading?: boolean;
}

export const UsageChart: React.FC<UsageChartProps> = ({
  data,
  period,
  loading = false,
}) => {
  const formatXAxisLabel = (value: string) => {
    const date = new Date(value);
    
    switch (period) {
      case 'daily':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'weekly':
        return `Week ${Math.ceil(date.getDate() / 7)}`;
      case 'monthly':
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      default:
        return value;
    }
  };

  const formatTooltipLabel = (value: string) => {
    const date = new Date(value);
    
    switch (period) {
      case 'daily':
        return date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      case 'weekly':
        return `Week of ${date.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })}`;
      case 'monthly':
        return date.toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric' 
        });
      default:
        return value;
    }
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  if (loading) {
    return (
      <div className="chart-container">
        <div className="chart-loading">
          <Spin size="large" />
          <span>Loading usage data...</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-empty">
          <BarChartOutlined />
          <span>No usage data available</span>
          <small>Start using the API to see usage trends</small>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = data.map(item => ({
    date: item.date,
    messages: item.messages,
    tokens: item.tokens,
    sessions: item.sessions,
  }));

  return (
    <div className="usage-chart">
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatXAxisLabel}
              stroke="var(--text-secondary)"
              fontSize={12}
            />
            <YAxis 
              tickFormatter={formatNumber}
              stroke="var(--text-secondary)"
              fontSize={12}
            />
            <Tooltip
              labelFormatter={formatTooltipLabel}
              formatter={(value: number, name: string) => [
                formatNumber(value),
                name.charAt(0).toUpperCase() + name.slice(1)
              ]}
              contentStyle={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
              }}
            />
            <Legend 
              wrapperStyle={{ color: 'var(--text-primary)' }}
            />
            <Line
              type="monotone"
              dataKey="messages"
              stroke="var(--accent-primary)"
              strokeWidth={2}
              dot={{ fill: 'var(--accent-primary)', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: 'var(--accent-primary)', strokeWidth: 2 }}
              name="Messages"
            />
            <Line
              type="monotone"
              dataKey="tokens"
              stroke="var(--accent-warning)"
              strokeWidth={2}
              dot={{ fill: 'var(--accent-warning)', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: 'var(--accent-warning)', strokeWidth: 2 }}
              name="Tokens"
            />
            <Line
              type="monotone"
              dataKey="sessions"
              stroke="var(--accent-success)"
              strokeWidth={2}
              dot={{ fill: 'var(--accent-success)', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: 'var(--accent-success)', strokeWidth: 2 }}
              name="Sessions"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};