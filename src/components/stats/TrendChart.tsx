/**
 * Trend Chart Component
 * Displays performance trends and metrics
 */

import React from 'react';
import { Spin } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar,
} from 'recharts';
import type { TimeSeriesData } from '../../types';
import './TrendChart.css';

interface TrendChartProps {
  data: TimeSeriesData[];
  period: 'daily' | 'weekly' | 'monthly';
  loading?: boolean;
}

export const TrendChart: React.FC<TrendChartProps> = ({
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

  const formatTime = (ms: number) => {
    if (ms < 1000) {
      return `${Math.round(ms)}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
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
          <span>Loading trend data...</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-empty">
          <LineChartOutlined />
          <span>No trend data available</span>
          <small>Start using the API to see performance trends</small>
        </div>
      </div>
    );
  }

  // Calculate tokens per message ratio
  const chartData = data.map(item => ({
    date: item.date,
    responseTime: item.averageResponseTime,
    tokensPerMessage: item.messages > 0 ? item.tokens / item.messages : 0,
    messagesPerSession: item.sessions > 0 ? item.messages / item.sessions : 0,
    efficiency: item.averageResponseTime > 0 ? (item.tokens / item.averageResponseTime) * 1000 : 0, // tokens per second
  }));

  return (
    <div className="trend-chart">
      <div className="trend-metrics">
        <div className="trend-metric">
          <span className="metric-label">Avg Response Time</span>
          <span className="metric-value">
            {data.length > 0 ? formatTime(
              data.reduce((sum, d) => sum + d.averageResponseTime, 0) / data.length
            ) : '0ms'}
          </span>
        </div>
        <div className="trend-metric">
          <span className="metric-label">Avg Tokens/Message</span>
          <span className="metric-value">
            {data.length > 0 ? Math.round(
              data.reduce((sum, d) => sum + (d.messages > 0 ? d.tokens / d.messages : 0), 0) / data.length
            ) : 0}
          </span>
        </div>
        <div className="trend-metric">
          <span className="metric-label">Avg Messages/Session</span>
          <span className="metric-value">
            {data.length > 0 ? Math.round(
              data.reduce((sum, d) => sum + (d.sessions > 0 ? d.messages / d.sessions : 0), 0) / data.length
            ) : 0}
          </span>
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatXAxisLabel}
              stroke="var(--text-secondary)"
              fontSize={12}
            />
            <YAxis 
              yAxisId="time"
              orientation="left"
              tickFormatter={formatTime}
              stroke="var(--text-secondary)"
              fontSize={12}
            />
            <YAxis 
              yAxisId="count"
              orientation="right"
              tickFormatter={formatNumber}
              stroke="var(--text-secondary)"
              fontSize={12}
            />
            <Tooltip
              labelFormatter={formatTooltipLabel}
              formatter={(value: number, name: string) => {
                switch (name) {
                  case 'responseTime':
                    return [formatTime(value), 'Response Time'];
                  case 'tokensPerMessage':
                    return [Math.round(value), 'Tokens/Message'];
                  case 'messagesPerSession':
                    return [Math.round(value), 'Messages/Session'];
                  case 'efficiency':
                    return [Math.round(value), 'Tokens/Second'];
                  default:
                    return [value, name];
                }
              }}
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
            
            {/* Response Time Line */}
            <Line
              yAxisId="time"
              type="monotone"
              dataKey="responseTime"
              stroke="var(--accent-error)"
              strokeWidth={2}
              dot={{ fill: 'var(--accent-error)', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, stroke: 'var(--accent-error)', strokeWidth: 2 }}
              name="Response Time"
            />
            
            {/* Tokens per Message Bar */}
            <Bar
              yAxisId="count"
              dataKey="tokensPerMessage"
              fill="var(--accent-warning)"
              fillOpacity={0.6}
              name="Tokens/Message"
            />
            
            {/* Messages per Session Line */}
            <Line
              yAxisId="count"
              type="monotone"
              dataKey="messagesPerSession"
              stroke="var(--accent-success)"
              strokeWidth={2}
              dot={{ fill: 'var(--accent-success)', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, stroke: 'var(--accent-success)', strokeWidth: 2 }}
              name="Messages/Session"
            />
            
            {/* Efficiency Line */}
            <Line
              yAxisId="count"
              type="monotone"
              dataKey="efficiency"
              stroke="var(--accent-primary)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: 'var(--accent-primary)', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, stroke: 'var(--accent-primary)', strokeWidth: 2 }}
              name="Efficiency (Tokens/s)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};