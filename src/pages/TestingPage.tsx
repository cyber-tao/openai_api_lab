/**
 * Testing Page Component
 * Performance testing and model comparison
 */

import React from 'react';
import { Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

export const TestingPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={2}>Testing</Title>
        <Paragraph>
          Performance testing, model comparison, and benchmarking tools. This page will contain the testing functionality.
        </Paragraph>
      </Card>
    </div>
  );
};

export default TestingPage;