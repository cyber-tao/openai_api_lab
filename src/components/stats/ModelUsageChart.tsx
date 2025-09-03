/**
 * Model Usage Chart Component
 * Displays model usage distribution
 */

import React from 'react';
import { Spin } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { ModelInfo, ModelUsage } from '../../types';
import './ModelUsageChart.css';

interface ModelUsageChartProps {
  topModels: Array<{ modelId: string; usage: ModelUsage }>;
  models: ModelInfo[];
  loading?: boolean;
}

const COLORS = [
  'var(--accent-primary)',
  'var(--accent-success)',
  'var(--accent-warning)',
  'var(--accent-error)',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#00ff00',
  '#ff00ff',
];

export const ModelUsageChart: React.FC<ModelUsageChartProps> = ({
  topModels,
  models,
  loading = false,
}) => {
  const getModelName = (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    return model?.name || modelId;
  };

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(4)}`;
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
          <span>Loading model usage...</span>
        </div>
      </div>
    );
  }

  if (!topModels || topModels.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-empty">
          <RobotOutlined />
          <span>No model usage data</span>
          <small>Start using models to see usage distribution</small>
        </div>
      </div>
    );
  }

  // Prepare bar chart data
  const barData = topModels.slice(0, 8).map(({ modelId, usage }) => ({
    modelId: getModelName(modelId),
    messages: usage.totalMessages,
    tokens: usage.totalTokens,
    cost: usage.totalCost,
  }));

  // Prepare pie chart data
  const totalCost = topModels.reduce((sum, { usage }) => sum + usage.totalCost, 0);
  const pieData = topModels.slice(0, 6).map(({ modelId, usage }) => ({
    name: getModelName(modelId),
    value: usage.totalCost,
    percentage: (usage.totalCost / totalCost) * 100,
  }));

  return (
    <div className="model-usage-chart">
      <div className="chart-section">
        <h4>Messages by Model</h4>
        <div className="bar-chart-container">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
              <XAxis 
                dataKey="modelId" 
                stroke="var(--text-secondary)"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tickFormatter={formatNumber}
                stroke="var(--text-secondary)"
                fontSize={12}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === 'cost' ? formatCurrency(value) : formatNumber(value),
                  name === 'cost' ? 'Cost' : name.charAt(0).toUpperCase() + name.slice(1)
                ]}
                contentStyle={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                }}
              />
              <Bar 
                dataKey="messages" 
                fill="var(--accent-primary)"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-section">
        <h4>Cost Distribution</h4>
        <div className="pie-chart-container">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => 
                  percentage > 5 ? `${name}: ${percentage.toFixed(1)}%` : ''
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Cost']}
                contentStyle={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="model-stats">
        <div className="stats-grid">
          {topModels.slice(0, 4).map(({ modelId, usage }) => (
            <div key={modelId} className="model-stat">
              <div className="model-name">{getModelName(modelId)}</div>
              <div className="model-metrics">
                <span className="metric">
                  <span className="metric-value">{formatNumber(usage.totalMessages)}</span>
                  <span className="metric-label">messages</span>
                </span>
                <span className="metric">
                  <span className="metric-value">{formatCurrency(usage.totalCost)}</span>
                  <span className="metric-label">cost</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};