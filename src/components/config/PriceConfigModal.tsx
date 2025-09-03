/**
 * Price Configuration Modal Component
 * Allows users to set custom pricing for models
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  InputNumber,
  Select,
  Space,
  Typography,
  Card,
  Row,
  Col,
  Divider,
  Alert,
  Button,
} from 'antd';
import {
  DollarOutlined,
  InfoCircleOutlined,
  CalculatorOutlined,
} from '@ant-design/icons';
import type { ModelInfo, ModelPrice } from '../../types';
import { formatCurrency } from '../../utils/format';

const { Text } = Typography;
const { Option } = Select;

interface PriceConfigModalProps {
  open: boolean;
  model: ModelInfo | null;
  currentPrice: ModelPrice | null;
  onSave: (price: ModelPrice) => void;
  onCancel: () => void;
}

interface PriceCalculation {
  tokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

export const PriceConfigModal: React.FC<PriceConfigModalProps> = ({
  open,
  model,
  currentPrice,
  onSave,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [calculation, setCalculation] = useState<PriceCalculation>({
    tokens: 1000,
    inputCost: 0,
    outputCost: 0,
    totalCost: 0,
  });

  // Initialize form with current price or API price
  useEffect(() => {
    if (model && open) {
      const initialPrice = currentPrice || {
        input: model.inputPrice || 0,
        output: model.outputPrice || 0,
        currency: 'USD',
        lastUpdated: Date.now(),
      };

      form.setFieldsValue({
        input: initialPrice.input,
        output: initialPrice.output,
        currency: initialPrice.currency,
      });

      updateCalculation(initialPrice.input, initialPrice.output, 1000);
    }
  }, [model, currentPrice, open, form]);

  // Update price calculation
  const updateCalculation = (inputPrice: number, outputPrice: number, tokens: number) => {
    const inputCost = (inputPrice / 1000) * tokens;
    const outputCost = (outputPrice / 1000) * tokens;
    const totalCost = inputCost + outputCost;

    setCalculation({
      tokens,
      inputCost,
      outputCost,
      totalCost,
    });
  };

  // Handle form value changes
  const handleValuesChange = (_changedValues: Record<string, unknown>, allValues: Record<string, unknown>) => {
    const { input = 0, output = 0 } = allValues;
    updateCalculation(input as number, output as number, calculation.tokens);
  };

  // Handle calculation token change
  const handleTokensChange = (tokens: number | null) => {
    if (tokens) {
      const values = form.getFieldsValue();
      updateCalculation(values.input || 0, values.output || 0, tokens);
    }
  };

  // Handle form submission
  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const price: ModelPrice = {
        input: values.input,
        output: values.output,
        currency: values.currency,
        lastUpdated: Date.now(),
      };
      onSave(price);
    });
  };

  // Handle reset to API prices
  const handleResetToAPI = () => {
    if (model) {
      form.setFieldsValue({
        input: model.inputPrice || 0,
        output: model.outputPrice || 0,
        currency: 'USD',
      });
      updateCalculation(model.inputPrice || 0, model.outputPrice || 0, calculation.tokens);
    }
  };

  if (!model) return null;

  return (
    <Modal
      title={
        <Space>
          <DollarOutlined />
          Configure Pricing for {model.name}
        </Space>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={onCancel}
      width={600}
      okText="Save Price"
      cancelText="Cancel"
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Model Information */}
        <Card size="small">
          <Row gutter={16}>
            <Col span={12}>
              <Text strong>Model ID:</Text>
              <br />
              <Text type="secondary">{model.id}</Text>
            </Col>
            <Col span={12}>
              <Text strong>Provider:</Text>
              <br />
              <Text type="secondary">{model.provider}</Text>
            </Col>
          </Row>
        </Card>

        {/* Current API Pricing */}
        {(model.inputPrice !== undefined || model.outputPrice !== undefined) && (
          <Alert
            message="API Pricing Available"
            description={
              <Space direction="vertical" size={0}>
                <Text>
                  Input: {model.inputPrice ? formatCurrency(model.inputPrice / 1000) : 'N/A'}/1K tokens
                </Text>
                <Text>
                  Output: {model.outputPrice ? formatCurrency(model.outputPrice / 1000) : 'N/A'}/1K tokens
                </Text>
              </Space>
            }
            type="info"
            showIcon
            action={
              <Button size="small" onClick={handleResetToAPI}>
                Use API Prices
              </Button>
            }
          />
        )}

        {/* Price Configuration Form */}
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleValuesChange}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Input Price (per 1K tokens)"
                name="input"
                rules={[
                  { required: true, message: 'Please enter input price' },
                  { type: 'number', min: 0, message: 'Price must be positive' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.001"
                  step={0.001}
                  precision={6}
                  addonBefore="$"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Output Price (per 1K tokens)"
                name="output"
                rules={[
                  { required: true, message: 'Please enter output price' },
                  { type: 'number', min: 0, message: 'Price must be positive' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.002"
                  step={0.001}
                  precision={6}
                  addonBefore="$"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Currency"
                name="currency"
                rules={[{ required: true, message: 'Please select currency' }]}
              >
                <Select>
                  <Option value="USD">USD ($)</Option>
                  <Option value="EUR">EUR (€)</Option>
                  <Option value="GBP">GBP (£)</Option>
                  <Option value="JPY">JPY (¥)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <Divider />

        {/* Price Calculator */}
        <Card
          title={
            <Space>
              <CalculatorOutlined />
              Price Calculator
            </Space>
          }
          size="small"
        >
          <Row gutter={16} align="middle">
            <Col span={8}>
              <Text strong>Tokens:</Text>
              <InputNumber
                style={{ width: '100%', marginTop: 4 }}
                value={calculation.tokens}
                onChange={handleTokensChange}
                min={1}
                step={1000}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, ''))}
              />
            </Col>
            <Col span={16}>
              <Row gutter={8}>
                <Col span={8}>
                  <Text type="secondary">Input Cost:</Text>
                  <br />
                  <Text strong>{formatCurrency(calculation.inputCost)}</Text>
                </Col>
                <Col span={8}>
                  <Text type="secondary">Output Cost:</Text>
                  <br />
                  <Text strong>{formatCurrency(calculation.outputCost)}</Text>
                </Col>
                <Col span={8}>
                  <Text type="secondary">Total Cost:</Text>
                  <br />
                  <Text strong style={{ color: '#1890ff' }}>
                    {formatCurrency(calculation.totalCost)}
                  </Text>
                </Col>
              </Row>
            </Col>
          </Row>
        </Card>

        {/* Pricing Guidelines */}
        <Alert
          message="Pricing Guidelines"
          description={
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              <li>Prices are per 1,000 tokens</li>
              <li>Input tokens are typically cheaper than output tokens</li>
              <li>Check the provider's official pricing for accuracy</li>
              <li>Custom prices override API-provided prices</li>
            </ul>
          }
          type="warning"
          showIcon
          icon={<InfoCircleOutlined />}
        />
      </Space>
    </Modal>
  );
};