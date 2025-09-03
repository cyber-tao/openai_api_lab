/**
 * Configuration Debugger Component
 * Helps diagnose configuration-related issues
 */

import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Alert, Collapse } from 'antd';
import { BugOutlined, ReloadOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useConfigStore } from '../../stores/configStore';
import { storageService } from '../../services/storage';
import { STORAGE_KEYS } from '../../types/storage';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

export const ConfigDebugger: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const { configs, errors, loading } = useConfigStore();

  const collectDebugInfo = () => {
    try {
      const info = {
        timestamp: new Date().toISOString(),
        configs: {
          count: configs.length,
          data: configs,
        },
        errors,
        loading,
        localStorage: {
          available: typeof Storage !== 'undefined',
          keys: Object.keys(localStorage).filter(key => key.startsWith('openai-lab-')),
        },
        storageData: {} as Record<string, any>,
      };

      // Collect storage data
      Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
        try {
          const data = storageService.get(key);
          info.storageData[name] = {
            key,
            hasData: data !== null,
            dataType: typeof data,
            dataSize: data ? JSON.stringify(data).length : 0,
            data: data,
          };
        } catch (error) {
          info.storageData[name] = {
            key,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      setDebugInfo(info);
    } catch (error) {
      console.error('Failed to collect debug info:', error);
      setDebugInfo({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const collectStorageInfo = () => {
    try {
      const info = storageService.getStorageInfo();
      setStorageInfo(info);
    } catch (error) {
      setStorageInfo({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const clearAllData = () => {
    try {
      const confirmed = window.confirm(
        'This will clear all application data including configurations, chat sessions, and settings. Are you sure?'
      );
      
      if (confirmed) {
        storageService.clear();
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  };

  const clearConfigData = () => {
    try {
      const confirmed = window.confirm(
        'This will clear only configuration data. Are you sure?'
      );
      
      if (confirmed) {
        storageService.remove(STORAGE_KEYS.API_CONFIGS);
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to clear config data:', error);
    }
  };

  useEffect(() => {
    collectDebugInfo();
    collectStorageInfo();
  }, [configs, errors, loading]);

  return (
    <Card
      title={
        <Space>
          <BugOutlined />
          Configuration Debugger
        </Space>
      }
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={collectDebugInfo}>
            Refresh
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* Quick Actions */}
        <Card size="small" title="Quick Actions">
          <Space wrap>
            <Button danger icon={<DeleteOutlined />} onClick={clearConfigData}>
              Clear Config Data
            </Button>
            <Button danger icon={<DeleteOutlined />} onClick={clearAllData}>
              Clear All Data
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </Space>
        </Card>

        {/* Storage Info */}
        {storageInfo && (
          <Card size="small" title="Storage Information">
            {storageInfo.error ? (
              <Alert message="Storage Error" description={storageInfo.error} type="error" />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>Used:</Text> {(storageInfo.used / 1024).toFixed(2)} KB
                </div>
                <div>
                  <Text strong>Available:</Text> {(storageInfo.available / 1024).toFixed(2)} KB
                </div>
                <div>
                  <Text strong>Usage:</Text> {storageInfo.percentage.toFixed(1)}%
                </div>
              </Space>
            )}
          </Card>
        )}

        {/* Current State */}
        <Card size="small" title="Current State">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>Configurations:</Text> {configs.length}
            </div>
            <div>
              <Text strong>Has Errors:</Text> {Object.values(errors).some(e => e) ? 'Yes' : 'No'}
            </div>
            <div>
              <Text strong>Loading:</Text> {Object.values(loading).some(l => l) ? 'Yes' : 'No'}
            </div>
          </Space>
        </Card>

        {/* Errors */}
        {Object.values(errors).some(e => e) && (
          <Alert
            message="Current Errors"
            description={
              <ul>
                {Object.entries(errors).map(([key, error]) => 
                  error && <li key={key}><strong>{key}:</strong> {error}</li>
                )}
              </ul>
            }
            type="error"
            showIcon
          />
        )}

        {/* Debug Information */}
        {debugInfo && (
          <Collapse>
            <Panel header="Debug Information" key="debug">
              {debugInfo.error ? (
                <Alert message="Debug Error" description={debugInfo.error} type="error" />
              ) : (
                <pre style={{ 
                  fontSize: '12px', 
                  backgroundColor: '#f5f5f5', 
                  padding: '10px',
                  overflow: 'auto',
                  maxHeight: '400px'
                }}>
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              )}
            </Panel>
          </Collapse>
        )}

        {/* Instructions */}
        <Alert
          message="Debugging Instructions"
          description={
            <div>
              <Paragraph>
                If you're experiencing issues with configuration saving:
              </Paragraph>
              <ol>
                <li>Check the "Current State" section for errors</li>
                <li>Review the "Storage Information" for quota issues</li>
                <li>Try "Clear Config Data" to reset configurations</li>
                <li>If problems persist, try "Clear All Data"</li>
                <li>Check browser console for additional error messages</li>
              </ol>
            </div>
          }
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
        />
      </Space>
    </Card>
  );
};

export default ConfigDebugger;