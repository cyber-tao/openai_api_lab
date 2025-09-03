/**
 * Statistics Service
 * Handles real-time statistics calculation and aggregation
 */

import { useChatStore } from '../stores/chatStore';
// Store imports removed as they're not used in service layer
import type { 
  ChatSession, 
  UsageStats, 
  ModelUsage, 
  CostAnalysis, 
  PerformanceMetrics,
  TimeSeriesData,
  StatisticsSummary,
  TokenUsage 
} from '../types';

export interface SessionStatistics {
  sessionId: string;
  messageCount: number;
  totalTokens: TokenUsage;
  totalCost: number;
  averageResponseTime: number;
  attachmentCount: number;
  errorCount: number;
  firstMessageAt: number;
  lastMessageAt: number;
  duration: number; // in milliseconds
}

export interface RealTimeStats {
  current: SessionStatistics;
  global: UsageStats;
  models: ModelUsage[];
  performance: PerformanceMetrics;
  trends: TimeSeriesData[];
}

export interface StatisticsOptions {
  sessionId?: string;
  dateRange?: {
    start: number;
    end: number;
  };
  includeErrors?: boolean;
  groupBy?: 'day' | 'hour' | 'session' | 'model';
}

class StatisticsService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 30000; // 30 seconds

  /**
   * Get real-time statistics for current session
   */
  getRealTimeStats(sessionId?: string): RealTimeStats {
    const cacheKey = `realtime_${sessionId || 'global'}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const chatStore = useChatStore.getState();
    const session = sessionId 
      ? chatStore.sessions.find(s => s.id === sessionId)
      : chatStore.getActiveSession();

    const currentStats = session ? this.calculateSessionStats(session) : this.getEmptySessionStats();
    const globalStats = this.calculateGlobalStats();
    const modelStats = this.calculateModelUsage();
    const performanceStats = this.calculatePerformanceMetrics();
    const trendsData = this.calculateTrends();

    const result: RealTimeStats = {
      current: currentStats,
      global: globalStats,
      models: modelStats,
      performance: performanceStats,
      trends: trendsData,
    };

    this.setCachedData(cacheKey, result);
    return result;
  }

  /**
   * Calculate statistics for a specific session
   */
  calculateSessionStats(session: ChatSession): SessionStatistics {
    const messages = session.messages || [];
    
    let totalTokens: TokenUsage = { input: 0, output: 0, total: 0 };
    let totalCost = 0;
    let totalResponseTime = 0;
    let responseCount = 0;
    let attachmentCount = 0;
    let errorCount = 0;
    let firstMessageAt = 0;
    let lastMessageAt = 0;

    messages.forEach((message, index) => {
      // Track timestamps
      if (index === 0) firstMessageAt = message.timestamp;
      lastMessageAt = Math.max(lastMessageAt, message.timestamp);

      // Count tokens
      if (message.tokens) {
        totalTokens.input += message.tokens.input || 0;
        totalTokens.output += message.tokens.output || 0;
        totalTokens.total += message.tokens.total || 0;
      }

      // Count cost
      if (message.cost) {
        totalCost += message.cost;
      }

      // Count response times (only for assistant messages)
      if (message.role === 'assistant' && message.responseTime) {
        totalResponseTime += message.responseTime;
        responseCount++;
      }

      // Count attachments
      if (message.attachments) {
        attachmentCount += message.attachments.length;
      }

      // Count errors
      if (message.error) {
        errorCount++;
      }
    });

    const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;
    const duration = lastMessageAt - firstMessageAt;

    return {
      sessionId: session.id,
      messageCount: messages.length,
      totalTokens,
      totalCost,
      averageResponseTime,
      attachmentCount,
      errorCount,
      firstMessageAt,
      lastMessageAt,
      duration,
    };
  }

  /**
   * Calculate global usage statistics
   */
  calculateGlobalStats(options?: StatisticsOptions): UsageStats {
    const chatStore = useChatStore.getState();
    const sessions = chatStore.sessions;

    let totalMessages = 0;
    let totalTokens = 0;
    let totalCost = 0;
    let totalResponseTime = 0;
    let responseCount = 0;

    const { start, end } = options?.dateRange || { start: 0, end: Date.now() };

    sessions.forEach(session => {
      // Filter by date range if specified
      if (session.createdAt < start || session.createdAt > end) {
        return;
      }

      session.messages.forEach(message => {
        if (message.timestamp < start || message.timestamp > end) {
          return;
        }

        totalMessages++;

        if (message.tokens) {
          totalTokens += message.tokens.total || 0;
        }

        if (message.cost) {
          totalCost += message.cost;
        }

        if (message.role === 'assistant' && message.responseTime) {
          totalResponseTime += message.responseTime;
          responseCount++;
        }
      });
    });

    const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

    return {
      totalMessages,
      totalTokens,
      totalCost,
      totalSessions: sessions.length,
      averageResponseTime,
      period: options?.dateRange ? {
        startDate: options.dateRange.start,
        endDate: options.dateRange.end,
      } : undefined,
    };
  }

  /**
   * Calculate model usage statistics
   */
  calculateModelUsage(options?: StatisticsOptions): ModelUsage[] {
    const chatStore = useChatStore.getState();
    const sessions = chatStore.sessions;
    const modelStats = new Map<string, ModelUsage>();

    const { start, end } = options?.dateRange || { start: 0, end: Date.now() };

    sessions.forEach(session => {
      if (session.createdAt < start || session.createdAt > end) {
        return;
      }

      const modelId = session.modelId;
      if (!modelId) return;

      let existing = modelStats.get(modelId);
      if (!existing) {
        existing = {
          modelId,
          totalMessages: 0,
          totalTokens: 0,
          totalCost: 0,
          averageResponseTime: 0,
          firstUsed: session.createdAt,
          lastUsed: session.updatedAt,
        };
        modelStats.set(modelId, existing);
      }

      let responseTime = 0;
      let responseCount = 0;

      session.messages.forEach(message => {
        if (message.timestamp < start || message.timestamp > end) {
          return;
        }

        existing!.totalMessages++;

        if (message.tokens) {
          existing!.totalTokens += message.tokens.total || 0;
        }

        if (message.cost) {
          existing!.totalCost += message.cost;
        }

        if (message.role === 'assistant' && message.responseTime) {
          responseTime += message.responseTime;
          responseCount++;
        }
      });

      // Update average response time
      if (responseCount > 0) {
        existing.averageResponseTime = responseTime / responseCount;
      }

      // Update usage timestamps
      existing.firstUsed = Math.min(existing.firstUsed, session.createdAt);
      existing.lastUsed = Math.max(existing.lastUsed, session.updatedAt);
    });

    return Array.from(modelStats.values()).sort((a, b) => b.totalMessages - a.totalMessages);
  }

  /**
   * Calculate performance metrics
   */
  calculatePerformanceMetrics(options?: StatisticsOptions): PerformanceMetrics {
    const chatStore = useChatStore.getState();
    const sessions = chatStore.sessions;
    
    const responseTimes: number[] = [];
    let totalRequests = 0;
    let successfulRequests = 0;
    let errorRequests = 0;

    const { start, end } = options?.dateRange || { start: 0, end: Date.now() };

    sessions.forEach(session => {
      if (session.createdAt < start || session.createdAt > end) {
        return;
      }

      session.messages.forEach(message => {
        if (message.timestamp < start || message.timestamp > end) {
          return;
        }

        if (message.role === 'assistant') {
          totalRequests++;

          if (message.error) {
            errorRequests++;
          } else {
            successfulRequests++;
          }

          if (message.responseTime) {
            responseTimes.push(message.responseTime);
          }
        }
      });
    });

    // Calculate percentiles
    const sortedTimes = responseTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    const minResponseTime = sortedTimes.length > 0 ? sortedTimes[0] : 0;
    const maxResponseTime = sortedTimes.length > 0 ? sortedTimes[sortedTimes.length - 1] : 0;
    const p95ResponseTime = sortedTimes.length > 0 ? sortedTimes[p95Index] : 0;
    const p99ResponseTime = sortedTimes.length > 0 ? sortedTimes[p99Index] : 0;

    const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

    // Calculate throughput (requests per second) - rough estimate
    const timeSpan = end - start;
    const throughput = timeSpan > 0 ? (totalRequests / (timeSpan / 1000)) : 0;

    return {
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      throughput,
      errorRate,
      successRate,
    };
  }

  /**
   * Calculate trends data
   */
  calculateTrends(options?: StatisticsOptions): TimeSeriesData[] {
    const chatStore = useChatStore.getState();
    const sessions = chatStore.sessions;
    
    const { start, end } = options?.dateRange || { 
      start: Date.now() - (7 * 24 * 60 * 60 * 1000), // Last 7 days
      end: Date.now() 
    };

    const groupBy = options?.groupBy || 'day';
    const dataPoints = new Map<string, TimeSeriesData>();

    // Initialize data points
    const interval = groupBy === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    for (let timestamp = start; timestamp <= end; timestamp += interval) {
      const date = new Date(timestamp);
      const key = groupBy === 'hour' 
        ? date.toISOString().substring(0, 13) + ':00:00.000Z'
        : date.toISOString().substring(0, 10);

      dataPoints.set(key, {
        date: key,
        timestamp,
        messages: 0,
        tokens: 0,
        cost: 0,
        sessions: 0,
        averageResponseTime: 0,
      });
    }

    // Aggregate data
    const responseTimesByPeriod = new Map<string, number[]>();

    sessions.forEach(session => {
      if (session.createdAt < start || session.createdAt > end) {
        return;
      }

      session.messages.forEach(message => {
        if (message.timestamp < start || message.timestamp > end) {
          return;
        }

        const messageDate = new Date(message.timestamp);
        const key = groupBy === 'hour'
          ? messageDate.toISOString().substring(0, 13) + ':00:00.000Z'
          : messageDate.toISOString().substring(0, 10);

        const dataPoint = dataPoints.get(key);
        if (dataPoint) {
          dataPoint.messages++;

          if (message.tokens) {
            dataPoint.tokens += message.tokens.total || 0;
          }

          if (message.cost) {
            dataPoint.cost += message.cost;
          }

          if (message.role === 'assistant' && message.responseTime) {
            if (!responseTimesByPeriod.has(key)) {
              responseTimesByPeriod.set(key, []);
            }
            responseTimesByPeriod.get(key)!.push(message.responseTime);
          }
        }
      });
    });

    // Calculate average response times
    responseTimesByPeriod.forEach((times, key) => {
      const dataPoint = dataPoints.get(key);
      if (dataPoint && times.length > 0) {
        dataPoint.averageResponseTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      }
    });

    // Count sessions per period
    sessions.forEach(session => {
      if (session.createdAt < start || session.createdAt > end) {
        return;
      }

      const sessionDate = new Date(session.createdAt);
      const key = groupBy === 'hour'
        ? sessionDate.toISOString().substring(0, 13) + ':00:00.000Z'
        : sessionDate.toISOString().substring(0, 10);

      const dataPoint = dataPoints.get(key);
      if (dataPoint) {
        dataPoint.sessions++;
      }
    });

    return Array.from(dataPoints.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get comprehensive statistics summary
   */
  getStatisticsSummary(options?: StatisticsOptions): StatisticsSummary {
    const usage = this.calculateGlobalStats(options);
    const models = this.calculateModelUsage(options);
    const performance = this.calculatePerformanceMetrics(options);
    const trends = this.calculateTrends(options);

    // Calculate cost analysis
    const totalCost = usage.totalCost;
    const period = options?.dateRange || { start: 0, end: Date.now() };
    const days = Math.max(1, (period.end - period.start) / (24 * 60 * 60 * 1000));
    const averageDailyCost = totalCost / days;

    const costDistribution = models.map(model => ({
      modelId: model.modelId,
      cost: model.totalCost,
      percentage: totalCost > 0 ? (model.totalCost / totalCost) * 100 : 0,
    }));

    const costs: CostAnalysis = {
      totalCost,
      averageDailyCost,
      costDistribution,
      trend: 0, // Would need historical data to calculate
      period: { start: period.start, end: period.end },
    };

    // Calculate usage trends
    const dailyData = trends.filter((_, index) => index % 24 === 0); // Sample daily data
    const usageTrends = {
      daily: dailyData.map(d => d.messages),
      weekly: [], // Would need weekly aggregation
      monthly: [], // Would need monthly aggregation
      labels: dailyData.map(d => d.date),
    };

    const topModels = models.slice(0, 5).map(model => ({
      modelId: model.modelId,
      usage: model,
    }));

    return {
      usage,
      costs,
      performance,
      trends: usageTrends,
      topModels,
      generatedAt: Date.now(),
    };
  }

  /**
   * Get empty session statistics
   */
  private getEmptySessionStats(): SessionStatistics {
    return {
      sessionId: '',
      messageCount: 0,
      totalTokens: { input: 0, output: 0, total: 0 },
      totalCost: 0,
      averageResponseTime: 0,
      attachmentCount: 0,
      errorCount: 0,
      firstMessageAt: 0,
      lastMessageAt: 0,
      duration: 0,
    };
  }

  /**
   * Get cached data if still valid
   */
  private getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set cached data
   */
  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Create singleton instance
export const statisticsService = new StatisticsService();

// Export types are already exported above