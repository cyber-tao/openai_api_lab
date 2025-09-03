/**
 * Top Models Table Component
 * Displays detailed model usage statistics in table format
 */

import React from 'react';
import { Table, Tag, Progress, Tooltip } from 'antd';
import { RobotOutlined, ClockCircleOutlined, DollarOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ModelInfo, ModelUsage } from '../../types';
import './TopModelsTable.css';

interface TopModelsTableProps {
  topModels: Array<{ modelId: string; usage: ModelUsage }>;
  models: ModelInfo[];
  loading?: boolean;
}

interface TableDataType {
  key: string;
  modelId: string;
  modelName: string;
  modelType: string;
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
  firstUsed: number;
  lastUsed: number;
  costPercentage: number;
  messagePercentage: number;
}

export const TopModelsTable: React.FC<TopModelsTableProps> = ({
  topModels,
  models,
  loading = false,
}) => {
  const getModelInfo = (modelId: string) => {
    return models.find(m => m.id === modelId);
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

  const formatTime = (ms: number) => {
    if (ms < 1000) {
      return `${Math.round(ms)}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate percentages
  const totalCost = topModels.reduce((sum, { usage }) => sum + usage.totalCost, 0);
  const totalMessages = topModels.reduce((sum, { usage }) => sum + usage.totalMessages, 0);

  // Prepare table data
  const tableData: TableDataType[] = topModels.map(({ modelId, usage }) => {
    const modelInfo = getModelInfo(modelId);
    
    return {
      key: modelId,
      modelId,
      modelName: modelInfo?.name || modelId,
      modelType: modelInfo?.type || 'unknown',
      totalMessages: usage.totalMessages,
      totalTokens: usage.totalTokens,
      totalCost: usage.totalCost,
      averageResponseTime: usage.averageResponseTime,
      firstUsed: usage.firstUsed,
      lastUsed: usage.lastUsed,
      costPercentage: totalCost > 0 ? (usage.totalCost / totalCost) * 100 : 0,
      messagePercentage: totalMessages > 0 ? (usage.totalMessages / totalMessages) * 100 : 0,
    };
  });

  const columns: ColumnsType<TableDataType> = [
    {
      title: 'Model',
      dataIndex: 'modelName',
      key: 'modelName',
      width: 200,
      fixed: 'left',
      render: (name: string, record: TableDataType) => (
        <div className="model-cell">
          <div className="model-name">
            <RobotOutlined />
            <span>{name}</span>
          </div>
          <div className="model-type">
            <Tag color={
              record.modelType === 'multimodal' ? 'purple' :
              record.modelType === 'text' ? 'blue' :
              record.modelType === 'embedding' ? 'green' : 'default'
            }>
              {record.modelType}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: 'Messages',
      dataIndex: 'totalMessages',
      key: 'totalMessages',
      width: 120,
      sorter: (a, b) => a.totalMessages - b.totalMessages,
      render: (value: number, record: TableDataType) => (
        <div className="metric-cell">
          <div className="metric-value">{formatNumber(value)}</div>
          <Progress
            percent={record.messagePercentage}
            showInfo={false}
            size="small"
            strokeColor="var(--accent-primary)"
          />
        </div>
      ),
    },
    {
      title: 'Tokens',
      dataIndex: 'totalTokens',
      key: 'totalTokens',
      width: 120,
      sorter: (a, b) => a.totalTokens - b.totalTokens,
      render: (value: number) => (
        <div className="metric-value">{formatNumber(value)}</div>
      ),
    },
    {
      title: 'Cost',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 120,
      sorter: (a, b) => a.totalCost - b.totalCost,
      render: (value: number, record: TableDataType) => (
        <div className="metric-cell">
          <div className="metric-value cost-value">
            <DollarOutlined />
            {formatCurrency(value)}
          </div>
          <Progress
            percent={record.costPercentage}
            showInfo={false}
            size="small"
            strokeColor="var(--accent-error)"
          />
        </div>
      ),
    },
    {
      title: 'Avg Response',
      dataIndex: 'averageResponseTime',
      key: 'averageResponseTime',
      width: 120,
      sorter: (a, b) => a.averageResponseTime - b.averageResponseTime,
      render: (value: number) => (
        <div className="metric-value response-time">
          <ClockCircleOutlined />
          {formatTime(value)}
        </div>
      ),
    },
    {
      title: 'Usage Period',
      key: 'usagePeriod',
      width: 150,
      render: (_, record: TableDataType) => (
        <div className="usage-period">
          <Tooltip title={`First used: ${new Date(record.firstUsed).toLocaleString()}`}>
            <div className="period-date">From: {formatDate(record.firstUsed)}</div>
          </Tooltip>
          <Tooltip title={`Last used: ${new Date(record.lastUsed).toLocaleString()}`}>
            <div className="period-date">To: {formatDate(record.lastUsed)}</div>
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'Efficiency',
      key: 'efficiency',
      width: 100,
      sorter: (a, b) => {
        const effA = a.averageResponseTime > 0 ? a.totalTokens / a.averageResponseTime : 0;
        const effB = b.averageResponseTime > 0 ? b.totalTokens / b.averageResponseTime : 0;
        return effA - effB;
      },
      render: (_, record: TableDataType) => {
        const efficiency = record.averageResponseTime > 0 
          ? (record.totalTokens / record.averageResponseTime) * 1000 
          : 0;
        
        return (
          <Tooltip title="Tokens per second">
            <div className="efficiency-value">
              {Math.round(efficiency)}
            </div>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <div className="top-models-table">
      <Table<TableDataType>
        columns={columns}
        dataSource={tableData}
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} models`,
        }}
        scroll={{ x: 800 }}
        size="middle"
        className="models-table"
      />
    </div>
  );
};