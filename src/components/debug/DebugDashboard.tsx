/**
 * Debug Dashboard
 * 综合调试工具面板
 */

import React, { useState } from 'react';
import { Tabs, Card, Alert } from 'antd';
import { BugOutlined, MessageOutlined } from '@ant-design/icons';
import ConfigFixer from './ConfigFixer';
import StreamingTest from './StreamingTest';

const { TabPane } = Tabs;

export const DebugDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('config');

  return (
    <div style={{ padding: '20px', maxWidth: 1200, margin: '0 auto' }}>
      <Card title="调试工具面板" style={{ marginBottom: 20 }}>
        <Alert
          message="开发调试工具"
          description="这些工具用于诊断和修复应用中的各种问题。请根据遇到的问题选择相应的工具。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      </Card>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane 
          tab={
            <span>
              <BugOutlined />
              配置修复
            </span>
          } 
          key="config"
        >
          <ConfigFixer />
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <MessageOutlined />
              流式测试
            </span>
          } 
          key="streaming"
        >
          <StreamingTest />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default DebugDashboard;