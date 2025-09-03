/**
 * Model List Component
 * Displays available models with search, filtering, and price management
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Input,
  Select,
  Space,
  Button,
  Tag,
  Typography,
  Tooltip,
  message,
  Row,
  Col,
  Statistic,
  Badge,
  Spin,
  Empty,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  DollarOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  SettingOutlined,

} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ModelInfo, ModelPrice, APIConfig } from '../../types';
import { useConfigStore } from '../../stores/configStore';
import { createAPIClient } from '../../services/api/openai';
import { PriceConfigModal } from './PriceConfigModal';
import { formatCurrency, formatNumber } from '../../utils/format';

const { Text, Title } = Typography;
const { Option } = Select;

interface ModelListProps {
  config?: APIConfig;
  onModelSelect?: (model: ModelInfo) => void;
  selectable?: boolean;
  showPricing?: boolean;
}

export const ModelList: React.FC<ModelListProps> = ({
  config,
  onModelSelect,
  selectable = false,
  showPricing = true,
}) => {
  const {
    models,
    loading,
    errors,
    setModels,
    updateModelPrice,
    getModelPrice,
    setLoading,
    setError,
    getActiveConfig,
  } = useConfigStore();

  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [selectedModelLocal, setSelectedModelLocal] = useState<ModelInfo | null>(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const activeConfig = config || getActiveConfig();

  // Load models on component mount or config change
  useEffect(() => {
    if (activeConfig) {
      loadModels();
    }
  }, [activeConfig?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load models from API
  const loadModels = async (forceRefresh = false) => {
    if (!activeConfig) {
      setError('models', 'No active configuration selected');
      return;
    }

    setLoading('models', true);
    setError('models', null);

    try {
      const client = createAPIClient(activeConfig);
      const response = await client.getModels(forceRefresh);

      if (response.success && response.data) {
        setModels(response.data);
        message.success(`Loaded ${response.data.length} models`);
      } else {
        throw new Error(response.error?.message || 'Failed to load models');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load models';
      setError('models', errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading('models', false);
    }
  };

  // Handle refresh models
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadModels(true);
    setRefreshing(false);
  };

  // Filter models based on search and filters
  const filteredModels = useMemo(() => {
    return models.filter(model => {
      // Search filter
      const matchesSearch = searchText === '' || 
        model.name.toLowerCase().includes(searchText.toLowerCase()) ||
        model.id.toLowerCase().includes(searchText.toLowerCase()) ||
        model.description?.toLowerCase().includes(searchText.toLowerCase());

      // Type filter
      const matchesType = typeFilter === 'all' || model.type === typeFilter;

      // Provider filter
      const matchesProvider = providerFilter === 'all' || model.provider === providerFilter;

      return matchesSearch && matchesType && matchesProvider;
    });
  }, [models, searchText, typeFilter, providerFilter]);

  // Get unique providers and types for filters
  const providers = useMemo(() => {
    return Array.from(new Set(models.map(m => m.provider))).sort();
  }, [models]);

  const types = useMemo(() => {
    return Array.from(new Set(models.map(m => m.type))).sort();
  }, [models]);

  // Handle price configuration
  const handleConfigurePrice = (model: ModelInfo) => {
    setSelectedModelLocal(model);
    setShowPriceModal(true);
  };

  // Handle price save
  const handlePriceSave = (price: ModelPrice) => {
    if (selectedModelLocal) {
      updateModelPrice(selectedModelLocal.id, price);
      message.success('Model price updated successfully');
      setShowPriceModal(false);
      setSelectedModelLocal(null);
    }
  };



  // Get model price display
  const getModelPriceDisplay = (model: ModelInfo) => {
    const customPrice = getModelPrice(model.id);
    const inputPrice = customPrice?.input || model.inputPrice;
    const outputPrice = customPrice?.output || model.outputPrice;

    if (inputPrice !== undefined && outputPrice !== undefined) {
      return (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: '12px' }}>
            Input: {formatCurrency(inputPrice / 1000)}/1K
          </Text>
          <Text style={{ fontSize: '12px' }}>
            Output: {formatCurrency(outputPrice / 1000)}/1K
          </Text>
          {customPrice && (
            <Badge status="processing" text="Custom" />
          )}
        </Space>
      );
    }

    return (
      <Button
        size="small"
        type="link"
        icon={<SettingOutlined />}
        onClick={() => handleConfigurePrice(model)}
      >
        Set Price
      </Button>
    );
  };

  // Table columns
  const columns: ColumnsType<ModelInfo> = [
    {
      title: 'Model',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, model: ModelInfo) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {model.id}
          </Text>
          {model.description && (
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {model.description.length > 50 
                ? `${model.description.substring(0, 50)}...`
                : model.description
              }
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      sorter: (a, b) => a.type.localeCompare(b.type),
      filters: types.map(type => ({ text: type.charAt(0).toUpperCase() + type.slice(1), value: type })),
      onFilter: (value, record) => record.type === value,
      render: (type: string) => {
        const colors = {
          text: 'blue',
          multimodal: 'purple',
          embedding: 'green',
          image: 'orange',
          audio: 'red',
        };
        return <Tag color={colors[type as keyof typeof colors] || 'default'}>{type}</Tag>;
      },
    },
    {
      title: 'Provider',
      dataIndex: 'provider',
      key: 'provider',
      width: 120,
      sorter: (a, b) => a.provider.localeCompare(b.provider),
      filters: providers.map(provider => ({ text: provider, value: provider })),
      onFilter: (value, record) => record.provider === value,
      render: (provider: string) => <Tag>{provider}</Tag>,
    },
    {
      title: 'Context Length',
      dataIndex: 'contextLength',
      key: 'contextLength',
      width: 120,
      sorter: (a, b) => a.contextLength - b.contextLength,
      defaultSortOrder: 'descend',
      render: (length: number) => (
        <Space direction="vertical" size={0}>
          <Text strong>{formatNumber(length)}</Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            tokens
          </Text>
        </Space>
      ),
    },
    {
      title: 'Capabilities',
      dataIndex: 'capabilities',
      key: 'capabilities',
      width: 150,
      sorter: (a, b) => a.capabilities.length - b.capabilities.length,
      render: (capabilities: ModelInfo['capabilities']) => (
        <Space wrap>
          {capabilities.slice(0, 3).map((cap, index) => (
            <Tag key={index} style={{ fontSize: '11px', padding: '0 4px' }}>
              {cap.type}
            </Tag>
          ))}
          {capabilities.length > 3 && (
            <Tooltip title={capabilities.slice(3).map(c => c.type).join(', ')}>
              <Tag style={{ fontSize: '11px', padding: '0 4px' }}>+{capabilities.length - 3}</Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // Add pricing column if enabled
  if (showPricing) {
    columns.push({
      title: 'Pricing (per 1K tokens)',
      key: 'pricing',
      width: 150,
      sorter: (a, b) => {
        const aPrice = getModelPrice(a.id)?.input || a.inputPrice || 0;
        const bPrice = getModelPrice(b.id)?.input || b.inputPrice || 0;
        return aPrice - bPrice;
      },
      render: (_, model: ModelInfo) => getModelPriceDisplay(model),
    });
  }

  // Add action column if selectable
  if (selectable) {
    columns.push({
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_, model: ModelInfo) => (
        <Button
          size="small"
          type="primary"
          onClick={() => onModelSelect?.(model)}
        >
          Select
        </Button>
      ),
    });
  }

  return (
    <Card
      title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>
            Available Models
          </Title>
          {activeConfig && (
            <Tag color="blue">{activeConfig.name}</Tag>
          )}
        </Space>
      }
      extra={
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={refreshing}
            disabled={!activeConfig}
          >
            Refresh
          </Button>
        </Space>
      }
    >
      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Statistic
            title="Total Models"
            value={models.length}
            prefix={<InfoCircleOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Filtered"
            value={filteredModels.length}
            prefix={<FilterOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="With Pricing"
            value={models.filter(m => 
              m.inputPrice !== undefined || getModelPrice(m.id)
            ).length}
            prefix={<DollarOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Providers"
            value={providers.length}
          />
        </Col>
      </Row>

      {/* Filters */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Input
            placeholder="Search models..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </Col>
        <Col span={8}>
          <Select
            placeholder="Filter by type"
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: '100%' }}
          >
            <Option value="all">All Types</Option>
            {types.map(type => (
              <Option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Option>
            ))}
          </Select>
        </Col>
        <Col span={8}>
          <Select
            placeholder="Filter by provider"
            value={providerFilter}
            onChange={setProviderFilter}
            style={{ width: '100%' }}
          >
            <Option value="all">All Providers</Option>
            {providers.map(provider => (
              <Option key={provider} value={provider}>
                {provider}
              </Option>
            ))}
          </Select>
        </Col>
      </Row>

      {/* Error Display */}
      {errors.models && (
        <Card style={{ marginBottom: 16 }}>
          <Text type="danger">{errors.models}</Text>
        </Card>
      )}

      {/* Models Table */}
      <Spin spinning={loading.models}>
        {!activeConfig ? (
          <Empty
            description="Please select an API configuration to load models"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : filteredModels.length === 0 && models.length === 0 ? (
          <Empty
            description="No models available. Click refresh to load models."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredModels}
            rowKey="id"
            pagination={{
              pageSize: 15,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} models`,
              pageSizeOptions: ['10', '15', '25', '50'],
            }}
            scroll={{ x: 900 }}
            size="small"
            showSorterTooltip={{
              title: 'Click to sort'
            }}
            sortDirections={['descend', 'ascend']}
          />
        )}
      </Spin>

      {/* Price Configuration Modal */}
      <PriceConfigModal
        open={showPriceModal}
        model={selectedModelLocal}
        currentPrice={selectedModelLocal ? getModelPrice(selectedModelLocal.id) : null}
        onSave={handlePriceSave}
        onCancel={() => {
          setShowPriceModal(false);
          setSelectedModelLocal(null);
        }}
      />
    </Card>
  );
};