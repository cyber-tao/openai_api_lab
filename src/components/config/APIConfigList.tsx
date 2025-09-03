/**
 * API Configuration List Component
 * Displays and manages list of API configurations with CRUD operations
 */

import React, { useState } from 'react';
import {
  List,
  Card,
  Button,
  Space,
  Tag,
  Typography,
  Popconfirm,
  Tooltip,
  Badge,
  Empty,
  Input,
  Row,
  Col,
  Dropdown,
  message,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  ApiOutlined,
  StarOutlined,
  StarFilled,
  ThunderboltOutlined,
  SearchOutlined,
  MoreOutlined,
  CopyOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import type { APIConfig } from '../../types';
import { formatDate } from '../../utils/format';

const { Text } = Typography;
const { Search } = Input;

interface APIConfigListProps {
  configs: APIConfig[];
  activeConfigId: string | null;
  loading?: boolean;
  onEdit: (config: APIConfig) => void;
  onDelete: (id: string) => void;
  onSetActive: (id: string) => void;
  onSetDefault: (id: string) => void;
  onDuplicate: (config: APIConfig) => void;
  onTest: (config: APIConfig) => void;
}

export const APIConfigList: React.FC<APIConfigListProps> = ({
  configs,
  activeConfigId,
  loading = false,
  onEdit,
  onDelete,
  onSetActive,
  onSetDefault,
  onDuplicate,
  onTest,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [testingConfigs, setTestingConfigs] = useState<Set<string>>(new Set());

  // Filter configs based on search query
  const filteredConfigs = configs.filter(config =>
    config.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    config.endpoint.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTest = async (config: APIConfig) => {
    setTestingConfigs(prev => new Set(prev).add(config.id));
    try {
      await onTest(config);
    } finally {
      setTestingConfigs(prev => {
        const newSet = new Set(prev);
        newSet.delete(config.id);
        return newSet;
      });
    }
  };

  const handleDuplicate = (config: APIConfig) => {
    const duplicatedConfig = {
      ...config,
      name: `${config.name} (Copy)`,
      isDefault: false,
    };
    onDuplicate(duplicatedConfig);
    message.success('Configuration duplicated');
  };

  const getMenuItems = (config: APIConfig) => [
    {
      key: 'duplicate',
      icon: <CopyOutlined />,
      label: 'Duplicate',
      onClick: () => handleDuplicate(config),
    },
    {
      key: 'export',
      icon: <ExportOutlined />,
      label: 'Export',
      onClick: () => {
        const dataStr = JSON.stringify(config, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${config.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_config.json`;
        link.click();
        URL.revokeObjectURL(url);
        message.success('Configuration exported');
      },
    },
  ];

  const renderConfigItem = (config: APIConfig) => {
    const isActive = config.id === activeConfigId;
    const isTesting = testingConfigs.has(config.id);

    return (
      <List.Item key={config.id}>
        <Card
          size="small"
          className={`config-item ${isActive ? 'active' : ''}`}
          style={{
            width: '100%',
            border: isActive ? '2px solid #1890ff' : undefined,
          }}
          bodyStyle={{ padding: '12px 16px' }}
        >
          <Row justify="space-between" align="top">
            <Col flex="auto">
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {/* Header */}
                <Row justify="space-between" align="middle">
                  <Col>
                    <Space align="center">
                      <Typography.Title level={5} style={{ margin: 0 }}>
                        {config.name}
                      </Typography.Title>
                      {config.isDefault && (
                        <Tag color="gold" icon={<StarFilled />}>
                          Default
                        </Tag>
                      )}
                      {isActive && (
                        <Badge status="processing" text="Active" />
                      )}
                    </Space>
                  </Col>
                  <Col>
                    <Dropdown
                      menu={{ items: getMenuItems(config) }}
                      trigger={['click']}
                    >
                      <Button
                        type="text"
                        icon={<MoreOutlined />}
                        size="small"
                      />
                    </Dropdown>
                  </Col>
                </Row>

                {/* Details */}
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    <ApiOutlined /> {config.endpoint}
                  </Text>

                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    Created: {formatDate(config.createdAt)}
                    {config.updatedAt !== config.createdAt && (
                      <> • Updated: {formatDate(config.updatedAt)}</>
                    )}
                  </Text>
                </Space>

                {/* Parameters Summary */}
                <Space wrap size={4}>
                  {config.parameters?.temperature !== undefined && (
                    <Tag>T: {config.parameters.temperature}</Tag>
                  )}
                  {config.parameters?.maxTokens && (
                    <Tag>Max: {config.parameters.maxTokens}</Tag>
                  )}
                  {config.parameters?.topP !== undefined && config.parameters.topP !== 1 && (
                    <Tag>Top-P: {config.parameters.topP}</Tag>
                  )}
                  {config.parameters?.stream && (
                    <Tag color="blue">Streaming</Tag>
                  )}
                </Space>
              </Space>
            </Col>

            <Col>
              <Space direction="vertical" size="small">
                <Space size="small">
                  <Tooltip title="Test Connection">
                    <Button
                      type="text"
                      icon={<ThunderboltOutlined />}
                      size="small"
                      loading={isTesting}
                      onClick={() => handleTest(config)}
                    />
                  </Tooltip>
                  
                  <Tooltip title={isActive ? 'Currently Active' : 'Set as Active'}>
                    <Button
                      type={isActive ? 'primary' : 'text'}
                      icon={<ApiOutlined />}
                      size="small"
                      disabled={isActive}
                      onClick={() => onSetActive(config.id)}
                    />
                  </Tooltip>

                  <Tooltip title={config.isDefault ? 'Already Default' : 'Set as Default'}>
                    <Button
                      type="text"
                      icon={config.isDefault ? <StarFilled /> : <StarOutlined />}
                      size="small"
                      disabled={config.isDefault}
                      onClick={() => onSetDefault(config.id)}
                    />
                  </Tooltip>

                  <Tooltip title="Edit Configuration">
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      size="small"
                      onClick={() => onEdit(config)}
                    />
                  </Tooltip>

                  <Popconfirm
                    title="Delete Configuration"
                    description="Are you sure you want to delete this configuration?"
                    onConfirm={() => onDelete(config.id)}
                    okText="Delete"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                  >
                    <Tooltip title="Delete Configuration">
                      <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        size="small"
                        danger
                      />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              </Space>
            </Col>
          </Row>
        </Card>
      </List.Item>
    );
  };

  return (
    <div className="api-config-list">
      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <Search
          placeholder="Search configurations..."
          allowClear
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          prefix={<SearchOutlined />}
        />
      </div>

      {/* List */}
      <List
        loading={loading}
        dataSource={filteredConfigs}
        renderItem={renderConfigItem}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                searchQuery
                  ? `No configurations found matching "${searchQuery}"`
                  : 'No API configurations yet'
              }
            />
          ),
        }}
      />

      {/* Summary */}
      {configs.length > 0 && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {filteredConfigs.length} of {configs.length} configurations
            {searchQuery && ` matching "${searchQuery}"`}
          </Text>
        </div>
      )}

      <style>{`
        .config-item {
          transition: all 0.2s ease;
        }
        .config-item:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .config-item.active {
          background-color: rgba(24, 144, 255, 0.08);
          border-color: #1890ff !important;
        }
        .config-item.active .ant-typography {
          color: inherit;
        }
        .config-item.active .ant-typography-secondary {
          color: rgba(0, 0, 0, 0.65);
        }
      `}</style>
    </div>
  );
};