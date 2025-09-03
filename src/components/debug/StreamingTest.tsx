/**
 * Streaming Test Component
 * 测试流式响应功能
 */

import React, { useState } from 'react';
import { Card, Button, Input, Space, Alert, Typography, Divider } from 'antd';
import { SendOutlined, ClearOutlined } from '@ant-design/icons';
import { useConfigStore } from '../../stores/configStore';
import { APIClientManager } from '../../services/api/openai';

const { Title } = Typography;
const { TextArea } = Input;

export const StreamingTest: React.FC = () => {
  const [message, setMessage] = useState('Hello, how are you?');
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const { getActiveConfig } = useConfigStore();

  const addLog = (log: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`]);
  };

  const testStreaming = async () => {
    const config = getActiveConfig();
    if (!config) {
      setError('没有活动的API配置');
      return;
    }

    setIsStreaming(true);
    setError(null);
    setResponse('');
    setLogs([]);

    try {
      addLog('开始流式测试...');
      addLog(`使用配置: ${config.name}`);
      addLog(`端点: ${config.endpoint}`);

      const client = APIClientManager.getClient(config);
      
      const messages = [
        { role: 'user', content: message }
      ];

      addLog('发送请求...');

      let streamedContent = '';
      const result = await client.createChatCompletion(
        messages,
        { stream: true },
        (chunk: string) => {
          streamedContent += chunk;
          setResponse(streamedContent);
          addLog(`收到流式数据: "${chunk}"`);
        }
      );

      if (result.success) {
        addLog('✅ 流式响应完成');
        addLog(`最终内容长度: ${streamedContent.length} 字符`);
      } else {
        throw new Error(result.error?.message || '请求失败');
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '未知错误';
      setError(errorMsg);
      addLog(`❌ 错误: ${errorMsg}`);
      console.error('Streaming test error:', err);
    } finally {
      setIsStreaming(false);
    }
  };

  const testNonStreaming = async () => {
    const config = getActiveConfig();
    if (!config) {
      setError('没有活动的API配置');
      return;
    }

    setIsStreaming(true);
    setError(null);
    setResponse('');
    setLogs([]);

    try {
      addLog('开始非流式测试...');
      addLog(`使用配置: ${config.name}`);

      const client = APIClientManager.getClient(config);
      
      const messages = [
        { role: 'user', content: message }
      ];

      addLog('发送请求...');

      const result = await client.createChatCompletion(
        messages,
        { stream: false }
      );

      if (result.success) {
        const content = result.data?.choices?.[0]?.message?.content || '';
        setResponse(content);
        addLog('✅ 非流式响应完成');
        addLog(`响应内容长度: ${content.length} 字符`);
      } else {
        throw new Error(result.error?.message || '请求失败');
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '未知错误';
      setError(errorMsg);
      addLog(`❌ 错误: ${errorMsg}`);
      console.error('Non-streaming test error:', err);
    } finally {
      setIsStreaming(false);
    }
  };

  const clearAll = () => {
    setResponse('');
    setError(null);
    setLogs([]);
  };

  return (
    <Card title="流式响应测试" style={{ maxWidth: 1000, margin: '20px auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        
        <Alert
          message="流式响应测试工具"
          description="测试API的流式和非流式响应功能，帮助诊断聊天功能问题。"
          type="info"
          showIcon
        />

        {/* Input */}
        <div>
          <Title level={5}>测试消息</Title>
          <TextArea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="输入要发送的测试消息..."
            rows={3}
            disabled={isStreaming}
          />
        </div>

        {/* Controls */}
        <Space>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={testStreaming}
            loading={isStreaming}
            disabled={!message.trim()}
          >
            测试流式响应
          </Button>
          <Button
            icon={<SendOutlined />}
            onClick={testNonStreaming}
            loading={isStreaming}
            disabled={!message.trim()}
          >
            测试非流式响应
          </Button>
          <Button
            icon={<ClearOutlined />}
            onClick={clearAll}
            disabled={isStreaming}
          >
            清除结果
          </Button>
        </Space>

        {/* Error Display */}
        {error && (
          <Alert
            message="测试错误"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
          />
        )}

        {/* Response */}
        {response && (
          <div>
            <Title level={5}>响应内容</Title>
            <Card size="small" style={{ backgroundColor: '#f5f5f5' }}>
              <pre style={{ 
                whiteSpace: 'pre-wrap', 
                margin: 0,
                fontFamily: 'inherit'
              }}>
                {response}
              </pre>
            </Card>
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div>
            <Title level={5}>调试日志</Title>
            <Card size="small">
              <div style={{ 
                maxHeight: 300, 
                overflow: 'auto',
                fontSize: 12,
                fontFamily: 'monospace'
              }}>
                {logs.map((log, index) => (
                  <div key={index} style={{ marginBottom: 4 }}>
                    {log}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        <Divider />

        <Alert
          message="使用说明"
          description={
            <div>
              <p><strong>流式响应</strong>: 测试实时流式输出功能</p>
              <p><strong>非流式响应</strong>: 测试传统的一次性响应</p>
              <p><strong>注意</strong>: 确保已配置有效的API密钥和端点</p>
            </div>
          }
          type="warning"
          showIcon
        />
      </Space>
    </Card>
  );
};

export default StreamingTest;