/**
 * Model Comparison Component
 * Compare costs and features across different models
 */

import React, { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Select,
  Space,
  Typography,
  Row,
  Col,
  InputNumber,
  Button,
  Tag,
  Tooltip,
  Alert,
  Statistic,
} from 'antd';
import {
  SwapOutlined,
  InfoCircleOutlined,
  CalculatorOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ModelInfo, TokenUsage } from '../../types';
import { useConfigStore } from '../../stores/configStore';
import { compareModelCosts, estimateTokenCount } from '../../services/pricing';
import { formatCurrency, formatNumber } from '../../utils/format';

const { Text } = Typography;
const { Option } = Select;

interface ModelComparisonProps {
  className?: string;
}

interface ComparisonResult {
  model: ModelInfo;
  cost: {
    inputCost: number;
    outputCost: number;
    totalCost: number;
    currency: string;
    tokensUsed: TokenUsage;
  } | null;
  costPerToken: number | null;
}

export const ModelComparison: React.FC<ModelComparisonProps> = ({ className }) => {
  const { models, modelPrices, getModelPrice } = useConfigStore();
  
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>({
    input: 1000,
    output: 500,
    total: 1500,
  });

  // Filter models that have pricing information
  const modelsWithPricing = useMemo(() => {
    return models.filter(model => {
      const customPrice = getModelPrice(model.id);
      return customPrice || (model.inputPrice !== undefined && model.outputPrice !== undefined);
    });
  }, [models, getModelPrice]);

  // Get comparison results
  const comparisonResults = useMemo(() => {
    if (selectedModelIds.length === 0) return [];

    const selectedModels = modelsWithPricing.filter(model => 
      selectedModelIds.includes(model.id)
    );

    return compareModelCosts(selectedModels, tokenUsage, modelPrices);
  }, [selectedModelIds, tokenUsage, modelsWithPricing, modelPrices]);

  // Handle model selection
  const handleModelSelection = (modelIds: string[]) => {
    setSelectedModelIds(modelIds);
  };

  // Handle token usage changes
  const handleTokenUsageChange = (field: keyof TokenUsage, value: number | null) => {
    if (value !== null) {
      const newUsage = { ...tokenUsage, [field]: value };
      
      // Auto-calculate total if input or output changes
      if (field === 'input' || field === 'output') {
        newUsage.total = newUsage.input + newUsage.output;
      }
      
      setTokenUsage(newUsage);
    }
  };

  // Estimate from text
  const handleEstimateFromText = () => {
    const sampleText = "This is a sample text to estimate token usage. You can replace this with your actual text to get more accurate estimates.";
    const estimated = estimateTokenCount(sampleText);
    
    setTokenUsage({
      input: estimated,
      output: Math.ceil(estimated * 0.5), // Assume 50% output ratio
      total: estimated + Math.ceil(estimated * 0.5),
    });
  };

  // Table columns for comparison
  const columns: ColumnsType<ComparisonResult> = [
    {
      title: 'Model',
      key: 'model',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.model.name}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.model.id}
          </Text>
          <Space>
            <Tag color="blue">{record.model.provider}</Tag>
            <Tag color="purple">{record.model.type}</Tag>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Context Length',
      dataIndex: ['model', 'contextLength'],
      key: 'contextLength',
      width: 120,
      render: (length: number) => formatNumber(length),
      sorter: (a, b) => a.model.contextLength - b.model.contextLength,
    },
    {
      title: 'Input Cost',
      key: 'inputCost',
      width: 120,
      render: (_, record) => {
        if (!record.cost) return '-';
        return (
          <Space direction="vertical" size={0}>
            <Text>{formatCurrency(record.cost.inputCost)}</Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {formatCurrency(record.cost.inputCost / tokenUsage.input * 1000)}/1K
            </Text>
          </Space>
        );
      },
      sorter: (a, b) => {
        if (!a.cost || !b.cost) return 0;
        return a.cost.inputCost - b.cost.inputCost;
      },
    },
    {
      title: 'Output Cost',
      key: 'outputCost',
      width: 120,
      render: (_, record) => {
        if (!record.cost) return '-';
        return (
          <Space direction="vertical" size={0}>
            <Text>{formatCurrency(record.cost.outputCost)}</Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {formatCurrency(record.cost.outputCost / tokenUsage.output * 1000)}/1K
            </Text>
          </Space>
        );
      },
      sorter: (a, b) => {
        if (!a.cost || !b.cost) return 0;
        return a.cost.outputCost - b.cost.outputCost;
      },
    },
    {
      title: 'Total Cost',
      key: 'totalCost',
      width: 120,
      render: (_, record) => {
        if (!record.cost) return '-';
        const isLowest = comparisonResults.length > 1 && 
          record.costPerToken === Math.min(...comparisonResults.filter(r => r.costPerToken !== null).map(r => r.costPerToken!));
        
        return (
          <Space direction="vertical" size={0}>
            <Text strong style={{ color: isLowest ? '#52c41a' : undefined }}>
              {formatCurrency(record.cost.totalCost)}
              {isLowest && ' 🏆'}
            </Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {formatCurrency(record.costPerToken || 0)}/token
            </Text>
          </Space>
        );
      },
      sorter: (a, b) => {
        if (!a.cost || !b.cost) return 0;
        return a.cost.totalCost - b.cost.totalCost;
      },
      defaultSortOrder: 'ascend',
    },
    {
      title: 'Capabilities',
      key: 'capabilities',
      width: 150,
      render: (_, record) => (
        <Space wrap>
          {record.model.capabilities.slice(0, 2).map((cap, index) => (
            <Tag key={index}>
              {cap.type}
            </Tag>
          ))}
          {record.model.capabilities.length > 2 && (
            <Tooltip title={record.model.capabilities.slice(2).map(c => c.type).join(', ')}>
              <Tag>+{record.model.capabilities.length - 2}</Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // Calculate savings compared to most expensive
  const savingsInfo = useMemo(() => {
    if (comparisonResults.length < 2) return null;

    const costsWithValues = comparisonResults.filter(r => r.cost);
    if (costsWithValues.length < 2) return null;

    const costs = costsWithValues.map(r => r.cost!.totalCost);
    const maxCost = Math.max(...costs);
    const minCost = Math.min(...costs);
    const savings = maxCost - minCost;
    const savingsPercentage = (savings / maxCost) * 100;

    return {
      maxCost,
      minCost,
      savings,
      savingsPercentage,
    };
  }, [comparisonResults]);

  return (
    <Card
      title={
        <Space>
          <SwapOutlined />
          Model Cost Comparison
        </Space>
      }
      className={className}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Configuration */}
        <Row gutter={16}>
          <Col span={12}>
            <Text strong>Select Models to Compare:</Text>
            <Select
              mode="multiple"
              style={{ width: '100%', marginTop: 4 }}
              placeholder="Choose models to compare..."
              value={selectedModelIds}
              onChange={handleModelSelection}
              maxTagCount="responsive"
            >
              {modelsWithPricing.map(model => {
                const customPrice = getModelPrice(model.id);
                return (
                  <Option key={model.id} value={model.id}>
                    <Space>
                      {model.name}
                      <Tag>{model.provider}</Tag>
                      {customPrice && <Tag color="blue">Custom</Tag>}
                    </Space>
                  </Option>
                );
              })}
            </Select>
          </Col>
          <Col span={12}>
            <Text strong>Token Usage:</Text>
            <Row gutter={8} style={{ marginTop: 4 }}>
              <Col span={8}>
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Input"
                  value={tokenUsage.input}
                  onChange={(value) => handleTokenUsageChange('input', value)}
                  min={0}
                  addonBefore="In"
                />
              </Col>
              <Col span={8}>
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Output"
                  value={tokenUsage.output}
                  onChange={(value) => handleTokenUsageChange('output', value)}
                  min={0}
                  addonBefore="Out"
                />
              </Col>
              <Col span={8}>
                <Button
                  icon={<CalculatorOutlined />}
                  onClick={handleEstimateFromText}
                  style={{ width: '100%' }}
                >
                  Estimate
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>

        {/* Savings Summary */}
        {savingsInfo && (
          <Alert
            message="Cost Savings Analysis"
            description={
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="Cheapest Option"
                    value={savingsInfo.minCost}
                    formatter={(value) => formatCurrency(value as number)}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Most Expensive"
                    value={savingsInfo.maxCost}
                    formatter={(value) => formatCurrency(value as number)}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Potential Savings"
                    value={savingsInfo.savings}
                    formatter={(value) => formatCurrency(value as number)}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Savings Percentage"
                    value={savingsInfo.savingsPercentage}
                    formatter={(value) => `${(value as number).toFixed(1)}%`}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
              </Row>
            }
            type="info"
            showIcon
          />
        )}

        {/* Comparison Table */}
        {selectedModelIds.length === 0 ? (
          <Alert
            message="Select Models to Compare"
            description="Choose at least one model from the dropdown above to see cost comparisons."
            type="info"
            showIcon
          />
        ) : (
          <Table
            columns={columns}
            dataSource={comparisonResults}
            rowKey={(record) => record.model.id}
            pagination={false}
            size="small"
            scroll={{ x: 800 }}
          />
        )}

        {/* Usage Guidelines */}
        <Alert
          message="Comparison Guidelines"
          description={
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              <li>Costs are calculated based on your specified token usage</li>
              <li>Models with custom pricing override API-provided prices</li>
              <li>Consider context length limits for your use case</li>
              <li>Factor in model capabilities beyond just cost</li>
              <li>Actual costs may vary based on real token usage</li>
            </ul>
          }
          type="warning"
          showIcon
          icon={<InfoCircleOutlined />}
        />
      </Space>
    </Card>
  );
};