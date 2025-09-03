/**
 * Performance Testing Types
 * Defines interfaces for model performance testing and benchmarking
 */

import type { TokenUsage } from './model';
import type { BaseEntity } from './index';

export interface PerformanceTest extends BaseEntity {
  name: string;
  description?: string;
  configuration: TestConfiguration;
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  averageResponseTime: number;
  totalTokens: number;
  totalCost: number;
}

export interface TestConfiguration {
  name: string;
  description?: string;
  modelIds: string[];
  prompt: string;
  parameters: TestParameters;
  concurrent: number;
  iterations: number;
  timeout?: number;
  retries?: number;
}

export interface TestParameters {
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface TestResult {
  id: string;
  testId: string;
  modelId: string;
  iteration: number;
  success: boolean;
  responseTime: number;
  tokens?: number;
  cost?: number;
  error?: string;
  timestamp: number;
}

export interface TestSummary {
  testId: string;
  modelId: string;
  totalIterations: number;
  successfulIterations: number;
  failedIterations: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  totalTokens: TokenUsage;
  totalCost: number;
  tokensPerSecond: number;
  successRate: number;
}

export interface ComparisonResult {
  models: string[];
  summaries: TestSummary[];
  winner: {
    fastest: string;
    mostCostEffective: string;
    mostReliable: string;
  };
  recommendations: string[];
}

// Model Comparison
export interface ModelComparison extends BaseEntity {
  name: string;
  modelIds: string[];
  testConfiguration: TestConfiguration;
  results: Record<string, TestSummary>;
  status: 'pending' | 'running' | 'completed' | 'failed';
}