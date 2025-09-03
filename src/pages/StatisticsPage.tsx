/**
 * Statistics Page Component
 * Usage statistics and cost analysis
 */

import React from 'react';
import { Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

export const StatisticsPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={2}>Statistics</Title>
        <Paragraph>
          Usage statistics, cost analysis, and performance metrics. This page will contain the statistics functionality.
        </Paragraph>
      </Card>
    </div>
  );
};

export default StatisticsPage;