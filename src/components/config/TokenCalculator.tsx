/**
 * Token Usage Calculator Component
 * Estimates token usage and costs for different inputs
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Input,
  Select,
  Row,
  Col,
  Typography,
  Space,
  Statistic,
  Alert,
  Button,
  Divider,
  Tooltip,
  Tag,
} from 'antd';
import {
  CalculatorOutlined,
  InfoCircleOutlined,
  CopyOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import type { CostCalculation } from '../../types';
import { useConfigStore } from '../../stores/configStore';
import { formatCurrency, formatNumber } from '../../utils/format';

const { TextArea } = Input;
const { Text } = Typography;
const { Option } = Select;

interface TokenCalculatorProps {
  className?: string;
}

// Simple token estimation (rough approximation)
const estimateTokens = (text: string): number => {
  if (!text) return 0;
  
  // Rough estimation: 1 token ≈ 4 characters for English text
  // This is a simplified calculation, real tokenization is more complex
  const chars = text.length;
  const words = text.split(/\s+/).filter(word => word.length > 0).length;
  
  // Use a combination of character and word count for better estimation
  return Math.ceil((chars / 4) + (words * 0.3));
};

export const TokenCalculator: React.FC<TokenCalculatorProps> = ({ className }) => {
  const { models, getModelPrice, getActiveConfig } = useConfigStore();
  
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [customRatio, setCustomRatio] = useState<number>(1.5); // Output/Input ratio

  const activeConfig = getActiveConfig();

  // Set default model when models load
  useEffect(() => {
    if (models.length > 0 && !selectedModelId) {
      const defaultModel = activeConfig?.model 
        ? models.find(m => m.id === activeConfig.model)
        : models[0];
      
      if (defaultModel) {
        setSelectedModelId(defaultModel.id);
      }
    }
  }, [models, activeConfig, selectedModelId]);

  // Get selected model
  const selectedModel = useMemo(() => {
    return models.find(m => m.id === selectedModelId);
  }, [models, selectedModelId]);

  // Calculate token estimates
  const tokenEstimates = useMemo(() => {
    const inputTokens = estimateTokens(inputText);
    const outputTokens = outputText 
      ? estimateTokens(outputText)
      : Math.ceil(inputTokens * customRatio);

    return {
      input: inputTokens,
      output: outputTokens,
      total: inputTokens + outputTokens,
    };
  }, [inputText, outputText, customRatio]);

  // Calculate cost estimates
  const costEstimates = useMemo((): CostCalculation | null => {
    if (!selectedModel) return null;

    const customPrice = getModelPrice(selectedModel.id);
    const inputPrice = customPrice?.input || selectedModel.inputPrice;
    const outputPrice = customPrice?.output || selectedModel.outputPrice;

    if (inputPrice === undefined || outputPrice === undefined) {
      return null;
    }

    const inputCost = (inputPrice / 1000) * tokenEstimates.input;
    const outputCost = (outputPrice / 1000) * tokenEstimates.output;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
      currency: customPrice?.currency || 'USD',
      tokensUsed: tokenEstimates,
    };
  }, [selectedModel, tokenEstimates, getModelPrice]);

  // Handle clear all
  const handleClear = () => {
    setInputText('');
    setOutputText('');
  };

  // Handle copy results
  const handleCopyResults = () => {
    const results = [
      `Token Calculation Results`,
      `Model: ${selectedModel?.name || 'Unknown'}`,
      `Input Tokens: ${formatNumber(tokenEstimates.input)}`,
      `Output Tokens: ${formatNumber(tokenEstimates.output)}`,
      `Total Tokens: ${formatNumber(tokenEstimates.total)}`,
    ];

    if (costEstimates) {
      results.push(
        `Input Cost: ${formatCurrency(costEstimates.inputCost)}`,
        `Output Cost: ${formatCurrency(costEstimates.outputCost)}`,
        `Total Cost: ${formatCurrency(costEstimates.totalCost)}`
      );
    }

    navigator.clipboard.writeText(results.join('\n'));
  };

  // Get available models with pricing
  const modelsWithPricing = useMemo(() => {
    return models.filter(model => {
      const customPrice = getModelPrice(model.id);
      return customPrice || (model.inputPrice !== undefined && model.outputPrice !== undefined);
    });
  }, [models, getModelPrice]);

  return (
    <Card
      title={
        <Space>
          <CalculatorOutlined />
          Token Usage Calculator
        </Space>
      }
      className={className}
      extra={
        <Space>
          <Button
            size="small"
            icon={<CopyOutlined />}
            onClick={handleCopyResults}
            disabled={!selectedModel}
          >
            Copy Results
          </Button>
          <Button
            size="small"
            icon={<ClearOutlined />}
            onClick={handleClear}
          >
            Clear
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Model Selection */}
        <Row gutter={16}>
          <Col span={24}>
            <Text strong>Select Model:</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              placeholder="Choose a model for calculation"
              value={selectedModelId}
              onChange={setSelectedModelId}
              showSearch
              optionFilterProp="children"
            >
              {modelsWithPricing.map(model => {
                const customPrice = getModelPrice(model.id);
                return (
                  <Option key={model.id} value={model.id}>
                    <Space>
                      {model.name}
                      <Tag>{model.provider}</Tag>
                      {customPrice && <Tag color="blue">Custom Price</Tag>}
                    </Space>
                  </Option>
                );
              })}
            </Select>
          </Col>
        </Row>

        {/* Input Text */}
        <Row gutter={16}>
          <Col span={12}>
            <Text strong>Input Text:</Text>
            <TextArea
              style={{ marginTop: 4 }}
              placeholder="Enter your input text here to estimate token usage..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={6}
              showCount
            />
          </Col>
          <Col span={12}>
            <Space style={{ width: '100%' }} direction="vertical">
              <Text strong>Expected Output:</Text>
              <TextArea
                style={{ marginTop: 4 }}
                placeholder="Enter expected output (optional) or use ratio estimation..."
                value={outputText}
                onChange={(e) => setOutputText(e.target.value)}
                rows={4}
                showCount
              />
              {!outputText && (
                <Space>
                  <Text type="secondary">Output/Input Ratio:</Text>
                  <Select
                    value={customRatio}
                    onChange={setCustomRatio}
                    style={{ width: 100 }}
                  >
                    <Option value={0.5}>0.5x</Option>
                    <Option value={1}>1x</Option>
                    <Option value={1.5}>1.5x</Option>
                    <Option value={2}>2x</Option>
                    <Option value={3}>3x</Option>
                  </Select>
                  <Tooltip title="Estimated output tokens based on input length">
                    <InfoCircleOutlined />
                  </Tooltip>
                </Space>
              )}
            </Space>
          </Col>
        </Row>

        <Divider />

        {/* Token Estimates */}
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Input Tokens"
              value={tokenEstimates.input}
              formatter={(value) => formatNumber(value as number)}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Output Tokens"
              value={tokenEstimates.output}
              formatter={(value) => formatNumber(value as number)}
              suffix={!outputText ? "(estimated)" : ""}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Total Tokens"
              value={tokenEstimates.total}
              formatter={(value) => formatNumber(value as number)}
            />
          </Col>
          <Col span={6}>
            {selectedModel && (
              <Statistic
                title="Context Usage"
                value={((tokenEstimates.total / selectedModel.contextLength) * 100)}
                formatter={(value) => `${(value as number).toFixed(1)}%`}
                valueStyle={{ 
                  color: (tokenEstimates.total / selectedModel.contextLength) > 0.8 ? '#ff4d4f' : '#52c41a' 
                }}
              />
            )}
          </Col>
        </Row>

        {/* Cost Estimates */}
        {costEstimates ? (
          <>
            <Divider />
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="Input Cost"
                  value={costEstimates.inputCost}
                  formatter={(value) => formatCurrency(value as number)}
                  prefix="$"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Output Cost"
                  value={costEstimates.outputCost}
                  formatter={(value) => formatCurrency(value as number)}
                  prefix="$"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Total Cost"
                  value={costEstimates.totalCost}
                  formatter={(value) => formatCurrency(value as number)}
                  prefix="$"
                  valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Cost per 1K Tokens"
                  value={tokenEstimates.total > 0 ? (costEstimates.totalCost / tokenEstimates.total) * 1000 : 0}
                  formatter={(value) => formatCurrency(value as number)}
                  prefix="$"
                />
              </Col>
            </Row>
          </>
        ) : selectedModel ? (
          <Alert
            message="No Pricing Information"
            description="This model doesn't have pricing information. Configure custom pricing to see cost estimates."
            type="warning"
            showIcon
          />
        ) : (
          <Alert
            message="Select a Model"
            description="Please select a model to see token and cost calculations."
            type="info"
            showIcon
          />
        )}

        {/* Disclaimer */}
        <Alert
          message="Estimation Disclaimer"
          description="Token counts are estimates based on character and word analysis. Actual tokenization may vary depending on the model's tokenizer. For accurate counts, use the model's official tokenizer."
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
        />
      </Space>
    </Card>
  );
};