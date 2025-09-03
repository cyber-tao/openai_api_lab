/**
 * Stores Index
 * Central export point for all Zustand stores
 */

// Export all stores
export { useConfigStore } from './configStore';
export { useChatStore } from './chatStore';
export { useTestStore } from './testStore';
export { useStatsStore } from './statsStore';
export { useSettingsStore } from './settingsStore';

// Export storage service
export { storageService } from '../services/storage';

// Store types for convenience
export type {
  APIConfig,
  ModelInfo,
  ModelPrice,
  ChatSession,
  ChatMessage,
  FileAttachment,
  PerformanceTest,
  TestResult,
  TestConfiguration,
  ModelComparison,
  UsageStats,
  CostAnalysis,
  ModelUsage,
  TimeSeriesData,
  AppSettings,
} from '../types';

// Storage types
export type {
  StorageKey,
  StorageInfo,
  StorageItem,
  StorageMigration,
  ValidationSchema,
  ValidationResult,
  ValidationError,
} from '../types/storage';

// Store initialization utility
export const initializeStores = async (): Promise<void> => {
  try {
    // Initialize storage service first
    const { storageService } = await import('../services/storage');
    await storageService.initialize();
    
    // Load data for all stores
    const { useConfigStore } = await import('./configStore');
    const { useChatStore } = await import('./chatStore');
    const { useTestStore } = await import('./testStore');
    const { useStatsStore } = await import('./statsStore');
    const { useSettingsStore } = await import('./settingsStore');

    // Load initial data
    useSettingsStore.getState().loadFromStorage();
    useConfigStore.getState().loadFromStorage();
    useChatStore.getState().loadFromStorage();
    useTestStore.getState().loadFromStorage();
    useStatsStore.getState().loadFromStorage();

    console.log('All stores initialized successfully');
  } catch (error) {
    console.error('Failed to initialize stores:', error);
    throw error;
  }
};

// Store reset utility
export const resetAllStores = (): void => {
  try {
    const { useConfigStore } = require('./configStore');
    const { useChatStore } = require('./chatStore');
    const { useTestStore } = require('./testStore');
    const { useStatsStore } = require('./statsStore');
    const { useSettingsStore } = require('./settingsStore');

    useConfigStore.getState().reset();
    useChatStore.getState().reset();
    useTestStore.getState().reset();
    useStatsStore.getState().reset();
    useSettingsStore.getState().resetSettings();

    console.log('All stores reset successfully');
  } catch (error) {
    console.error('Failed to reset stores:', error);
  }
};

// Storage cleanup utility
export const cleanupStorage = async (): Promise<void> => {
  try {
    const { storageService } = await import('../services/storage');
    storageService.cleanup();
    console.log('Storage cleanup completed');
  } catch (error) {
    console.error('Failed to cleanup storage:', error);
  }
};

// Export data utility
export const exportAllData = () => {
  try {
    const { useConfigStore } = require('./configStore');
    const { useChatStore } = require('./chatStore');
    const { useTestStore } = require('./testStore');
    const { useStatsStore } = require('./statsStore');
    const { useSettingsStore } = require('./settingsStore');

    return {
      version: '1.0.0',
      exportedAt: Date.now(),
      configs: useConfigStore.getState().exportConfigs(),
      sessions: useChatStore.getState().exportAllSessions(),
      tests: useTestStore.getState().exportTests(),
      results: useTestStore.getState().exportResults(),
      stats: useStatsStore.getState().exportStats('json'),
      settings: useSettingsStore.getState().exportSettings(),
    };
  } catch (error) {
    console.error('Failed to export data:', error);
    return null;
  }
};

// Import data utility
export const importAllData = (data: any): boolean => {
  try {
    const { useConfigStore } = require('./configStore');
    const { useChatStore } = require('./chatStore');
    const { useTestStore } = require('./testStore');
    const { useSettingsStore } = require('./settingsStore');

    let success = true;

    if (data.configs) {
      success = useConfigStore.getState().importConfigs(data.configs) && success;
    }

    if (data.sessions) {
      success = useChatStore.getState().importSessions(data.sessions) && success;
    }

    if (data.tests) {
      success = useTestStore.getState().importTests(data.tests) && success;
    }

    if (data.results) {
      success = useTestStore.getState().importResults(data.results) && success;
    }

    if (data.settings) {
      success = useSettingsStore.getState().importSettings(data.settings) && success;
    }

    return success;
  } catch (error) {
    console.error('Failed to import data:', error);
    return false;
  }
};