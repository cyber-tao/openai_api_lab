/**
 * Cost Analysis Chart Component
 * Displays cost trends and analysis
 */

import React from 'react';
import { Spin } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { TimeSeriesData, CostAnalysis } from '../../types';
import './CostAnalysisChart.css';

interface CostAnalysisChartProps {
  data: TimeSeriesData[];
  costAnalysis: CostAnalysis;
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

export const CostAnalysisChart: React.FC<CostAnalysisChartProps> = ({
  data,
  costAnalysis,
  loading = false,
}) => {
  const formatXAxisLabel = (value: string) => {
    const date = new Date(value);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTooltipLabel = (value: string) => {
    const date = new Date(value);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(4)}`;
  };

  if (loading) {
    return (
      <div className="chart-container">
        <div className="chart-loading">
          <Spin size="large" />
          <span>Loading cost data...</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-empty">
          <DollarOutlined />
          <span>No cost data available</span>
          <small>Start using the API to see cost trends</small>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = data.map(item => ({
    date: item.date,
    cost: item.cost,
    cumulativeCost: data
      .slice(0, data.indexOf(item) + 1)
      .reduce((sum, d) => sum + d.cost, 0),
  }));

  // Prepare pie chart data for cost distribution
  const pieData = costAnalysis.costDistribution
    .slice(0, 8) // Show top 8 models
    .map(item => ({
      name: item.modelId,
      value: item.cost,
      percentage: item.percentage,
    }));

  return (
    <div className="cost-analysis-chart">
      <div className="cost-summary">
        <div className="cost-metric">
          <span className="cost-label">Total Cost</span>
          <span className="cost-value">{formatCurrency(costAnalysis.totalCost)}</span>
        </div>
        <div className="cost-metric">
          <span className="cost-label">Daily Average</span>
          <span className="cost-value">{formatCurrency(costAnalysis.averageDailyCost)}</span>
        </div>
        <div className="cost-metric">
          <span className="cost-label">Trend</span>
          <span className={`cost-value ${costAnalysis.trend >= 0 ? 'positive' : 'negative'}`}>
            {costAnalysis.trend >= 0 ? '+' : ''}{costAnalysis.trend.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-error)" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="var(--accent-error)" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatXAxisLabel}
              stroke="var(--text-secondary)"
              fontSize={12}
            />
            <YAxis 
              tickFormatter={formatCurrency}
              stroke="var(--text-secondary)"
              fontSize={12}
            />
            <Tooltip
              labelFormatter={formatTooltipLabel}
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'cost' ? 'Daily Cost' : 'Cumulative Cost'
              ]}
              contentStyle={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
              }}
            />
            <Area
              type="monotone"
              dataKey="cost"
              stroke="var(--accent-error)"
              fillOpacity={1}
              fill="url(#costGradient)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="cumulativeCost"
              stroke="var(--accent-primary)"
              fillOpacity={1}
              fill="url(#cumulativeGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {pieData.length > 0 && (
        <div className="cost-distribution">
          <h4>Cost Distribution by Model</h4>
          <div className="pie-chart-container">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
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
      )}
    </div>
  );
};