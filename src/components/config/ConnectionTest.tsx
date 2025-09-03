/**
 * Connection Test Component
 * Tests API connection and displays results with response time measurement
 */

import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Alert,
  Statistic,
  Row,
  Col,
  Typography,
  Progress,
  Tag,
  Divider,
  List,
} from 'antd';
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ApiOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import type { APIConfig, ConnectionTestResult, ModelInfo } from '../../types';
import { createAPIClient } from '../../services/api/openai';


const { Text, Title } = Typography;

interface ConnectionTestProps {
  config: APIConfig;
  onTestComplete?: (result: ConnectionTestResult) => void;
}

interface TestState {
  testing: boolean;
  result: ConnectionTestResult | null;
  models: ModelInfo[] | null;
  error: string | null;
}

export const ConnectionTest: React.FC<ConnectionTestProps> = ({
  config,
  onTestComplete,
}) => {
  const [testState, setTestState] = useState<TestState>({
    testing: false,
    result: null,
    models: null,
    error: null,
  });

  const runConnectionTest = async () => {
    setTestState({
      testing: true,
      result: null,
      models: null,
      error: null,
    });

    try {
      const client = createAPIClient(config);
      
      // Test connection
      const connectionResult = await client.testConnection();
      
      let models: ModelInfo[] | null = null;
      
      // If connection successful, try to get models
      if (connectionResult.success) {
        try {
          const modelsResponse = await client.getModels();
          if (modelsResponse.success && modelsResponse.data) {
            models = modelsResponse.data;
          }
        } catch (error) {
          console.warn('Failed to fetch models:', error);
          // Don't fail the entire test if models fetch fails
        }
      }

      setTestState({
        testing: false,
        result: connectionResult,
        models,
        error: null,
      });

      onTestComplete?.(connectionResult);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      const failedResult: ConnectionTestResult = {
        success: false,
        responseTime: 0,
        error: errorMessage,
        timestamp: Date.now(),
      };

      setTestState({
        testing: false,
        result: failedResult,
        models: null,
        error: errorMessage,
      });

      onTestComplete?.(failedResult);
    }
  };


  const getStatusIcon = (success: boolean) => success ? <CheckCircleOutlined /> : <CloseCircleOutlined />;

  const getResponseTimeColor = (responseTime: number) => {
    if (responseTime < 1000) return 'success';
    if (responseTime < 3000) return 'warning';
    return 'error';
  };

  const getResponseTimeStatus = (responseTime: number) => {
    if (responseTime < 500) return 'Excellent';
    if (responseTime < 1000) return 'Good';
    if (responseTime < 3000) return 'Fair';
    return 'Poor';
  };

  return (
    <Card
      title={
        <Space>
          <ThunderboltOutlined />
          Connection Test
        </Space>
      }
      extra={
        <Button
          type="primary"
          icon={testState.testing ? <LoadingOutlined /> : <ThunderboltOutlined />}
          loading={testState.testing}
          onClick={runConnectionTest}
        >
          {testState.testing ? 'Testing...' : 'Test Connection'}
        </Button>
      }
    >
      {/* Configuration Summary */}
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">Testing configuration:</Text>
        <div style={{ marginTop: 8 }}>
          <Space direction="vertical" size={2}>
            <Text strong>{config.name}</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <ApiOutlined /> {config.endpoint}
            </Text>
            {config.model && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Model: {config.model}
              </Text>
            )}
          </Space>
        </div>
      </div>

      <Divider />

      {/* Test Progress */}
      {testState.testing && (
        <div style={{ marginBottom: 16 }}>
          <Progress percent={100} status="active" showInfo={false} />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Testing API connection and fetching models...
          </Text>
        </div>
      )}

      {/* Test Results */}
      {testState.result && (
        <div>
          <Alert
            type={testState.result.success ? 'success' : 'error'}
            message={
              <Space>
                {getStatusIcon(testState.result.success)}
                {testState.result.success ? 'Connection Successful' : 'Connection Failed'}
              </Space>
            }
            description={
              testState.result.success
                ? 'API endpoint is reachable and responding correctly'
                : testState.result.error || 'Failed to connect to API endpoint'
            }
            style={{ marginBottom: 16 }}
          />

          {/* Connection Statistics */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Statistic
                title="Response Time"
                value={testState.result.responseTime}
                suffix="ms"
                valueStyle={{ 
                  color: testState.result.success 
                    ? `var(--ant-color-${getResponseTimeColor(testState.result.responseTime)})` 
                    : undefined 
                }}
                prefix={<ClockCircleOutlined />}
              />
              {testState.result.success && (
                <Tag color={getResponseTimeColor(testState.result.responseTime)}>
                  {getResponseTimeStatus(testState.result.responseTime)}
                </Tag>
              )}
            </Col>
            <Col span={8}>
              <Statistic
                title="Status"
                value={testState.result.success ? 'Online' : 'Offline'}
                valueStyle={{ 
                  color: testState.result.success ? '#52c41a' : '#ff4d4f' 
                }}
                prefix={getStatusIcon(testState.result.success)}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Models Found"
                value={testState.models?.length || 0}
                prefix={<DatabaseOutlined />}
              />
            </Col>
          </Row>

          {/* Models List */}
          {testState.models && testState.models.length > 0 && (
            <div>
              <Title level={5}>
                <Space>
                  <DatabaseOutlined />
                  Available Models ({testState.models.length})
                </Space>
              </Title>
              
              <List
                size="small"
                dataSource={testState.models.slice(0, 10)} // Show first 10 models
                renderItem={(model) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text strong>{model.name}</Text>
                          <Tag color="blue">{model.type}</Tag>
                          {model.provider && (
                            <Tag>{model.provider}</Tag>
                          )}
                        </Space>
                      }
                      description={
                        <Space size={16}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Context: {model.contextLength.toLocaleString()} tokens
                          </Text>
                          {model.capabilities && model.capabilities.length > 0 && (
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              Capabilities: {model.capabilities.map(c => c.type).join(', ')}
                            </Text>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
              
              {testState.models.length > 10 && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  ... and {testState.models.length - 10} more models
                </Text>
              )}
            </div>
          )}

          {/* Test Timestamp */}
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              Tested at {new Date(testState.result.timestamp).toLocaleString()}
            </Text>
          </div>
        </div>
      )}

      {/* Error Display */}
      {testState.error && !testState.result && (
        <Alert
          type="error"
          message="Test Failed"
          description={testState.error}
          showIcon
        />
      )}
    </Card>
  );
};