/**
 * Real-Time Statistics Hook
 * React hook for accessing and updating real-time statistics
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { statisticsService } from '../services/statisticsService';
import { useChatStore } from '../stores/chatStore';
import type { 
  RealTimeStats
} from '../services/statisticsService';
import type { StatisticsSummary } from '../types';

export interface UseRealTimeStatsOptions {
  sessionId?: string;
  refreshInterval?: number; // in milliseconds
  autoRefresh?: boolean;
  includeGlobal?: boolean;
}

export interface UseRealTimeStatsReturn {
  // Current statistics
  stats: RealTimeStats | null;
  summary: StatisticsSummary | null;
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Actions
  refresh: () => void;
  clearCache: () => void;
  
  // Utilities
  formatCurrency: (amount: number) => string;
  formatTime: (ms: number) => string;
  formatNumber: (num: number, decimals?: number) => string;
  
  // Computed values
  isActive: boolean;
  hasData: boolean;
  lastUpdated: number | null;
}

export function useRealTimeStats(options: UseRealTimeStatsOptions = {}): UseRealTimeStatsReturn {
  const {
    sessionId,
    refreshInterval = 5000, // 5 seconds
    autoRefresh = true,
    includeGlobal = true,
  } = options;

  const [stats, setStats] = useState<RealTimeStats | null>(null);
  const [summary, setSummary] = useState<StatisticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const { activeSessionId, messages } = useChatStore();
  const effectiveSessionId = sessionId || activeSessionId;

  // Refresh statistics
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get real-time stats
      const realTimeStats = statisticsService.getRealTimeStats(effectiveSessionId || undefined);
      setStats(realTimeStats);

      // Get summary if requested
      if (includeGlobal) {
        const statisticsSummary = statisticsService.getStatisticsSummary();
        setSummary(statisticsSummary);
      }

      setLastUpdated(Date.now());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load statistics';
      setError(errorMessage);
      console.error('Failed to refresh statistics:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveSessionId, includeGlobal]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    // Initial load
    refresh();

    // Set up interval
    const interval = setInterval(refresh, refreshInterval);

    return () => clearInterval(interval);
  }, [refresh, autoRefresh, refreshInterval]);

  // Refresh when messages change
  useEffect(() => {
    if (autoRefresh && messages.length > 0) {
      // Debounce the refresh to avoid too frequent updates
      const timeoutId = setTimeout(refresh, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, refresh, autoRefresh]);

  // Clear cache
  const clearCache = useCallback(() => {
    statisticsService.clearCache();
    refresh();
  }, [refresh]);

  // Utility functions
  const formatCurrency = useCallback((amount: number): string => {
    if (amount < 0.000001) return '$0.000000';
    if (amount < 0.01) return `$${amount.toFixed(6)}`;
    return `$${amount.toFixed(2)}`;
  }, []);

  const formatTime = useCallback((ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }, []);

  const formatNumber = useCallback((num: number, decimals = 0): string => {
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals 
    });
  }, []);

  // Computed values
  const isActive = useMemo(() => {
    return !!effectiveSessionId && !!stats?.current.sessionId;
  }, [effectiveSessionId, stats]);

  const hasData = useMemo(() => {
    return !!stats && (stats.current.messageCount > 0 || stats.global.totalMessages > 0);
  }, [stats]);

  return {
    stats,
    summary,
    loading,
    error,
    refresh,
    clearCache,
    formatCurrency,
    formatTime,
    formatNumber,
    isActive,
    hasData,
    lastUpdated,
  };
}

// Hook for session-specific statistics
export function useSessionStats(sessionId?: string) {
  const { stats, loading, error, refresh, formatCurrency, formatTime, formatNumber } = useRealTimeStats({
    sessionId,
    includeGlobal: false,
  });

  const sessionStats = useMemo(() => {
    return stats?.current || null;
  }, [stats]);

  return {
    sessionStats,
    loading,
    error,
    refresh,
    formatCurrency,
    formatTime,
    formatNumber,
  };
}

// Hook for global statistics
export function useGlobalStats() {
  const { stats, summary, loading, error, refresh, formatCurrency, formatTime, formatNumber } = useRealTimeStats({
    includeGlobal: true,
    autoRefresh: true,
    refreshInterval: 10000, // 10 seconds for global stats
  });

  const globalStats = useMemo(() => {
    return stats?.global || null;
  }, [stats]);

  const modelStats = useMemo(() => {
    return stats?.models || [];
  }, [stats]);

  const performanceStats = useMemo(() => {
    return stats?.performance || null;
  }, [stats]);

  return {
    globalStats,
    modelStats,
    performanceStats,
    summary,
    loading,
    error,
    refresh,
    formatCurrency,
    formatTime,
    formatNumber,
  };
}

export default useRealTimeStats;