/**
 * Statistics Store
 * Manages usage statistics and analytics with Zustand and localStorage persistence
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { UsageStats, CostAnalysis, ModelUsage, TimeSeriesData } from '../types';
import { STORAGE_KEYS } from '../types/storage';
import { storageService } from '../services/storage';

interface StatsState {
  // Usage Statistics
  totalSessions: number;
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  
  // Model Usage
  modelUsage: Record<string, ModelUsage>;
  
  // Time Series Data
  dailyStats: TimeSeriesData[];
  weeklyStats: TimeSeriesData[];
  monthlyStats: TimeSeriesData[];
  
  // Cost Analysis
  costByModel: Record<string, number>;
  costByDate: Record<string, number>;
  costTrends: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
  
  // Performance Metrics
  averageResponseTime: number;
  averageTokensPerMessage: number;
  averageCostPerMessage: number;
  
  // Date Range
  dateRange: {
    start: number;
    end: number;
  };
  
  // Loading states
  loading: {
    stats: boolean;
    analysis: boolean;
  };
  
  // Error states
  errors: {
    stats: string | null;
    analysis: string | null;
  };

  // Statistics actions
  recordMessage: (modelId: string, tokens: number, cost: number, responseTime: number) => void;
  recordSession: (modelId: string, messageCount: number, totalTokens: number, totalCost: number) => void;
  
  // Analysis actions
  calculateCostAnalysis: (startDate?: number, endDate?: number) => CostAnalysis;
  getModelUsageStats: (modelId?: string) => ModelUsage | Record<string, ModelUsage>;
  getTimeSeriesData: (period: 'daily' | 'weekly' | 'monthly', startDate?: number, endDate?: number) => TimeSeriesData[];
  
  // Filtering and aggregation
  setDateRange: (start: number, end: number) => void;
  getStatsForPeriod: (startDate: number, endDate: number) => UsageStats;
  getTopModels: (limit?: number) => Array<{ modelId: string; usage: ModelUsage }>;
  
  // Trend analysis
  calculateTrends: () => void;
  getCostTrend: (period: 'daily' | 'weekly' | 'monthly') => number[];
  getUsageTrend: (period: 'daily' | 'weekly' | 'monthly') => number[];
  
  // Loading and error management
  setLoading: (key: keyof StatsState['loading'], value: boolean) => void;
  setError: (key: keyof StatsState['errors'], value: string | null) => void;
  
  // Persistence
  loadFromStorage: () => void;
  saveToStorage: () => void;
  
  // Export and reporting
  exportStats: (format: 'json' | 'csv') => string;
  generateReport: (startDate?: number, endDate?: number) => {
    summary: UsageStats;
    modelBreakdown: Record<string, ModelUsage>;
    costAnalysis: CostAnalysis;
    trends: any;
  };
  
  // Utilities
  reset: () => void;
  clearOldData: (olderThanDays: number) => void;
}

const initialState = {
  totalSessions: 0,
  totalMessages: 0,
  totalTokens: 0,
  totalCost: 0,
  modelUsage: {},
  dailyStats: [],
  weeklyStats: [],
  monthlyStats: [],
  costByModel: {},
  costByDate: {},
  costTrends: {
    daily: [],
    weekly: [],
    monthly: [],
  },
  averageResponseTime: 0,
  averageTokensPerMessage: 0,
  averageCostPerMessage: 0,
  dateRange: {
    start: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
    end: Date.now(),
  },
  loading: {
    stats: false,
    analysis: false,
  },
  errors: {
    stats: null,
    analysis: null,
  },
};

export const useStatsStore = create<StatsState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Record message statistics
    recordMessage: (modelId, tokens, cost, responseTime) => {
      const now = Date.now();
      const today = new Date(now).toDateString();

      set((state) => {
        // Update totals
        const newTotalMessages = state.totalMessages + 1;
        const newTotalTokens = state.totalTokens + tokens;
        const newTotalCost = state.totalCost + cost;

        // Update model usage
        const modelUsage = { ...state.modelUsage };
        if (!modelUsage[modelId]) {
          modelUsage[modelId] = {
            modelId,
            totalMessages: 0,
            totalTokens: 0,
            totalCost: 0,
            averageResponseTime: 0,
            firstUsed: now,
            lastUsed: now,
          };
        }

        const usage = modelUsage[modelId];
        const newMessageCount = usage.totalMessages + 1;
        const newAverageResponseTime = 
          (usage.averageResponseTime * usage.totalMessages + responseTime) / newMessageCount;

        modelUsage[modelId] = {
          ...usage,
          totalMessages: newMessageCount,
          totalTokens: usage.totalTokens + tokens,
          totalCost: usage.totalCost + cost,
          averageResponseTime: newAverageResponseTime,
          lastUsed: now,
        };

        // Update cost tracking
        const costByModel = { ...state.costByModel };
        costByModel[modelId] = (costByModel[modelId] || 0) + cost;

        const costByDate = { ...state.costByDate };
        costByDate[today] = (costByDate[today] || 0) + cost;

        // Update daily stats
        const dailyStats = [...state.dailyStats];
        let todayStats = dailyStats.find(s => s.date === today);
        
        if (!todayStats) {
          todayStats = {
            date: today,
            timestamp: now,
            messages: 0,
            tokens: 0,
            cost: 0,
            sessions: 0,
            averageResponseTime: 0,
          };
          dailyStats.push(todayStats);
        }

        const todayIndex = dailyStats.findIndex(s => s.date === today);
        const newDailyMessageCount = todayStats.messages + 1;
        
        dailyStats[todayIndex] = {
          ...todayStats,
          messages: newDailyMessageCount,
          tokens: todayStats.tokens + tokens,
          cost: todayStats.cost + cost,
          averageResponseTime: 
            (todayStats.averageResponseTime * todayStats.messages + responseTime) / newDailyMessageCount,
        };

        // Calculate averages
        const averageResponseTime = 
          (state.averageResponseTime * state.totalMessages + responseTime) / newTotalMessages;
        const averageTokensPerMessage = newTotalTokens / newTotalMessages;
        const averageCostPerMessage = newTotalCost / newTotalMessages;

        return {
          totalMessages: newTotalMessages,
          totalTokens: newTotalTokens,
          totalCost: newTotalCost,
          modelUsage,
          costByModel,
          costByDate,
          dailyStats: dailyStats.sort((a, b) => b.timestamp - a.timestamp),
          averageResponseTime,
          averageTokensPerMessage,
          averageCostPerMessage,
        };
      });

      get().saveToStorage();
    },

    // Record session statistics
    recordSession: (_modelId, _messageCount, _totalTokens, _totalCost) => {
      const now = Date.now();
      const today = new Date(now).toDateString();

      set((state) => {
        const newTotalSessions = state.totalSessions + 1;

        // Update daily stats
        const dailyStats = [...state.dailyStats];
        let todayStats = dailyStats.find(s => s.date === today);
        
        if (!todayStats) {
          todayStats = {
            date: today,
            timestamp: now,
            messages: 0,
            tokens: 0,
            cost: 0,
            sessions: 0,
            averageResponseTime: 0,
          };
          dailyStats.push(todayStats);
        }

        const todayIndex = dailyStats.findIndex(s => s.date === today);
        dailyStats[todayIndex] = {
          ...todayStats,
          sessions: todayStats.sessions + 1,
        };

        return {
          totalSessions: newTotalSessions,
          dailyStats: dailyStats.sort((a, b) => b.timestamp - a.timestamp),
        };
      });

      get().saveToStorage();
    },

    // Calculate cost analysis
    calculateCostAnalysis: (startDate, endDate) => {
      const { costByModel, costByDate, dateRange } = get();
      
      const start = startDate || dateRange.start;
      const end = endDate || dateRange.end;

      // Filter data by date range
      const filteredCostByDate = Object.entries(costByDate).filter(([date]) => {
        const timestamp = new Date(date).getTime();
        return timestamp >= start && timestamp <= end;
      });

      const totalCost = filteredCostByDate.reduce((sum, [, cost]) => sum + cost, 0);
      const averageDailyCost = totalCost / Math.max(1, filteredCostByDate.length);

      // Calculate cost distribution
      const costDistribution = Object.entries(costByModel).map(([modelId, cost]) => ({
        modelId,
        cost,
        percentage: (cost / totalCost) * 100,
      })).sort((a, b) => b.cost - a.cost);

      // Calculate trends
      const sortedDates = filteredCostByDate.sort(([a], [b]) => 
        new Date(a).getTime() - new Date(b).getTime()
      );

      const trend = sortedDates.length > 1 
        ? ((sortedDates[sortedDates.length - 1][1] - sortedDates[0][1]) / sortedDates[0][1]) * 100
        : 0;

      return {
        totalCost,
        averageDailyCost,
        costDistribution,
        trend,
        period: { start, end },
      };
    },

    // Get model usage statistics
    getModelUsageStats: (modelId) => {
      const { modelUsage } = get();
      
      if (modelId) {
        return modelUsage[modelId] || null;
      }
      
      return modelUsage;
    },

    // Get time series data
    getTimeSeriesData: (period, startDate, endDate) => {
      const { dailyStats, weeklyStats, monthlyStats, dateRange } = get();
      
      const start = startDate || dateRange.start;
      const end = endDate || dateRange.end;

      let data: TimeSeriesData[];
      
      switch (period) {
        case 'daily':
          data = dailyStats;
          break;
        case 'weekly':
          data = weeklyStats;
          break;
        case 'monthly':
          data = monthlyStats;
          break;
        default:
          data = dailyStats;
      }

      return data.filter(item => 
        item.timestamp >= start && item.timestamp <= end
      ).sort((a, b) => a.timestamp - b.timestamp);
    },

    // Set date range
    setDateRange: (start, end) => {
      set({ dateRange: { start, end } });
    },

    // Get statistics for period
    getStatsForPeriod: (startDate, endDate) => {
      const { dailyStats } = get();
      
      const filteredStats = dailyStats.filter(stat => 
        stat.timestamp >= startDate && stat.timestamp <= endDate
      );

      const totalMessages = filteredStats.reduce((sum, stat) => sum + stat.messages, 0);
      const totalTokens = filteredStats.reduce((sum, stat) => sum + stat.tokens, 0);
      const totalCost = filteredStats.reduce((sum, stat) => sum + stat.cost, 0);
      const totalSessions = filteredStats.reduce((sum, stat) => sum + stat.sessions, 0);

      const averageResponseTime = filteredStats.length > 0
        ? filteredStats.reduce((sum, stat) => sum + stat.averageResponseTime, 0) / filteredStats.length
        : 0;

      return {
        totalMessages,
        totalTokens,
        totalCost,
        totalSessions,
        averageResponseTime,
        period: { startDate, endDate },
      };
    },

    // Get top models by usage
    getTopModels: (limit = 10) => {
      const { modelUsage } = get();
      
      return Object.entries(modelUsage)
        .map(([modelId, usage]) => ({ modelId, usage }))
        .sort((a, b) => b.usage.totalCost - a.usage.totalCost)
        .slice(0, limit);
    },

    // Calculate trends
    calculateTrends: () => {
      const { dailyStats } = get();
      
      // Calculate daily trends (last 30 days)
      const last30Days = dailyStats.slice(0, 30);
      const dailyCosts = last30Days.map(stat => stat.cost);
      
      // Calculate weekly trends (last 12 weeks)
      const weeklyStats: TimeSeriesData[] = [];
      for (let i = 0; i < dailyStats.length; i += 7) {
        const weekData = dailyStats.slice(i, i + 7);
        if (weekData.length > 0) {
          const weekStart = weekData[weekData.length - 1].timestamp;
          const weekStats = weekData.reduce((acc, day) => ({
            messages: acc.messages + day.messages,
            tokens: acc.tokens + day.tokens,
            cost: acc.cost + day.cost,
            sessions: acc.sessions + day.sessions,
          }), { messages: 0, tokens: 0, cost: 0, sessions: 0 });

          weeklyStats.push({
            date: new Date(weekStart).toISOString().split('T')[0],
            timestamp: weekStart,
            ...weekStats,
            averageResponseTime: weekData.reduce((sum, day) => sum + day.averageResponseTime, 0) / weekData.length,
          });
        }
      }

      // Calculate monthly trends (last 12 months)
      const monthlyStats: TimeSeriesData[] = [];
      const monthlyGroups: Record<string, TimeSeriesData[]> = {};
      
      dailyStats.forEach(stat => {
        const monthKey = new Date(stat.timestamp).toISOString().slice(0, 7); // YYYY-MM
        if (!monthlyGroups[monthKey]) {
          monthlyGroups[monthKey] = [];
        }
        monthlyGroups[monthKey].push(stat);
      });

      Object.entries(monthlyGroups).forEach(([monthKey, monthData]) => {
        const monthStats = monthData.reduce((acc, day) => ({
          messages: acc.messages + day.messages,
          tokens: acc.tokens + day.tokens,
          cost: acc.cost + day.cost,
          sessions: acc.sessions + day.sessions,
        }), { messages: 0, tokens: 0, cost: 0, sessions: 0 });

        monthlyStats.push({
          date: monthKey,
          timestamp: new Date(monthKey).getTime(),
          ...monthStats,
          averageResponseTime: monthData.reduce((sum, day) => sum + day.averageResponseTime, 0) / monthData.length,
        });
      });

      set({
        weeklyStats: weeklyStats.slice(0, 12).sort((a, b) => b.timestamp - a.timestamp),
        monthlyStats: monthlyStats.slice(0, 12).sort((a, b) => b.timestamp - a.timestamp),
        costTrends: {
          daily: dailyCosts,
          weekly: weeklyStats.slice(0, 12).map(stat => stat.cost),
          monthly: monthlyStats.slice(0, 12).map(stat => stat.cost),
        },
      });
    },

    // Get cost trend
    getCostTrend: (period) => {
      const { costTrends } = get();
      return costTrends[period] || [];
    },

    // Get usage trend
    getUsageTrend: (period) => {
      const data = get().getTimeSeriesData(period);
      return data.map(item => item.messages);
    },

    // Set loading state
    setLoading: (key, value) => {
      set((state) => ({
        loading: {
          ...state.loading,
          [key]: value,
        },
      }));
    },

    // Set error state
    setError: (key, value) => {
      set((state) => ({
        errors: {
          ...state.errors,
          [key]: value,
        },
      }));
    },

    // Load from storage
    loadFromStorage: () => {
      try {
        const stats = storageService.get(STORAGE_KEYS.USAGE_STATS) || {};
        
        set({
          totalSessions: stats.totalSessions || 0,
          totalMessages: stats.totalMessages || 0,
          totalTokens: stats.totalTokens || 0,
          totalCost: stats.totalCost || 0,
          modelUsage: stats.modelUsage || {},
          dailyStats: stats.dailyStats || [],
          weeklyStats: stats.weeklyStats || [],
          monthlyStats: stats.monthlyStats || [],
          costByModel: stats.costByModel || {},
          costByDate: stats.costByDate || {},
          costTrends: stats.costTrends || { daily: [], weekly: [], monthly: [] },
          averageResponseTime: stats.averageResponseTime || 0,
          averageTokensPerMessage: stats.averageTokensPerMessage || 0,
          averageCostPerMessage: stats.averageCostPerMessage || 0,
        });

        // Calculate trends after loading
        get().calculateTrends();
      } catch (error) {
        console.error('Failed to load stats data from storage:', error);
        get().setError('stats', 'Failed to load statistics');
      }
    },

    // Save to storage
    saveToStorage: () => {
      try {
        const state = get();
        const statsData = {
          totalSessions: state.totalSessions,
          totalMessages: state.totalMessages,
          totalTokens: state.totalTokens,
          totalCost: state.totalCost,
          modelUsage: state.modelUsage,
          dailyStats: state.dailyStats,
          weeklyStats: state.weeklyStats,
          monthlyStats: state.monthlyStats,
          costByModel: state.costByModel,
          costByDate: state.costByDate,
          costTrends: state.costTrends,
          averageResponseTime: state.averageResponseTime,
          averageTokensPerMessage: state.averageTokensPerMessage,
          averageCostPerMessage: state.averageCostPerMessage,
          lastUpdated: Date.now(),
        };

        storageService.set(STORAGE_KEYS.USAGE_STATS, statsData);
      } catch (error) {
        console.error('Failed to save stats data to storage:', error);
        get().setError('stats', 'Failed to save statistics');
      }
    },

    // Export statistics
    exportStats: (format) => {
      const state = get();
      
      if (format === 'csv') {
        // Convert to CSV format
        const headers = ['Date', 'Messages', 'Tokens', 'Cost', 'Sessions', 'Avg Response Time'];
        const rows = state.dailyStats.map(stat => [
          stat.date,
          stat.messages,
          stat.tokens,
          stat.cost.toFixed(4),
          stat.sessions,
          stat.averageResponseTime.toFixed(2),
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
      }

      // JSON format
      return JSON.stringify({
        summary: {
          totalSessions: state.totalSessions,
          totalMessages: state.totalMessages,
          totalTokens: state.totalTokens,
          totalCost: state.totalCost,
        },
        modelUsage: state.modelUsage,
        dailyStats: state.dailyStats,
        costAnalysis: state.costByModel,
        exportedAt: Date.now(),
      }, null, 2);
    },

    // Generate comprehensive report
    generateReport: (startDate, endDate) => {
      const state = get();
      const summary = state.getStatsForPeriod(
        startDate || state.dateRange.start,
        endDate || state.dateRange.end
      );
      const costAnalysis = state.calculateCostAnalysis(startDate, endDate);

      return {
        summary,
        modelBreakdown: state.modelUsage,
        costAnalysis,
        trends: {
          daily: state.getCostTrend('daily'),
          weekly: state.getCostTrend('weekly'),
          monthly: state.getCostTrend('monthly'),
        },
      };
    },

    // Reset statistics
    reset: () => {
      set(initialState);
      get().saveToStorage();
    },

    // Clear old data
    clearOldData: (olderThanDays) => {
      const cutoffDate = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
      
      set((state) => ({
        dailyStats: state.dailyStats.filter(stat => stat.timestamp >= cutoffDate),
      }));

      get().calculateTrends();
      get().saveToStorage();
    },
  }))
);

// Auto-save subscription
useStatsStore.subscribe(
  (state) => ({ 
    totalMessages: state.totalMessages, 
    totalSessions: state.totalSessions,
    dailyStats: state.dailyStats,
  }),
  () => {
    // Debounced auto-save
    const timeoutId = setTimeout(() => {
      useStatsStore.getState().saveToStorage();
    }, 5000); // Longer delay for stats to avoid frequent saves

    return () => clearTimeout(timeoutId);
  },
  { 
    equalityFn: (a, b) => 
      a.totalMessages === b.totalMessages && 
      a.totalSessions === b.totalSessions &&
      a.dailyStats === b.dailyStats
  }
);

// Load initial data
useStatsStore.getState().loadFromStorage();