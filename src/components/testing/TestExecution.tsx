/**
 * Test Execution Component
 * Monitors and controls test execution
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Progress,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Table,
  Tag,
  Alert,
  Statistic,
  Tooltip,
  message as antMessage,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useTestStore } from '../../stores/testStore';
import { useModelStore } from '../../stores/modelStore';
import type { TestResult } from '../../types/testing';
import type { ColumnsType } from 'antd/es/table';
import { formatNumber } from '../../utils/format';
import './TestExecution.css';

const { Title, Text } = Typography;

interface TestExecutionProps {
  testId: string;
  onTestComplete?: () => void;
  className?: string;
}

export const TestExecution: React.FC<TestExecutionProps> = ({
  testId,
  onTestComplete,
  className,
}) => {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const {
    currentTest,
    getTestById,
    startTest,
    pauseTest,
    stopTest,
    getTestResults,
  } = useTestStore();

  const { models } = useModelStore();

  const test = getTestById(testId);
  const testResults = getTestResults(testId);
  const isRunning = currentTest.id === testId && currentTest.status === 'running';
  const isPaused = currentTest.id === testId && currentTest.status === 'paused';

  // Auto refresh when test is running
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && autoRefresh) {
      interval = setInterval(() => {
        // Force re-render to update progress
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, autoRefresh]);

  // Handle test completion
  useEffect(() => {
    if (currentTest.id === testId && currentTest.status === 'completed') {
      onTestComplete?.();
    }
  }, [currentTest, testId, onTestComplete]);

  if (!test) {
    return (
      <Card>
        <Alert
          message="Test Not Found"
          description="The specified test could not be found."
          type="error"
          showIcon
        />
      </Card>
    );
  }

  // Calculate progress
  const totalIterations = test.configuration.modelIds.length * test.configuration.iterations;
  const completedIterations = testResults.length;
  const progressPercent = totalIterations > 0 ? (completedIterations / totalIterations) * 100 : 0;

  // Calculate statistics
  const successfulResults = testResults.filter((r: TestResult) => r.success);
  const failedResults = testResults.filter((r: TestResult) => !r.success);
  const avgResponseTime = successfulResults.length > 0
    ? successfulResults.reduce((sum: number, r: TestResult) => sum + r.responseTime, 0) / successfulResults.length
    : 0;
  const totalCost = successfulResults.reduce((sum: number, r: TestResult) => sum + (r.cost || 0), 0);

  // Get model name
  const getModelName = (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    return model ? model.name : modelId;
  };

  // Handle test actions
  const handleStart = async () => {
    try {
      await startTest(testId);
      antMessage.success('Test started');
    } catch (error) {
      antMessage.error('Failed to start test');
    }
  };

  const handlePause = () => {
    pauseTest();
    antMessage.info('Test paused');
  };

  const handleStop = () => {
    stopTest();
    antMessage.warning('Test stopped');
  };

  const handleRestart = async () => {
    try {
      await startTest(testId);
      antMessage.success('Test restarted');
    } catch (error) {
      antMessage.error('Failed to restart test');
    }
  };

  // Table columns for recent results
  const columns: ColumnsType<TestResult> = [
    {
      title: 'Model',
      dataIndex: 'modelId',
      key: 'modelId',
      width: 150,
      render: (modelId: string) => getModelName(modelId),
    },
    {
      title: 'Iteration',
      dataIndex: 'iteration',
      key: 'iteration',
      width: 80,
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
    },
    {
      title: 'Response Time',
      dataIndex: 'responseTime',
      key: 'responseTime',
      width: 120,
      render: (time: number) => `${time}ms`,
    },
    {
      title: 'Tokens',
      dataIndex: 'tokens',
      key: 'tokens',
      width: 100,
      render: (tokens?: number) => tokens ? formatNumber(tokens) : '-',
    },
    {
      title: 'Cost',
      dataIndex: 'cost',
      key: 'cost',
      width: 100,
      render: (cost?: number) => cost ? `$${cost.toFixed(4)}` : '-',
    },
  ];

  // Get recent results (last 10)
  const recentResults = testResults
    .sort((a: TestResult, b: TestResult) => b.timestamp - a.timestamp)
    .slice(0, 10);

  return (
    <div className={`test-execution ${className || ''}`}>
      {/* Test Header */}
      <Card 
        title={
          <Space>
            <PlayCircleOutlined />
            <Title level={4} style={{ margin: 0 }}>
              {test.name}
            </Title>
            <Tag color={
              isRunning ? 'processing' : 
              isPaused ? 'warning' : 
              currentTest.status === 'completed' ? 'success' : 'default'
            }>
              {isRunning ? 'Running' : 
               isPaused ? 'Paused' : 
               currentTest.status === 'completed' ? 'Completed' : 'Ready'}
            </Tag>
          </Space>
        }
        extra={
          <Space>
            {!isRunning && !isPaused && (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleStart}
                disabled={currentTest.status === 'running'}
              >
                Start Test
              </Button>
            )}
            
            {isRunning && (
              <Button
                icon={<PauseCircleOutlined />}
                onClick={handlePause}
              >
                Pause
              </Button>
            )}
            
            {isPaused && (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleStart}
              >
                Resume
              </Button>
            )}
            
            {(isRunning || isPaused) && (
              <Button
                danger
                icon={<StopOutlined />}
                onClick={handleStop}
              >
                Stop
              </Button>
            )}
            
            {!isRunning && !isPaused && completedIterations > 0 && (
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRestart}
              >
                Restart
              </Button>
            )}
          </Space>
        }
      >
        {test.description && (
          <Text type="secondary">{test.description}</Text>
        )}
      </Card>

      {/* Progress Section */}
      <Card title="Progress" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={16}>
            <Progress
              percent={Math.round(progressPercent)}
              status={
                isRunning ? 'active' : 
                currentTest.status === 'completed' ? 'success' : 
                failedResults.length > successfulResults.length ? 'exception' : 'normal'
              }
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
            <div style={{ marginTop: 8 }}>
              <Text>
                {completedIterations} of {totalIterations} iterations completed
              </Text>
            </div>
          </Col>
          <Col span={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary">
                Models: {test.configuration.modelIds.length}
              </Text>
              <Text type="secondary">
                Iterations per model: {test.configuration.iterations}
              </Text>
              <Text type="secondary">
                Concurrent requests: {test.configuration.concurrent}
              </Text>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Statistics */}
      <Card title="Statistics" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Successful"
              value={successfulResults.length}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Failed"
              value={failedResults.length}
              prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: failedResults.length > 0 ? '#ff4d4f' : undefined }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Avg Response Time"
              value={avgResponseTime.toFixed(0)}
              suffix="ms"
              prefix={<ClockCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Total Cost"
              value={totalCost.toFixed(4)}
              prefix="$"
            />
          </Col>
        </Row>
      </Card>

      {/* Recent Results */}
      {recentResults.length > 0 && (
        <Card 
          title="Recent Results" 
          style={{ marginTop: 16 }}
          extra={
            <Tooltip title="Auto-refresh results">
              <Button
                type={autoRefresh ? 'primary' : 'default'}
                size="small"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
              </Button>
            </Tooltip>
          }
        >
          <Table
            columns={columns}
            dataSource={recentResults}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
      )}

      {/* Test Configuration Summary */}
      <Card title="Test Configuration" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Prompt:</Text>
                <div style={{ marginTop: 4, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                  <Text>{test.configuration.prompt}</Text>
                </div>
              </div>
              <div>
                <Text strong>Models:</Text>
                <div style={{ marginTop: 4 }}>
                  {test.configuration.modelIds.map((modelId: string) => (
                    <Tag key={modelId}>{getModelName(modelId)}</Tag>
                  ))}
                </div>
              </div>
            </Space>
          </Col>
          <Col span={12}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Parameters:</Text>
                <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                  <li>Temperature: {test.configuration.parameters.temperature}</li>
                  <li>Max Tokens: {test.configuration.parameters.maxTokens}</li>
                  <li>Top P: {test.configuration.parameters.topP}</li>
                  <li>Timeout: {test.configuration.timeout}ms</li>
                </ul>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default TestExecution;