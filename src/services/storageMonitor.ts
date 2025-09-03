/**
 * Storage Monitor
 * Monitors storage usage and provides cleanup recommendations
 */

import { storageService } from './storage';
import { STORAGE_KEYS, STORAGE_LIMITS } from '../types/storage';

export interface StorageAnalysis {
  totalUsage: number;
  breakdown: Record<string, number>;
  recommendations: string[];
  canCleanup: boolean;
  estimatedSavings: number;
}

export interface StorageAlert {
  type: 'warning' | 'critical' | 'info';
  message: string;
  action?: () => void;
  actionLabel?: string;
}

class StorageMonitor {
  private listeners: Set<(analysis: StorageAnalysis) => void> = new Set();
  private alertListeners: Set<(alert: StorageAlert) => void> = new Set();
  private monitoringInterval: NodeJS.Timeout | null = null;

  /**
   * Start monitoring storage usage
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.monitoringInterval = setInterval(() => {
      this.checkStorageUsage();
    }, intervalMs);

    // Initial check
    this.checkStorageUsage();
  }

  /**
   * Stop monitoring storage usage
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Analyze current storage usage
   */
  analyzeStorage(): StorageAnalysis {
    const breakdown: Record<string, number> = {};
    let totalUsage = 0;

    // Calculate usage for each storage key
    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      const data = localStorage.getItem(key);
      if (data) {
        const size = new Blob([data]).size;
        breakdown[name] = size;
        totalUsage += size;
      } else {
        breakdown[name] = 0;
      }
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations(breakdown, totalUsage);
    
    // Calculate potential savings
    const estimatedSavings = this.calculatePotentialSavings(breakdown);

    return {
      totalUsage,
      breakdown,
      recommendations,
      canCleanup: estimatedSavings > 0,
      estimatedSavings,
    };
  }

  /**
   * Generate cleanup recommendations
   */
  private generateRecommendations(breakdown: Record<string, number>, totalUsage: number): string[] {
    const recommendations: string[] = [];
    const usagePercentage = (totalUsage / STORAGE_LIMITS.MAX_TOTAL_SIZE) * 100;

    // Check overall usage
    if (usagePercentage > 90) {
      recommendations.push('Critical: Storage usage is above 90%. Immediate cleanup required.');
    } else if (usagePercentage > 80) {
      recommendations.push('Warning: Storage usage is above 80%. Consider cleaning up old data.');
    }

    // Check individual components
    Object.entries(breakdown).forEach(([name, size]) => {
      const percentage = (size / totalUsage) * 100;
      
      if (percentage > 40) {
        recommendations.push(`${name} is using ${percentage.toFixed(1)}% of storage. Consider cleanup.`);
      }

      // Specific recommendations
      switch (name) {
        case 'CHAT_SESSIONS':
          if (size > 10 * 1024 * 1024) { // 10MB
            recommendations.push('Consider archiving old chat sessions or reducing message history.');
          }
          break;
        case 'FILE_CACHE':
          if (size > 5 * 1024 * 1024) { // 5MB
            recommendations.push('File cache is large. Clear cached files to free up space.');
          }
          break;
        case 'PERFORMANCE_TESTS':
          if (size > 5 * 1024 * 1024) { // 5MB
            recommendations.push('Performance test results are taking up space. Archive old test data.');
          }
          break;
        case 'USAGE_STATS':
          if (size > 2 * 1024 * 1024) { // 2MB
            recommendations.push('Usage statistics are large. Consider reducing retention period.');
          }
          break;
      }
    });

    return recommendations;
  }

  /**
   * Calculate potential storage savings
   */
  private calculatePotentialSavings(breakdown: Record<string, number>): number {
    let savings = 0;

    // File cache can be completely cleared
    savings += breakdown.FILE_CACHE || 0;

    // Old performance test results (keep last 10)
    const testData = storageService.get(STORAGE_KEYS.PERFORMANCE_TESTS);
    if (testData && Array.isArray(testData) && testData.length > 10) {
      const oldTests = testData.slice(10);
      const oldTestsSize = new Blob([JSON.stringify(oldTests)]).size;
      savings += oldTestsSize;
    }

    // Old chat sessions (keep last 50)
    const chatData = storageService.get(STORAGE_KEYS.CHAT_SESSIONS);
    if (chatData && Array.isArray(chatData) && chatData.length > 50) {
      const oldSessions = chatData.slice(50);
      const oldSessionsSize = new Blob([JSON.stringify(oldSessions)]).size;
      savings += oldSessionsSize;
    }

    // Old usage stats (keep last 90 days)
    const statsData = storageService.get(STORAGE_KEYS.USAGE_STATS);
    if (statsData && statsData.dailyStats) {
      const cutoffDate = Date.now() - (90 * 24 * 60 * 60 * 1000);
      const oldStats = statsData.dailyStats.filter((stat: any) => stat.timestamp < cutoffDate);
      if (oldStats.length > 0) {
        const oldStatsSize = new Blob([JSON.stringify(oldStats)]).size;
        savings += oldStatsSize;
      }
    }

    return savings;
  }

  /**
   * Check storage usage and emit alerts if needed
   */
  private checkStorageUsage(): void {
    const analysis = this.analyzeStorage();
    const usagePercentage = (analysis.totalUsage / STORAGE_LIMITS.MAX_TOTAL_SIZE) * 100;

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(analysis);
      } catch (error) {
        console.error('Storage analysis listener error:', error);
      }
    });

    // Generate alerts
    if (usagePercentage >= STORAGE_LIMITS.CLEANUP_THRESHOLD * 100) {
      this.emitAlert({
        type: 'critical',
        message: `Storage usage is at ${usagePercentage.toFixed(1)}%. Automatic cleanup will be triggered.`,
        action: () => storageService.cleanup(),
        actionLabel: 'Clean Now',
      });
    } else if (usagePercentage >= STORAGE_LIMITS.WARNING_THRESHOLD * 100) {
      this.emitAlert({
        type: 'warning',
        message: `Storage usage is at ${usagePercentage.toFixed(1)}%. Consider cleaning up old data.`,
        action: () => this.performRecommendedCleanup(),
        actionLabel: 'Clean Up',
      });
    }

    // Check for large individual items
    Object.entries(analysis.breakdown).forEach(([name, size]) => {
      if (size > STORAGE_LIMITS.MAX_SINGLE_ITEM) {
        this.emitAlert({
          type: 'warning',
          message: `${name} is using ${(size / (1024 * 1024)).toFixed(1)}MB. Consider reducing this data.`,
        });
      }
    });
  }

  /**
   * Perform recommended cleanup actions
   */
  performRecommendedCleanup(): void {
    try {
      // Clear file cache
      storageService.remove(STORAGE_KEYS.FILE_CACHE);

      // Clean old performance tests
      const tests = storageService.get(STORAGE_KEYS.PERFORMANCE_TESTS);
      if (tests && Array.isArray(tests) && tests.length > 10) {
        const recentTests = tests.slice(0, 10);
        storageService.set(STORAGE_KEYS.PERFORMANCE_TESTS, recentTests);
      }

      // Clean old chat sessions
      const sessions = storageService.get(STORAGE_KEYS.CHAT_SESSIONS);
      if (sessions && Array.isArray(sessions) && sessions.length > 50) {
        const recentSessions = sessions
          .sort((a: any, b: any) => b.updatedAt - a.updatedAt)
          .slice(0, 50);
        storageService.set(STORAGE_KEYS.CHAT_SESSIONS, recentSessions);
      }

      // Clean old usage stats
      const stats = storageService.get(STORAGE_KEYS.USAGE_STATS);
      if (stats && stats.dailyStats) {
        const cutoffDate = Date.now() - (90 * 24 * 60 * 60 * 1000);
        const recentStats = {
          ...stats,
          dailyStats: stats.dailyStats.filter((stat: any) => stat.timestamp >= cutoffDate),
        };
        storageService.set(STORAGE_KEYS.USAGE_STATS, recentStats);
      }

      this.emitAlert({
        type: 'info',
        message: 'Storage cleanup completed successfully.',
      });
    } catch (error) {
      console.error('Failed to perform cleanup:', error);
      this.emitAlert({
        type: 'critical',
        message: 'Storage cleanup failed. Manual intervention may be required.',
      });
    }
  }

  /**
   * Emit storage alert
   */
  private emitAlert(alert: StorageAlert): void {
    this.alertListeners.forEach(listener => {
      try {
        listener(alert);
      } catch (error) {
        console.error('Storage alert listener error:', error);
      }
    });
  }

  /**
   * Subscribe to storage analysis updates
   */
  subscribe(callback: (analysis: StorageAnalysis) => void): () => void {
    this.listeners.add(callback);
    
    // Send current analysis
    callback(this.analyzeStorage());

    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Subscribe to storage alerts
   */
  subscribeToAlerts(callback: (alert: StorageAlert) => void): () => void {
    this.alertListeners.add(callback);

    return () => {
      this.alertListeners.delete(callback);
    };
  }

  /**
   * Get storage usage summary
   */
  getUsageSummary(): {
    used: string;
    available: string;
    percentage: number;
    status: 'good' | 'warning' | 'critical';
  } {
    const info = storageService.getStorageInfo();
    const percentage = info.percentage;
    
    let status: 'good' | 'warning' | 'critical' = 'good';
    if (percentage >= STORAGE_LIMITS.CLEANUP_THRESHOLD * 100) {
      status = 'critical';
    } else if (percentage >= STORAGE_LIMITS.WARNING_THRESHOLD * 100) {
      status = 'warning';
    }

    return {
      used: this.formatBytes(info.used),
      available: this.formatBytes(info.available),
      percentage,
      status,
    };
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Create singleton instance
export const storageMonitor = new StorageMonitor();