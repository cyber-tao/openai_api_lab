/**
 * Testing Page Component
 * Main page for performance testing functionality
 */

import React, { useState, useEffect } from 'react';
import {
  Layout,
  Card,
  Button,
  Space,
  Typography,
  List,
  Tag,
  Tooltip,
  Modal,
  message as antMessage,
  Empty,
  Tabs,
} from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  BarChartOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useTestStore } from '../../stores/testStore';
import { TestConfiguration } from './TestConfiguration';
import { TestExecution } from './TestExecution';
import { TestResults } from './TestResults';
import type { PerformanceTest } from '../../types/testing';
import './TestingPage.css';

const { Title, Text } = Typography;
const { Content, Sider } = Layout;
const { TabPane } = Tabs;

export const TestingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('tests');
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [executionModalVisible, setExecutionModalVisible] = useState(false);

  const {
    tests,
    currentTest,
    deleteTest,
    duplicateTest,
    startTest,
  } = useTestStore();

  // Set initial selected test
  useEffect(() => {
    if (!selectedTestId && tests.length > 0) {
      setSelectedTestId(tests[0].id);
    }
  }, [tests, selectedTestId]);

  // Handle test creation
  const handleTestCreated = (testId: string) => {
    setSelectedTestId(testId);
    setConfigModalVisible(false);
    setEditingTestId(null);
    antMessage.success('Test created successfully');
  };

  // Handle test start
  const handleTestStarted = (testId: string) => {
    setSelectedTestId(testId);
    setActiveTab('execution');
    setConfigModalVisible(false);
    setExecutionModalVisible(true);
  };

  // Handle test deletion
  const handleDeleteTest = (testId: string) => {
    Modal.confirm({
      title: 'Delete Test',
      content: 'Are you sure you want to delete this test? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        deleteTest(testId);
        if (selectedTestId === testId) {
          setSelectedTestId(tests.length > 1 ? tests.find(t => t.id !== testId)?.id || null : null);
        }
        antMessage.success('Test deleted successfully');
      },
    });
  };

  // Handle test duplication
  const handleDuplicateTest = (testId: string) => {
    const newTestId = duplicateTest(testId);
    if (newTestId) {
      setSelectedTestId(newTestId);
      antMessage.success('Test duplicated successfully');
    } else {
      antMessage.error('Failed to duplicate test');
    }
  };

  // Handle test execution
  const handleStartTest = async (testId: string) => {
    try {
      await startTest(testId);
      setSelectedTestId(testId);
      setActiveTab('execution');
      setExecutionModalVisible(true);
    } catch (error) {
      antMessage.error('Failed to start test');
    }
  };

  // Get test status color
  const getTestStatusColor = (test: PerformanceTest) => {
    if (currentTest.id === test.id) {
      switch (currentTest.status) {
        case 'running': return 'processing';
        case 'paused': return 'warning';
        case 'completed': return 'success';
        case 'failed': return 'error';
        default: return 'default';
      }
    }
    return test.status === 'completed' ? 'success' : 'default';
  };

  const selectedTest = tests.find(t => t.id === selectedTestId);

  return (
    <Layout className="testing-page">
      {/* Test List Sidebar */}
      <Sider width={320} className="test-sidebar">
        <Card 
          title={
            <Space>
              <ThunderboltOutlined />
              <Title level={4} style={{ margin: 0 }}>Performance Tests</Title>
            </Space>
          }
          extra={
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingTestId(null);
                setConfigModalVisible(true);
              }}
            >
              New Test
            </Button>
          }
          bodyStyle={{ padding: 0 }}
        >
          {tests.length === 0 ? (
            <Empty 
              description="No tests created yet"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: '40px 20px' }}
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingTestId(null);
                  setConfigModalVisible(true);
                }}
              >
                Create Your First Test
              </Button>
            </Empty>
          ) : (
            <List
              dataSource={tests}
              renderItem={(test) => (
                <List.Item
                  key={test.id}
                  className={`test-item ${selectedTestId === test.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTestId(test.id)}
                >
                  <div className="test-item-content">
                    <div className="test-header">
                      <Space>
                        <Text strong ellipsis style={{ maxWidth: 180 }}>
                          {test.name}
                        </Text>
                        <Tag color={getTestStatusColor(test)}>
                          {currentTest.id === test.id ? currentTest.status : test.status}
                        </Tag>
                      </Space>
                    </div>
                    
                    <div className="test-meta">
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {test.configuration.modelIds.length} models • 
                        {test.configuration.iterations} iterations
                      </Text>
                    </div>
                    
                    <div className="test-stats">
                      <Space size={16}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          Runs: {test.totalRuns}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          Success: {test.successfulRuns}
                        </Text>
                        {test.averageResponseTime > 0 && (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            Avg: {test.averageResponseTime.toFixed(0)}ms
                          </Text>
                        )}
                      </Space>
                    </div>
                    
                    <div className="test-actions">
                      <Space size={4}>
                        <Tooltip title="Run Test">
                          <Button
                            type="text"
                            size="small"
                            icon={<PlayCircleOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartTest(test.id);
                            }}
                            disabled={currentTest.status === 'running'}
                          />
                        </Tooltip>
                        
                        <Tooltip title="Edit Test">
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTestId(test.id);
                              setConfigModalVisible(true);
                            }}
                          />
                        </Tooltip>
                        
                        <Tooltip title="Duplicate Test">
                          <Button
                            type="text"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateTest(test.id);
                            }}
                          />
                        </Tooltip>
                        
                        <Tooltip title="Delete Test">
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTest(test.id);
                            }}
                          />
                        </Tooltip>
                      </Space>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          )}
        </Card>
      </Sider>

      {/* Main Content */}
      <Content className="test-content">
        {selectedTest ? (
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane 
              tab={
                <Space>
                  <SettingOutlined />
                  Configuration
                </Space>
              } 
              key="configuration"
            >
              <TestConfiguration
                testId={selectedTestId!}
                onTestCreated={handleTestCreated}
                onTestStarted={handleTestStarted}
              />
            </TabPane>
            
            <TabPane 
              tab={
                <Space>
                  <PlayCircleOutlined />
                  Execution
                  {currentTest.id === selectedTestId && currentTest.status === 'running' && (
                    <Tag color="processing">Running</Tag>
                  )}
                </Space>
              } 
              key="execution"
            >
              <TestExecution
                testId={selectedTestId!}
                onTestComplete={() => setActiveTab('results')}
              />
            </TabPane>
            
            <TabPane 
              tab={
                <Space>
                  <BarChartOutlined />
                  Results
                </Space>
              } 
              key="results"
            >
              <TestResults testId={selectedTestId!} />
            </TabPane>
          </Tabs>
        ) : (
          <Card>
            <Empty 
              description="Select a test to view details"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingTestId(null);
                  setConfigModalVisible(true);
                }}
              >
                Create New Test
              </Button>
            </Empty>
          </Card>
        )}
      </Content>

      {/* Configuration Modal */}
      <Modal
        title={editingTestId ? 'Edit Test Configuration' : 'Create New Test'}
        open={configModalVisible}
        onCancel={() => {
          setConfigModalVisible(false);
          setEditingTestId(null);
        }}
        footer={null}
        width={800}
        destroyOnClose
      >
        <TestConfiguration
          testId={editingTestId || undefined}
          onTestCreated={handleTestCreated}
          onTestStarted={handleTestStarted}
        />
      </Modal>

      {/* Execution Modal */}
      <Modal
        title="Test Execution"
        open={executionModalVisible}
        onCancel={() => setExecutionModalVisible(false)}
        footer={null}
        width={1000}
        destroyOnClose
      >
        {selectedTestId && (
          <TestExecution
            testId={selectedTestId}
            onTestComplete={() => {
              setExecutionModalVisible(false);
              setActiveTab('results');
            }}
          />
        )}
      </Modal>
    </Layout>
  );
};

export default TestingPage;