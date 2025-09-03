/**
 * Storage Migrations
 * Defines data migration functions for version upgrades
 */

import type { StorageMigration } from '../types/storage';
import { storageService } from './storage';

// Migration from version 0.0.0 to 1.0.0
const migration_0_0_0_to_1_0_0: StorageMigration = {
  fromVersion: '0.0.0',
  toVersion: '1.0.0',
  description: 'Initial migration - add version tracking and normalize data structure',
  migrate: (data: any) => {
    // Add version field if missing
    if (!data.version) {
      data.version = '1.0.0';
    }

    // Add timestamps if missing
    if (!data.createdAt && !data.updatedAt) {
      const now = Date.now();
      data.createdAt = now;
      data.updatedAt = now;
    }

    // Normalize API config structure
    if (data.endpoint && !data.parameters) {
      data.parameters = {
        temperature: 0.7,
        maxTokens: 2048,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
      };
    }

    // Normalize chat message structure
    if (Array.isArray(data) && data.length > 0 && data[0].content) {
      // This is a messages array
      return data.map((message: any) => ({
        ...message,
        id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: message.timestamp || Date.now(),
        tokens: message.tokens || { input: 0, output: 0, total: 0 },
        cost: message.cost || 0,
      }));
    }

    return data;
  },
};

// Migration from version 1.0.0 to 1.1.0
const migration_1_0_0_to_1_1_0: StorageMigration = {
  fromVersion: '1.0.0',
  toVersion: '1.1.0',
  description: 'Add enhanced statistics tracking and model usage data',
  migrate: (data: any) => {
    // Add enhanced statistics fields
    if (data.totalMessages !== undefined) {
      // This is stats data
      return {
        ...data,
        version: '1.1.0',
        modelUsage: data.modelUsage || {},
        dailyStats: data.dailyStats || [],
        costByModel: data.costByModel || {},
        costByDate: data.costByDate || {},
        averageResponseTime: data.averageResponseTime || 0,
        averageTokensPerMessage: data.averageTokensPerMessage || 0,
        averageCostPerMessage: data.averageCostPerMessage || 0,
      };
    }

    // Add model usage tracking to sessions
    if (data.messages && Array.isArray(data.messages)) {
      return {
        ...data,
        version: '1.1.0',
        totalTokens: data.totalTokens || 0,
        totalCost: data.totalCost || 0,
        messageCount: data.messageCount || data.messages.length,
      };
    }

    return {
      ...data,
      version: '1.1.0',
    };
  },
};

// Migration from version 1.1.0 to 1.2.0
const migration_1_1_0_to_1_2_0: StorageMigration = {
  fromVersion: '1.1.0',
  toVersion: '1.2.0',
  description: 'Add file attachment support and enhanced test configurations',
  migrate: (data: any) => {
    // Add file attachment support to messages
    if (data.messages && Array.isArray(data.messages)) {
      return {
        ...data,
        version: '1.2.0',
        messages: data.messages.map((message: any) => ({
          ...message,
          attachments: message.attachments || [],
        })),
      };
    }

    // Add enhanced test configuration
    if (data.configuration && data.status) {
      // This is test data
      return {
        ...data,
        version: '1.2.0',
        configuration: {
          ...data.configuration,
          concurrent: data.configuration.concurrent || 1,
          timeout: data.configuration.timeout || 30000,
          retries: data.configuration.retries || 0,
        },
      };
    }

    // Add new settings
    if (data.theme !== undefined) {
      // This is settings data
      return {
        ...data,
        version: '1.2.0',
        showTokenCount: data.showTokenCount !== undefined ? data.showTokenCount : true,
        showCost: data.showCost !== undefined ? data.showCost : true,
        streamingEnabled: data.streamingEnabled !== undefined ? data.streamingEnabled : true,
      };
    }

    return {
      ...data,
      version: '1.2.0',
    };
  },
};

// Register all migrations
export const registerMigrations = (): void => {
  storageService.addMigration(migration_0_0_0_to_1_0_0);
  storageService.addMigration(migration_1_0_0_to_1_1_0);
  storageService.addMigration(migration_1_1_0_to_1_2_0);
};

// Utility function to create a new migration
export const createMigration = (
  fromVersion: string,
  toVersion: string,
  description: string,
  migrateFn: (data: any) => any
): StorageMigration => {
  return {
    fromVersion,
    toVersion,
    description,
    migrate: migrateFn,
  };
};

// Utility function to backup data before migration
export const backupDataBeforeMigration = (): boolean => {
  try {
    const backup = storageService.exportAll();
    const backupKey = `backup_${Date.now()}`;
    localStorage.setItem(backupKey, JSON.stringify(backup));
    
    console.log(`Data backed up to ${backupKey}`);
    return true;
  } catch (error) {
    console.error('Failed to backup data before migration:', error);
    return false;
  }
};

// Utility function to restore from backup
export const restoreFromBackup = (backupKey: string): boolean => {
  try {
    const backupData = localStorage.getItem(backupKey);
    if (!backupData) {
      console.error('Backup not found:', backupKey);
      return false;
    }

    const backup = JSON.parse(backupData);
    return storageService.importAll(backup);
  } catch (error) {
    console.error('Failed to restore from backup:', error);
    return false;
  }
};

// Utility function to list available backups
export const listBackups = (): string[] => {
  const backups: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('backup_')) {
      backups.push(key);
    }
  }
  
  return backups.sort().reverse(); // Most recent first
};

// Utility function to clean old backups
export const cleanOldBackups = (keepCount: number = 5): void => {
  const backups = listBackups();
  
  if (backups.length > keepCount) {
    const toDelete = backups.slice(keepCount);
    toDelete.forEach(backup => {
      localStorage.removeItem(backup);
      console.log(`Removed old backup: ${backup}`);
    });
  }
};