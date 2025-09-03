/**
 * Config Fixer Component
 * Helps fix corrupted API configurations
 */

import React, { useState } from 'react';
import { Card, Button, Space, Alert, Typography, List } from 'antd';
import { useConfigStore } from '../../stores/configStore';
import type { APIConfig } from '../../types';

const { Title, Text } = Typography;

export const ConfigFixer: React.FC = () => {
  const [fixResult, setFixResult] = useState<string | null>(null);
  const { configs, loadFromStorage } = useConfigStore();

  const fixConfigs = () => {
    try {
      setFixResult('开始修复配置...');
      
      // Get raw data from localStorage
      const rawData = localStorage.getItem('openai-lab-configs');
      if (!rawData) {
        setFixResult('没有找到配置数据');
        return;
      }

      const rawConfigs = JSON.parse(rawData);
      setFixResult(prev => prev + `\n找到 ${rawConfigs.length} 个配置`);

      // Fix each config
      const fixedConfigs: APIConfig[] = rawConfigs.map((config: any) => {
        const fixed: APIConfig = {
          id: config.id || `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: config.name || 'Unnamed Config',
          endpoint: config.endpoint || config.baseURL || 'https://api.openai.com/v1',
          apiKey: config.apiKey || '',
          model: config.model,
          parameters: {
            temperature: 0.7,
            maxTokens: 1000,
            topP: 1,
            frequencyPenalty: 0,
            presencePenalty: 0,
            stream: true,
            ...config.parameters,
          },
          isDefault: config.isDefault || false,
          createdAt: config.createdAt || Date.now(),
          updatedAt: Date.now(),
        };
        return fixed;
      });

      // Save fixed configs
      localStorage.setItem('openai-lab-configs', JSON.stringify(fixedConfigs));
      setFixResult(prev => prev + `\n✅ 修复完成，保存了 ${fixedConfigs.length} 个配置`);

      // Reload from storage
      loadFromStorage();
      setFixResult(prev => prev + '\n✅ 重新加载配置完成');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      setFixResult(prev => prev + `\n❌ 修复失败: ${errorMsg}`);
      console.error('Config fix error:', error);
    }
  };

  const clearAllConfigs = () => {
    try {
      localStorage.removeItem('openai-lab-configs');
      localStorage.removeItem('openai-lab-settings');
      setFixResult('✅ 已清除所有配置数据');
      loadFromStorage();
    } catch (error) {
      setFixResult('❌ 清除失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const inspectStorage = () => {
    try {
      const configData = localStorage.getItem('openai-lab-configs');
      const settingsData = localStorage.getItem('openai-lab-settings');
      
      let result = '=== 存储检查 ===\n';
      result += `配置数据: ${configData ? '存在' : '不存在'}\n`;
      result += `设置数据: ${settingsData ? '存在' : '不存在'}\n`;
      
      if (configData) {
        try {
          const configs = JSON.parse(configData);
          result += `配置数量: ${Array.isArray(configs) ? configs.length : '非数组'}\n`;
          
          if (Array.isArray(configs)) {
            configs.forEach((config, index) => {
              result += `配置 ${index + 1}: ${config.name || '无名称'}\n`;
              result += `  - ID: ${config.id || '无ID'}\n`;
              result += `  - Endpoint: ${config.endpoint || config.baseURL || '无端点'}\n`;
              result += `  - Parameters: ${config.parameters ? '存在' : '缺失'}\n`;
            });
          }
        } catch (parseError) {
          result += '❌ 配置数据解析失败\n';
        }
      }
      
      setFixResult(result);
    } catch (error) {
      setFixResult('❌ 检查失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  return (
    <Card title="配置修复工具" style={{ maxWidth: 800, margin: '20px auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        
        <Alert
          message="配置修复工具"
          description="如果遇到配置相关的错误，可以使用此工具修复或重置配置数据。"
          type="info"
          showIcon
        />

        {/* Current Status */}
        <div>
          <Title level={5}>当前状态</Title>
          <Text>配置数量: <strong>{configs.length}</strong></Text>
        </div>

        {/* Config List */}
        {configs.length > 0 && (
          <div>
            <Title level={5}>当前配置</Title>
            <List
              size="small"
              dataSource={configs}
              renderItem={(config) => (
                <List.Item>
                  <Space>
                    <Text strong>{config.name}</Text>
                    <Text type="secondary">({config.endpoint})</Text>
                    <Text code style={{ fontSize: 10 }}>
                      参数: {config.parameters ? '✓' : '✗'}
                    </Text>
                  </Space>
                </List.Item>
              )}
            />
          </div>
        )}

        {/* Fix Result */}
        {fixResult && (
          <Card size="small" title="操作结果">
            <pre style={{ 
              fontSize: 12, 
              backgroundColor: '#f5f5f5', 
              padding: 8, 
              borderRadius: 4,
              whiteSpace: 'pre-wrap',
              maxHeight: 300,
              overflow: 'auto'
            }}>
              {fixResult}
            </pre>
          </Card>
        )}

        {/* Action Buttons */}
        <Space wrap>
          <Button type="primary" onClick={fixConfigs}>
            修复配置
          </Button>
          <Button onClick={inspectStorage}>
            检查存储
          </Button>
          <Button danger onClick={clearAllConfigs}>
            清除所有配置
          </Button>
          <Button onClick={() => setFixResult(null)}>
            清除日志
          </Button>
        </Space>

        <Alert
          message="使用说明"
          description={
            <div>
              <p><strong>修复配置</strong>: 自动修复缺失的参数和字段</p>
              <p><strong>检查存储</strong>: 查看当前存储的原始数据</p>
              <p><strong>清除所有配置</strong>: 删除所有配置数据（谨慎使用）</p>
            </div>
          }
          type="warning"
          showIcon
        />
      </Space>
    </Card>
  );
};

export default ConfigFixer;