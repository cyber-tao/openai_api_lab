/**
 * Test Results Component
 * Displays detailed test results and analysis
 */

import React, { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Statistic,
  Tag,
  Tooltip,
  Select,
  DatePicker,
  Empty,
  Tabs,
} from 'antd';
import {
  BarChartOutlined,
  DownloadOutlined,
  ReloadOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useTestStore } from '../../stores/testStore';
import { useModelStore } from '../../stores/modelStore';
import type { TestResult } from '../../types/testing';
import type { ColumnsType } from 'antd/es/table';
import { formatNumber } from '../../utils/format';
import './TestResults.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

interface TestResultsProps {
  testId?: string;
  className?: string;
}

export const TestResults: React.FC<TestResultsProps> = ({
  testId,
  className,
}) => {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const {
    results,
    exportResults,
  } = useTestStore();
  
  const { models } = useModelStore();

  // Filter data based on testId
  const filteredResults = testId ? results.filter(r => r.testId === testId) : results;

  // Apply additional filters
  const processedResults = useMemo(() => {
    let filtered = [...filteredResults];

    // Filter by selected models
    if (selectedModels.length > 0) {
      filtered = filtered.filter(r => selectedModels.includes(r.modelId));
    }

    // Filter by date range
    if (dateRange && dateRange[0] && dateRange[1]) {
      const startTime = dateRange[0].valueOf();
      const endTime = dateRange[1].valueOf();
      filtered = filtered.filter(r => r.timestamp >= startTime && r.timestamp <= endTime);
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredResults, selectedModels, dateRange]);

  // Get model info
  const getModelName = (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    return model ? model.name : modelId;
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (processedResults.length === 0) {
      return {
        totalTests: 0,
        successfulTests: 0,
        failedTests: 0,
        averageResponseTime: 0,
        totalTokens: 0,
        totalCost: 0,
        fastestModel: null,
        slowestModel: null,
        mostReliableModel: null,
      };
    }

    const successful = processedResults.filter(r => r.success);
    const failed = processedResults.filter(r => !r.success);
    
    const avgResponseTime = successful.length > 0
      ? successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length
      : 0;
    
    const totalTokens = successful.reduce((sum, r) => sum + (r.tokens || 0), 0);
    const totalCost = successful.reduce((sum, r) => sum + (r.cost || 0), 0);

    // Find fastest and slowest models
    const modelStats = new Map<string, { times: number[], successes: number, total: number }>();
    
    processedResults.forEach(result => {
      if (!modelStats.has(result.modelId)) {
        modelStats.set(result.modelId, { times: [], successes: 0, total: 0 });
      }
      
      const stats = modelStats.get(result.modelId)!;
      stats.total++;
      
      if (result.success) {
        stats.times.push(result.responseTime);
        stats.successes++;
      }
    });

    let fastestModel = null;
    let slowestModel = null;
    let mostReliableModel = null;
    let fastestTime = Infinity;
    let slowestTime = 0;
    let highestReliability = 0;

    modelStats.forEach((stats, modelId) => {
      if (stats.times.length > 0) {
        const avgTime = stats.times.reduce((sum, t) => sum + t, 0) / stats.times.length;
        const reliability = stats.successes / stats.total;
        
        if (avgTime < fastestTime) {
          fastestTime = avgTime;
          fastestModel = modelId;
        }
        
        if (avgTime > slowestTime) {
          slowestTime = avgTime;
          slowestModel = modelId;
        }
        
        if (reliability > highestReliability) {
          highestReliability = reliability;
          mostReliableModel = modelId;
        }
      }
    });

    return {
      totalTests: processedResults.length,
      successfulTests: successful.length,
      failedTests: failed.length,
      averageResponseTime: avgResponseTime,
      totalTokens,
      totalCost,
      fastestModel,
      slowestModel,
      mostReliableModel,
    };
  }, [processedResults]);

  // Table columns for detailed results
  const columns: ColumnsType<TestResult> = [
    {
      title: 'Model',
      dataIndex: 'modelId',
      key: 'modelId',
      width: 150,
      render: (modelId: string) => (
        <Space>
          <Text strong>{getModelName(modelId)}</Text>
        </Space>
      ),
      filters: [...new Set(processedResults.map(r => r.modelId))].map(modelId => ({
        text: getModelName(modelId),
        value: modelId,
      })),
      onFilter: (value, record) => record.modelId === value,
    },
    {
      title: 'Iteration',
      dataIndex: 'iteration',
      key: 'iteration',
      width: 80,
      sorter: (a, b) => a.iteration - b.iteration,
    },
    {
      title: 'Status',
      dataIndex: 'success',
      key: 'success',
      width: 80,
      render: (success: boolean) => (
        <Tag color={success ? 'success' : 'error'}>
          {success ? 'Success' : 'Failed'}
        </Tag>
      ),
      filters: [
        { text: 'Success', value: true },
        { text: 'Failed', value: false },
      ],
      onFilter: (value, record) => record.success === value,
    },
    {
      title: 'Response Time',
      dataIndex: 'responseTime',
      key: 'responseTime',
      width: 120,
      sorter: (a, b) => a.responseTime - b.responseTime,
      render: (time: number) => `${time}ms`,
    },
    {
      title: 'Tokens',
      dataIndex: 'tokens',
      key: 'tokens',
      width: 100,
      sorter: (a, b) => (a.tokens || 0) - (b.tokens || 0),
      render: (tokens?: number) => tokens ? formatNumber(tokens) : '-',
    },
    {
      title: 'Cost',
      dataIndex: 'cost',
      key: 'cost',
      width: 100,
      sorter: (a, b) => (a.cost || 0) - (b.cost || 0),
      render: (cost?: number) => cost ? `$${cost.toFixed(4)}` : '-',
    },
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 150,
      sorter: (a, b) => a.timestamp - b.timestamp,
      render: (timestamp: number) => new Date(timestamp).toLocaleString(),
    },
    {
      title: 'Error',
      dataIndex: 'error',
      key: 'error',
      width: 200,
      render: (error?: string) => (
        error ? (
          <Tooltip title={error}>
            <Text type="danger" ellipsis style={{ maxWidth: 180 }}>
              {error}
            </Text>
          </Tooltip>
        ) : '-'
      ),
    },
  ];

  // Handle export
  const handleExport = () => {
    const data = exportResults(testId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-results-${testId || 'all'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get available models for filter
  const availableModels = [...new Set(filteredResults.map(r => r.modelId))];

  if (filteredResults.length === 0) {
    return (
      <Card className={className}>
        <Empty 
          description={testId ? "No results for this test" : "No test results available"}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <Card 
      className={`test-results ${className || ''}`}
      title={
        <Space>
          <BarChartOutlined />
          <Title level={4} style={{ margin: 0 }}>
            {testId ? 'Test Results' : 'All Test Results'}
          </Title>
        </Space>
      }
      extra={
        <Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            size="small"
          >
            Export
          </Button>
        </Space>
      }
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Overview" key="overview">
          {/* Filters */}
          <div className="filters-section">
            <Row gutter={16}>
              <Col span={8}>
                <Select
                  mode="multiple"
                  placeholder="Filter by models"
                  value={selectedModels}
                  onChange={setSelectedModels}
                  style={{ width: '100%' }}
                  allowClear
                >
                  {availableModels.map(modelId => (
                    <Option key={modelId} value={modelId}>
                      {getModelName(modelId)}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col span={8}>
                <RangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  style={{ width: '100%' }}
                  showTime
                />
              </Col>
              <Col span={8}>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    setSelectedModels([]);
                    setDateRange(null);
                  }}
                >
                  Clear Filters
                </Button>
              </Col>
            </Row>
          </div>

          {/* Summary Statistics */}
          <Row gutter={16} className="summary-stats">
            <Col span={6}>
              <Statistic
                title="Total Tests"
                value={summaryStats.totalTests}
                prefix={<BarChartOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Success Rate"
                value={
                  summaryStats.totalTests > 0
                    ? ((summaryStats.successfulTests / summaryStats.totalTests) * 100).toFixed(1)
                    : 0
                }
                suffix="%"
                valueStyle={{
                  color: summaryStats.totalTests > 0 && 
                         (summaryStats.successfulTests / summaryStats.totalTests) > 0.9
                    ? '#3f8600' : '#cf1322'
                }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Avg Response Time"
                value={summaryStats.averageResponseTime.toFixed(0)}
                suffix="ms"
                prefix={<ClockCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Total Cost"
                value={summaryStats.totalCost.toFixed(4)}
                prefix={<DollarOutlined />}
              />
            </Col>
          </Row>

          {/* Model Performance Highlights */}
          {summaryStats.fastestModel && (
            <div className="performance-highlights">
              <Title level={5}>Performance Highlights</Title>
              <Row gutter={16}>
                <Col span={8}>
                  <Card size="small" className="highlight-card fastest">
                    <Statistic
                      title="Fastest Model"
                      value={getModelName(summaryStats.fastestModel)}
                      prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
                    />
                  </Card>
                </Col>
                {summaryStats.mostReliableModel && (
                  <Col span={8}>
                    <Card size="small" className="highlight-card reliable">
                      <Statistic
                        title="Most Reliable"
                        value={getModelName(summaryStats.mostReliableModel)}
                        prefix={<TrophyOutlined style={{ color: '#52c41a' }} />}
                      />
                    </Card>
                  </Col>
                )}
                {summaryStats.slowestModel && summaryStats.slowestModel !== summaryStats.fastestModel && (
                  <Col span={8}>
                    <Card size="small" className="highlight-card slowest">
                      <Statistic
                        title="Slowest Model"
                        value={getModelName(summaryStats.slowestModel)}
                        prefix={<TrophyOutlined style={{ color: '#ff4d4f' }} />}
                      />
                    </Card>
                  </Col>
                )}
              </Row>
            </div>
          )}
        </TabPane>

        <TabPane tab="Detailed Results" key="detailed">
          <Table
            columns={columns}
            dataSource={processedResults}
            rowKey="id"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} results`,
            }}
            scroll={{ x: 1000 }}
            size="small"
          />
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default TestResults;