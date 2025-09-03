/**
 * API Configuration Form Component
 * Provides form interface for creating and editing API configurations
 */

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Switch,
  Button,
  Card,
  Space,
  Divider,
  Alert,
  Tooltip,
  Row,
  Col,
  Select,
  Collapse,
} from 'antd';
import {
  ApiOutlined,
  KeyOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { APIConfig, APIParameters } from '../../types';
import { validateAPIConfig } from '../../utils/validation';

const { Panel } = Collapse;
const { TextArea } = Input;

interface APIConfigFormProps {
  config?: APIConfig;
  onSave: (config: Omit<APIConfig, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  loading?: boolean;
}

interface FormData {
  name: string;
  endpoint: string;
  apiKey: string;
  isDefault: boolean;
  parameters: APIParameters;
}

const DEFAULT_PARAMETERS: APIParameters = {
  temperature: 0.7,
  maxTokens: 1000,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  stream: false,
};

const COMMON_ENDPOINTS = [
  { label: 'OpenAI', value: 'https://api.openai.com/v1' },
  { label: 'Azure OpenAI', value: 'https://your-resource.openai.azure.com/openai/deployments/your-deployment' },
  { label: 'Anthropic Claude', value: 'https://api.anthropic.com/v1' },
  { label: 'Local (Ollama)', value: 'http://localhost:11434/v1' },
  { label: 'Local (LM Studio)', value: 'http://localhost:1234/v1' },
  { label: 'Custom', value: '' },
];

export const APIConfigForm: React.FC<APIConfigFormProps> = ({
  config,
  onSave,
  onCancel,
  loading = false,
}) => {
  const [form] = Form.useForm<FormData>();
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('');

  // Initialize form with existing config or defaults
  useEffect(() => {
    if (config) {
      form.setFieldsValue({
        name: config.name,
        endpoint: config.endpoint,
        apiKey: config.apiKey,
        isDefault: config.isDefault,
        parameters: { ...DEFAULT_PARAMETERS, ...config.parameters },
      });
      setSelectedEndpoint('');
    } else {
      form.setFieldsValue({
        name: '',
        endpoint: '',
        apiKey: '',
        isDefault: false,
        parameters: DEFAULT_PARAMETERS,
      });
    }
  }, [config, form]);

  const handleEndpointSelect = (value: string) => {
    setSelectedEndpoint(value);
    if (value) {
      form.setFieldValue('endpoint', value);
    }
  };

  const handleSubmit = async (values: FormData) => {
    // Validate configuration
    const validation = validateAPIConfig({
      ...values,
      id: config?.id || '',
      createdAt: config?.createdAt || Date.now(),
      updatedAt: Date.now(),
    });

    if (!validation.valid) {
      setValidationErrors(validation.errors.map(e => e.message));
      return;
    }

    setValidationErrors([]);
    onSave(values);
  };

  const handleReset = () => {
    form.resetFields();
    setValidationErrors([]);
  };

  return (
    <Card
      title={
        <Space>
          <ApiOutlined />
          {config ? 'Edit API Configuration' : 'New API Configuration'}
        </Space>
      }
      extra={
        <Space>
          <Tooltip title="Switch between simple and advanced configuration modes">
            <Button
              type={isAdvancedMode ? 'primary' : 'default'}
              icon={<SettingOutlined />}
              onClick={() => setIsAdvancedMode(!isAdvancedMode)}
            >
              {isAdvancedMode ? 'Simple' : 'Advanced'}
            </Button>
          </Tooltip>
        </Space>
      }
    >
      {validationErrors.length > 0 && (
        <Alert
          type="error"
          message="Configuration Validation Failed"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          }
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setValidationErrors([])}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        {/* Basic Configuration */}
        <Form.Item
          name="name"
          label="Configuration Name"
          rules={[
            { required: true, message: 'Please enter a configuration name' },
            { min: 2, message: 'Name must be at least 2 characters' },
          ]}
        >
          <Input
            placeholder="e.g., OpenAI GPT-4, Local Ollama"
            prefix={<InfoCircleOutlined />}
          />
        </Form.Item>

        {/* API Endpoint */}
        <Form.Item label="API Endpoint">
          <Space.Compact style={{ width: '100%' }}>
            <Select
              style={{ width: '30%' }}
              placeholder="Select preset"
              value={selectedEndpoint}
              onChange={handleEndpointSelect}
              options={COMMON_ENDPOINTS}
            />
            <Form.Item
              name="endpoint"
              style={{ width: '70%', margin: 0 }}
              rules={[
                { required: true, message: 'Please enter API endpoint' },
                { type: 'url', message: 'Please enter a valid URL' },
              ]}
            >
              <Input
                placeholder="https://api.openai.com/v1"
                prefix={<ApiOutlined />}
              />
            </Form.Item>
          </Space.Compact>
        </Form.Item>

        {/* API Key */}
        <Form.Item
          name="apiKey"
          label="API Key"
          rules={[
            { required: true, message: 'Please enter API key' },
            { min: 10, message: 'API key seems too short' },
          ]}
        >
          <Input.Password
            placeholder="sk-..."
            prefix={<KeyOutlined />}
            visibilityToggle
          />
        </Form.Item>

        {/* Default Configuration Toggle */}
        <Form.Item
          name="isDefault"
          valuePropName="checked"
          tooltip="Set this as the default configuration for new chats"
        >
          <Switch checkedChildren="Default" unCheckedChildren="Default" />
        </Form.Item>

        {/* Advanced Parameters */}
        {isAdvancedMode && (
          <>
            <Divider orientation="left">
              <Space>
                <ThunderboltOutlined />
                Advanced Parameters
              </Space>
            </Divider>

            <Collapse ghost>
              <Panel header="Model Parameters" key="parameters">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name={['parameters', 'temperature']}
                      label="Temperature"
                      tooltip="Controls randomness (0.0 = deterministic, 2.0 = very random)"
                    >
                      <InputNumber
                        min={0}
                        max={2}
                        step={0.1}
                        style={{ width: '100%' }}
                        placeholder="0.7"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name={['parameters', 'maxTokens']}
                      label="Max Tokens"
                      tooltip="Maximum number of tokens to generate"
                    >
                      <InputNumber
                        min={1}
                        max={32000}
                        style={{ width: '100%' }}
                        placeholder="1000"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name={['parameters', 'topP']}
                      label="Top P"
                      tooltip="Nucleus sampling parameter (0.1 = only top 10% likely tokens)"
                    >
                      <InputNumber
                        min={0}
                        max={1}
                        step={0.1}
                        style={{ width: '100%' }}
                        placeholder="1.0"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name={['parameters', 'frequencyPenalty']}
                      label="Frequency Penalty"
                      tooltip="Penalize repeated tokens (-2.0 to 2.0)"
                    >
                      <InputNumber
                        min={-2}
                        max={2}
                        step={0.1}
                        style={{ width: '100%' }}
                        placeholder="0.0"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name={['parameters', 'presencePenalty']}
                      label="Presence Penalty"
                      tooltip="Penalize new topics (-2.0 to 2.0)"
                    >
                      <InputNumber
                        min={-2}
                        max={2}
                        step={0.1}
                        style={{ width: '100%' }}
                        placeholder="0.0"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name={['parameters', 'stream']}
                      label="Stream Response"
                      valuePropName="checked"
                      tooltip="Enable streaming responses"
                    >
                      <Switch />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name={['parameters', 'stop']}
                  label="Stop Sequences"
                  tooltip="Sequences where the API will stop generating (one per line)"
                >
                  <TextArea
                    rows={3}
                    placeholder="Enter stop sequences, one per line"
                  />
                </Form.Item>
              </Panel>
            </Collapse>
          </>
        )}

        {/* Form Actions */}
        <Divider />
        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<ApiOutlined />}
            >
              {config ? 'Update Configuration' : 'Save Configuration'}
            </Button>
            <Button onClick={handleReset}>
              Reset
            </Button>
            <Button onClick={onCancel}>
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};