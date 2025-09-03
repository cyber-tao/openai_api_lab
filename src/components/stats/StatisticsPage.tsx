/**
 * Statistics Page
 * Main dashboard for usage statistics and analytics
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, DatePicker, Select, Button, Space, Spin } from 'antd';
import { 
  BarChartOutlined, 
  DownloadOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useStatsStore } from '../../stores/statsStore';
import { useConfigStore } from '../../stores/configStore';
import { UsageChart } from './UsageChart';
import { CostAnalysisChart } from './CostAnalysisChart';
import { ModelUsageChart } from './ModelUsageChart';
import { TrendChart } from './TrendChart';
import { StatsSummaryCards } from './StatsSummaryCards';
import { TopModelsTable } from './TopModelsTable';
import './StatisticsPage.css';

const { RangePicker } = DatePicker;
const { Option } = Select;

export const StatisticsPage: React.FC = () => {
  const {
    // Data
    totalMessages,
    totalTokens,
    totalCost,
    totalSessions,
    averageResponseTime,
    averageTokensPerMessage,
    averageCostPerMessage,
    dateRange,
    loading,
    errors,
    
    // Actions
    setDateRange,
    getStatsForPeriod,
    calculateCostAnalysis,
    getTimeSeriesData,
    getTopModels,
    calculateTrends,
    exportStats,
    generateReport,
    setLoading,
  } = useStatsStore();

  const { models } = useConfigStore();

  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [customDateRange, setCustomDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Calculate derived data
  const periodStats = useMemo(() => {
    const start = customDateRange?.[0]?.valueOf() || dateRange.start;
    const end = customDateRange?.[1]?.valueOf() || dateRange.end;
    return getStatsForPeriod(start, end);
  }, [customDateRange, dateRange, getStatsForPeriod]);

  const costAnalysis = useMemo(() => {
    const start = customDateRange?.[0]?.valueOf() || dateRange.start;
    const end = customDateRange?.[1]?.valueOf() || dateRange.end;
    return calculateCostAnalysis(start, end);
  }, [customDateRange, dateRange, calculateCostAnalysis]);

  const timeSeriesData = useMemo(() => {
    const start = customDateRange?.[0]?.valueOf() || dateRange.start;
    const end = customDateRange?.[1]?.valueOf() || dateRange.end;
    return getTimeSeriesData(selectedPeriod, start, end);
  }, [selectedPeriod, customDateRange, dateRange, getTimeSeriesData]);

  const topModels = useMemo(() => {
    return getTopModels(10);
  }, [getTopModels]);

  // Handle date range change
  const handleDateRangeChange = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      const validDates: [dayjs.Dayjs, dayjs.Dayjs] = [dates[0], dates[1]];
      setCustomDateRange(validDates);
      setDateRange(validDates[0].valueOf(), validDates[1].valueOf());
    } else {
      setCustomDateRange(null);
    }
  };

  // Handle period change
  const handlePeriodChange = (period: 'daily' | 'weekly' | 'monthly') => {
    setSelectedPeriod(period);
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    setLoading('stats', true);
    
    try {
      calculateTrends();
      // Add a small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setRefreshing(false);
      setLoading('stats', false);
    }
  };

  // Export data
  const handleExport = (format: 'json' | 'csv') => {
    try {
      const data = format === 'json' 
        ? generateReport(customDateRange?.[0]?.valueOf(), customDateRange?.[1]?.valueOf())
        : exportStats(format);
      
      const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `openai-lab-stats-${dayjs().format('YYYY-MM-DD')}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  // Initialize trends on mount
  useEffect(() => {
    calculateTrends();
  }, [calculateTrends]);

  if (loading.stats && !refreshing) {
    return (
      <div className="statistics-page-loading">
        <Spin size="large" />
        <p>Loading statistics...</p>
      </div>
    );
  }

  return (
    <div className="statistics-page">
      <div className="statistics-header">
        <div className="statistics-title">
          <h1>
            <BarChartOutlined />
            Statistics & Analytics
          </h1>
          <p>Usage statistics, cost analysis, and performance metrics</p>
        </div>

        <div className="statistics-controls">
          <Space size="middle">
            <RangePicker
              value={customDateRange}
              onChange={handleDateRangeChange}
              format="YYYY-MM-DD"
              placeholder={['Start Date', 'End Date']}
              allowClear
            />
            
            <Select
              value={selectedPeriod}
              onChange={handlePeriodChange}
              style={{ width: 120 }}
            >
              <Option value="daily">Daily</Option>
              <Option value="weekly">Weekly</Option>
              <Option value="monthly">Monthly</Option>
            </Select>

            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={refreshing}
            >
              Refresh
            </Button>

            <Button.Group>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => handleExport('json')}
              >
                Export JSON
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => handleExport('csv')}
              >
                Export CSV
              </Button>
            </Button.Group>
          </Space>
        </div>
      </div>

      {errors.stats && (
        <Card className="error-card">
          <p>Error loading statistics: {errors.stats}</p>
          <Button onClick={handleRefresh}>Retry</Button>
        </Card>
      )}

      <div className="statistics-content">
        {/* Summary Cards */}
        <StatsSummaryCards
          totalMessages={periodStats.totalMessages || totalMessages}
          totalTokens={periodStats.totalTokens || totalTokens}
          totalCost={periodStats.totalCost || totalCost}
          totalSessions={periodStats.totalSessions || totalSessions}
          averageResponseTime={periodStats.averageResponseTime || averageResponseTime}
          averageTokensPerMessage={averageTokensPerMessage}
          averageCostPerMessage={averageCostPerMessage}
        />

        {/* Charts Row 1 */}
        <Row gutter={[16, 16]} className="charts-row">
          <Col xs={24} lg={12}>
            <Card title="Usage Trends" className="chart-card">
              <UsageChart
                data={timeSeriesData}
                period={selectedPeriod}
                loading={loading.stats}
              />
            </Card>
          </Col>
          
          <Col xs={24} lg={12}>
            <Card title="Cost Analysis" className="chart-card">
              <CostAnalysisChart
                data={timeSeriesData}
                costAnalysis={costAnalysis}
                loading={loading.stats}
              />
            </Card>
          </Col>
        </Row>

        {/* Charts Row 2 */}
        <Row gutter={[16, 16]} className="charts-row">
          <Col xs={24} lg={12}>
            <Card title="Model Usage Distribution" className="chart-card">
              <ModelUsageChart
                topModels={topModels}
                models={models}
                loading={loading.stats}
              />
            </Card>
          </Col>
          
          <Col xs={24} lg={12}>
            <Card title="Performance Trends" className="chart-card">
              <TrendChart
                data={timeSeriesData}
                period={selectedPeriod}
                loading={loading.stats}
              />
            </Card>
          </Col>
        </Row>

        {/* Top Models Table */}
        <Row gutter={[16, 16]} className="charts-row">
          <Col span={24}>
            <Card title="Top Models by Usage" className="table-card">
              <TopModelsTable
                topModels={topModels}
                models={models}
                loading={loading.stats}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};