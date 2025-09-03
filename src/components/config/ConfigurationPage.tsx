/**
 * Configuration Page Component
 * Main page for managing API configurations with CRUD operations
 */

import React, { useState } from 'react';
import {
  Layout,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Card,
  Drawer,
  message,
  Modal,
  Upload,
  Tabs,
} from 'antd';
import {
  PlusOutlined,
  SettingOutlined,
  ImportOutlined,
  ExportOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  CalculatorOutlined,
  DollarOutlined,
  BugOutlined,
} from '@ant-design/icons';
import type { APIConfig, ConnectionTestResult } from '../../types';
import { useConfigStore } from '../../stores/configStore';
import { APIConfigForm } from './APIConfigForm';
import { APIConfigList } from './APIConfigList';
import { ConnectionTest } from './ConnectionTest';
import { ModelList } from './ModelList';
import { TokenCalculator } from './TokenCalculator';
import { ModelComparison } from './ModelComparison';
import { ConfigDebugger } from './ConfigDebugger';

const { Title, Text } = Typography;
const { Content } = Layout;

export const ConfigurationPage: React.FC = () => {
  const {
    configs,
    activeConfigId,
    loading,
    errors,
    addConfig,
    updateConfig,
    deleteConfig,
    setActiveConfig,

    importConfigs,
  } = useConfigStore();

  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<APIConfig | null>(null);
  const [showConnectionTest, setShowConnectionTest] = useState(false);
  const [testingConfig, setTestingConfig] = useState<APIConfig | null>(null);

  // Handle form submission
  const handleSaveConfig = (configData: Omit<APIConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingConfig) {
      updateConfig(editingConfig.id, configData);
      message.success('Configuration updated successfully');
    } else {
      addConfig(configData);
      message.success('Configuration created successfully');
    }
    
    setShowForm(false);
    setEditingConfig(null);
  };

  // Handle form cancellation
  const handleCancelForm = () => {
    setShowForm(false);
    setEditingConfig(null);
  };

  // Handle edit configuration
  const handleEditConfig = (config: APIConfig) => {
    setEditingConfig(config);
    setShowForm(true);
  };

  // Handle delete configuration
  const handleDeleteConfig = (id: string) => {
    deleteConfig(id);
    message.success('Configuration deleted successfully');
  };

  // Handle set active configuration
  const handleSetActiveConfig = (id: string) => {
    setActiveConfig(id);
    message.success('Active configuration updated');
  };

  // Handle set default configuration
  const handleSetDefaultConfig = (id: string) => {
    updateConfig(id, { isDefault: true });
    message.success('Default configuration updated');
  };

  // Handle duplicate configuration
  const handleDuplicateConfig = (config: APIConfig) => {
    const duplicatedConfig = {
      name: config.name,
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      model: config.model,
      parameters: { ...config.parameters },
      isDefault: false,
    };
    addConfig(duplicatedConfig);
  };

  // Handle test configuration
  const handleTestConfig = (config: APIConfig) => {
    setTestingConfig(config);
    setShowConnectionTest(true);
  };

  // Handle connection test completion
  const handleTestComplete = (result: ConnectionTestResult) => {
    if (result.success) {
      message.success(`Connection successful (${result.responseTime}ms)`);
    } else {
      message.error(`Connection failed: ${result.error}`);
    }
  };

  // Handle export configurations
  const handleExportConfigs = () => {
    try {
      const configsToExport = configs;
      const dataStr = JSON.stringify(configsToExport, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `api_configurations_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      message.success('Configurations exported successfully');
    } catch {
      message.error('Failed to export configurations');
    }
  };

  // Handle import configurations
  const handleImportConfigs = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedConfigs = JSON.parse(content);
        
        if (Array.isArray(importedConfigs)) {
          const success = importConfigs(importedConfigs);
          if (success) {
            message.success(`Successfully imported ${importedConfigs.length} configurations`);
          }
        } else {
          message.error('Invalid configuration file format');
        }
      } catch {
        message.error('Failed to parse configuration file');
      }
    };
    reader.readAsText(file);
    return false; // Prevent default upload behavior
  };

  return (
    <Layout>
      <Content style={{ padding: '24px' }}>
        {/* Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Space direction="vertical" size={0}>
              <Title level={2} style={{ margin: 0 }}>
                <Space>
                  <SettingOutlined />
                  API Configuration
                </Space>
              </Title>
              <Text type="secondary">
                Manage your API endpoints and connection settings
              </Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Upload
                accept=".json"
                showUploadList={false}
                beforeUpload={handleImportConfigs}
              >
                <Button icon={<ImportOutlined />}>
                  Import
                </Button>
              </Upload>
              
              <Button
                icon={<ExportOutlined />}
                onClick={handleExportConfigs}
                disabled={configs.length === 0}
              >
                Export
              </Button>
              
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setShowForm(true)}
              >
                New Configuration
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Error Display */}
        {errors.configs && (
          <Card style={{ marginBottom: 16 }}>
            <Text type="danger">{errors.configs}</Text>
          </Card>
        )}

        {/* Statistics */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                  {configs.length}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Total Configurations
                </div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                  {configs.filter(c => c.isDefault).length}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Default Configs
                </div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#722ed1' }}>
                  {activeConfigId ? '1' : '0'}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Active Config
                </div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fa8c16' }}>
                  {new Set(configs.map(c => c.endpoint)).size}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Unique Endpoints
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Main Content Tabs */}
        <Tabs
          defaultActiveKey="configs"
          items={[
            {
              key: 'configs',
              label: (
                <Space>
                  <SettingOutlined />
                  API Configurations
                </Space>
              ),
              children: (
                <Card
                  title="API Configurations"
                  extra={
                    configs.length > 0 && (
                      <Button
                        icon={<ThunderboltOutlined />}
                        onClick={() => {
                          const activeConfig = configs.find(c => c.id === activeConfigId);
                          if (activeConfig) {
                            handleTestConfig(activeConfig);
                          } else {
                            message.warning('Please select an active configuration first');
                          }
                        }}
                        disabled={!activeConfigId}
                      >
                        Test Active Config
                      </Button>
                    )
                  }
                >
                  <APIConfigList
                    configs={configs}
                    activeConfigId={activeConfigId}
                    loading={loading.configs}
                    onEdit={handleEditConfig}
                    onDelete={handleDeleteConfig}
                    onSetActive={handleSetActiveConfig}
                    onSetDefault={handleSetDefaultConfig}
                    onDuplicate={handleDuplicateConfig}
                    onTest={handleTestConfig}
                  />
                </Card>
              ),
            },
            {
              key: 'models',
              label: (
                <Space>
                  <AppstoreOutlined />
                  Model Management
                </Space>
              ),
              children: <ModelList showPricing={true} />,
            },
            {
              key: 'calculator',
              label: (
                <Space>
                  <CalculatorOutlined />
                  Token Calculator
                </Space>
              ),
              children: <TokenCalculator />,
            },
            {
              key: 'comparison',
              label: (
                <Space>
                  <DollarOutlined />
                  Model Comparison
                </Space>
              ),
              children: <ModelComparison />,
            },
            {
              key: 'debug',
              label: (
                <Space>
                  <BugOutlined />
                  Debug
                </Space>
              ),
              children: <ConfigDebugger />,
            },
          ]}
        />

        {/* Configuration Form Drawer */}
        <Drawer
          title={editingConfig ? 'Edit Configuration' : 'New Configuration'}
          width={720}
          open={showForm}
          onClose={handleCancelForm}
          destroyOnClose
        >
          <APIConfigForm
            config={editingConfig || undefined}
            onSave={handleSaveConfig}
            onCancel={handleCancelForm}
            loading={loading.configs}
          />
        </Drawer>

        {/* Connection Test Modal */}
        <Modal
          title="Connection Test"
          open={showConnectionTest}
          onCancel={() => setShowConnectionTest(false)}
          footer={null}
          width={800}
          destroyOnClose
        >
          {testingConfig && (
            <ConnectionTest
              config={testingConfig}
              onTestComplete={handleTestComplete}
            />
          )}
        </Modal>
      </Content>
    </Layout>
  );
};