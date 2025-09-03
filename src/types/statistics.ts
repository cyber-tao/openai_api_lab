/**
 * Statistics and Analytics Types
 * Defines types for usage statistics, cost analysis, and performance metrics
 */

// Statistics and Analytics Types

// Usage Statistics
export interface UsageStats {
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  totalSessions: number;
  averageResponseTime: number;
  period?: {
    startDate: number;
    endDate: number;
  };
}

// Model Usage Statistics
export interface ModelUsage {
  modelId: string;
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
  firstUsed: number;
  lastUsed: number;
}

// Cost Analysis
export interface CostAnalysis {
  totalCost: number;
  averageDailyCost: number;
  costDistribution: Array<{
    modelId: string;
    cost: number;
    percentage: number;
  }>;
  trend: number; // percentage change
  period: {
    start: number;
    end: number;
  };
}

// Time Series Data
export interface TimeSeriesData {
  date: string;
  timestamp: number;
  messages: number;
  tokens: number;
  cost: number;
  sessions: number;
  averageResponseTime: number;
}

// Performance Metrics
export interface PerformanceMetrics {
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // requests per second
  errorRate: number; // percentage
  successRate: number; // percentage
}

// Cost Breakdown
export interface CostBreakdown {
  byModel: Record<string, number>;
  byDate: Record<string, number>;
  bySession: Record<string, number>;
  total: number;
}

// Usage Trends
export interface UsageTrends {
  daily: number[];
  weekly: number[];
  monthly: number[];
  labels: string[];
}

// Statistics Summary
export interface StatisticsSummary {
  usage: UsageStats;
  costs: CostAnalysis;
  performance: PerformanceMetrics;
  trends: UsageTrends;
  topModels: Array<{
    modelId: string;
    usage: ModelUsage;
  }>;
  generatedAt: number;
}