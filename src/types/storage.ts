/**
 * Storage Constants and Types
 * Defines storage keys, validation schemas, and storage management interfaces
 */

// Storage key constants
export const STORAGE_KEYS = {
  API_CONFIGS: 'openai-lab-configs',
  CHAT_SESSIONS: 'openai-lab-sessions',
  MODEL_PRICES: 'openai-lab-prices',
  APP_SETTINGS: 'openai-lab-settings',
  USAGE_STATS: 'openai-lab-stats',
  PERFORMANCE_TESTS: 'openai-lab-tests',
  TEST_RESULTS: 'openai-lab-tests-results',
  TEST_COMPARISONS: 'openai-lab-tests-comparisons',
  FILE_CACHE: 'openai-lab-files',
  USER_PREFERENCES: 'openai-lab-preferences',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

export interface StorageInfo {
  used: number; // bytes used
  available: number; // bytes available
  total: number; // total storage quota
  percentage: number; // usage percentage
}

export interface StorageItem<T = any> {
  key: string;
  data: T;
  timestamp: number;
  version: string;
  size: number; // estimated size in bytes
}

export interface StorageMigration {
  fromVersion: string;
  toVersion: string;
  migrate: (data: any) => any;
  description: string;
}

export interface ValidationSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  required?: string[];
  properties?: Record<string, ValidationSchema>;
  items?: ValidationSchema;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  value?: any;
}

// Data version for migration management
export const DATA_VERSION = '1.0.0';

// Storage quota limits (in bytes)
export const STORAGE_LIMITS = {
  MAX_TOTAL_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_SINGLE_ITEM: 10 * 1024 * 1024, // 10MB
  WARNING_THRESHOLD: 0.8, // 80% usage warning
  CLEANUP_THRESHOLD: 0.9, // 90% usage triggers cleanup
} as const;