/**
 * Test Configuration Component
 * Allows users to create and configure performance tests
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  InputNumber,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Divider,
  Switch,
  Slider,
  Tooltip,
  Alert,
  message as antMessage,
} from 'antd';
import {
  SettingOutlined,
  SaveOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useTestStore } from '../../stores/testStore';
import { useModelStore } from '../../stores/modelStore';
import type { TestConfiguration as TestConfigType } from '../../types/testing';
import './TestConfiguration.css';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface TestConfigurationProps {
  testId?: string;
  onTestCreated?: (testId: string) => void;
  onTestStarted?: (testId: string) => void;
  className?: string;
}

export const TestConfiguration: React.FC<TestConfigurationProps> = ({
  testId,
  onTestCreated,
  onTestStarted,
  className,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);

  const {
    currentTest,
    createTest,
    updateTest,
    getTestById,
  } = useTestStore();

  const { models } = useModelStore();

  // Get available models
  const availableModels = models;

  // Load existing test data
  useEffect(() => {
    if (testId) {
      const test = getTestById(testId);
      if (test) {
        form.setFieldsValue({
          name: test.name,
          description: test.description,
          prompt: test.configuration.prompt,
          modelIds: test.configuration.modelIds,
          iterations: test.configuration.iterations,
          concurrent: test.configuration.concurrent,
          temperature: test.configuration.parameters.temperature,
          maxTokens: test.configuration.parameters.maxTokens,
          topP: test.configuration.parameters.topP,
          frequencyPenalty: test.configuration.parameters.frequencyPenalty,
          presencePenalty: test.configuration.parameters.presencePenalty,
          timeout: test.configuration.timeout,
          retries: test.configuration.retries,
        });
      }
    }
  }, [testId, form, getTestById]);

  // Calculate estimated duration
  const calculateEstimatedDuration = () => {
    const values = form.getFieldsValue();
    const modelCount = values.modelIds?.length || 1;
    const iterations = values.iterations || 5;
    const concurrent = values.concurrent || 1;
    const avgResponseTime = 2000; // Estimated 2 seconds per request
    
    const totalRequests = modelCount * iterations;
    const estimatedTime = (totalRequests / concurrent) * avgResponseTime;
    
    const minutes = Math.floor(estimatedTime / 60000);
    const seconds = Math.floor((estimatedTime % 60000) / 1000);
    
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  // Handle form submission
  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const config: TestConfigType = {
        name: values.name,
        description: values.description,
        prompt: values.prompt,
        modelIds: values.modelIds,
        iterations: values.iterations,
        concurrent: values.concurrent,
        parameters: {
          temperature: values.temperature,
          maxTokens: values.maxTokens,
          topP: values.topP,
          frequencyPenalty: values.frequencyPenalty,
          presencePenalty: values.presencePenalty,
        },
        timeout: values.timeout,
        retries: values.retries,
      };

      let resultTestId: string;

      if (testId) {
        // Update existing test
        updateTest(testId, {
          name: config.name,
          description: config.description,
          configuration: config,
        });
        resultTestId = testId;
        antMessage.success('Test updated successfully');
      } else {
        // Create new test
        resultTestId = createTest(config);
        antMessage.success('Test created successfully');
      }

      // Handle start immediately option
      if (values.startImmediately) {
        onTestStarted?.(resultTestId);
      } else {
        onTestCreated?.(resultTestId);
      }
    } catch (error) {
      antMessage.error('Failed to save test configuration');
    } finally {
      setLoading(false);
    }
  };

  // Handle reset
  const handleReset = () => {
    form.resetFields();
  };

  return (
    <Card 
      className={`test-configuration ${className || ''}`}
      title={
        <Space>
          <SettingOutlined />
          <Title level={4} style={{ margin: 0 }}>
            {testId ? 'Edit Test Configuration' : 'Create Performance Test'}
          </Title>
        </Space>
      }
      extra={
        <Space>
          <Switch
            checked={advancedMode}
            onChange={setAdvancedMode}
            checkedChildren="Advanced"
            unCheckedChildren="Simple"
            size="small"
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
            size="small"
          >
            Reset
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          temperature: 0.7,
          maxTokens: 1000,
          topP: 1.0,
          frequencyPenalty: 0,
          presencePenalty: 0,
          concurrent: 1,
          iterations: 5,
          timeout: 30000,
          retries: 0,
        }}
      >
        {/* Basic Configuration */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="name"
              label="Test Name"
              rules={[{ required: true, message: 'Please enter test name' }]}
            >
              <Input placeholder="Enter test name" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="modelIds"
              label="Models to Test"
              rules={[{ required: true, message: 'Please select at least one model' }]}
            >
              <Select
                mode="multiple"
                placeholder="Select models"
                showSearch
                filterOption={(input, option) =>
                  String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {availableModels.map(model => (
                  <Option key={model.id} value={model.id}>
                    {model.name} ({model.provider})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="description"
          label="Description"
        >
          <TextArea 
            placeholder="Optional description of the test"
            rows={2}
          />
        </Form.Item>

        <Form.Item
          name="prompt"
          label="Test Prompt"
          rules={[{ required: true, message: 'Please enter test prompt' }]}
        >
          <TextArea 
            placeholder="Enter the prompt to test with all models"
            rows={4}
          />
        </Form.Item>

        {/* Test Parameters */}
        <Divider orientation="left">Test Parameters</Divider>
        
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="iterations"
              label={
                <Space>
                  <span>Iterations</span>
                  <Tooltip title="Number of times to run the test for each model">
                    <InfoCircleOutlined />
                  </Tooltip>
                </Space>
              }
            >
              <InputNumber
                min={1}
                max={100}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="concurrent"
              label={
                <Space>
                  <span>Concurrent Requests</span>
                  <Tooltip title="Number of simultaneous requests">
                    <InfoCircleOutlined />
                  </Tooltip>
                </Space>
              }
            >
              <InputNumber
                min={1}
                max={10}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <div className="estimated-duration">
              <Text type="secondary">Estimated Duration:</Text>
              <br />
              <Text strong>{calculateEstimatedDuration()}</Text>
            </div>
          </Col>
        </Row>

        {/* Model Parameters */}
        <Divider orientation="left">Model Parameters</Divider>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="temperature"
              label="Temperature"
            >
              <Slider
                min={0}
                max={2}
                step={0.1}
                marks={{
                  0: '0',
                  0.7: '0.7',
                  1: '1',
                  2: '2',
                }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="maxTokens"
              label="Max Tokens"
            >
              <InputNumber
                min={1}
                max={4000}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Advanced Parameters */}
        {advancedMode && (
          <>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="topP"
                  label="Top P"
                >
                  <InputNumber
                    min={0}
                    max={1}
                    step={0.1}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="frequencyPenalty"
                  label="Frequency Penalty"
                >
                  <InputNumber
                    min={-2}
                    max={2}
                    step={0.1}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="presencePenalty"
                  label="Presence Penalty"
                >
                  <InputNumber
                    min={-2}
                    max={2}
                    step={0.1}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="timeout"
                  label="Timeout (ms)"
                >
                  <InputNumber
                    min={5000}
                    max={120000}
                    step={1000}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="retries"
                  label="Retries"
                >
                  <InputNumber
                    min={0}
                    max={5}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        {/* Test Status Alert */}
        {currentTest.status === 'running' && (
          <Alert
            message="Test in Progress"
            description="A test is currently running. Please wait for it to complete before starting a new test."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Action Buttons */}
        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              disabled={currentTest.status === 'running'}
              icon={<SaveOutlined />}
            >
              {testId ? 'Update Test' : 'Create Test'}
            </Button>
            
            <Form.Item
              name="startImmediately"
              valuePropName="checked"
              style={{ margin: 0 }}
            >
              <Button
                type="default"
                htmlType="submit"
                loading={loading}
                disabled={currentTest.status === 'running'}
                icon={<PlayCircleOutlined />}
              >
                {testId ? 'Update & Start' : 'Create & Start'}
              </Button>
            </Form.Item>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default TestConfiguration;