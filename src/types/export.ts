/**
 * Data Export/Import Types
 * Defines interfaces for data backup, export, and import functionality
 */

import type { APIConfig } from './api';
import type { ChatSession } from './chat';
import type { ModelPrice } from './model';
import type { AppSettings } from './settings';

export interface ExportData {
  version: string;
  exportedAt: number;
  exportType: ExportType;
  configs?: APIConfig[];
  sessions?: ChatSession[];
  modelPrices?: Record<string, ModelPrice>;
  settings?: AppSettings;
  metadata?: ExportMetadata;
}

export type ExportType = 'full' | 'configs' | 'sessions' | 'settings' | 'prices';

export interface ExportMetadata {
  appVersion: string;
  totalSessions: number;
  totalMessages: number;
  dateRange?: {
    start: number;
    end: number;
  };
  fileSize: number;
  checksum?: string;
}

export interface ImportResult {
  success: boolean;
  importedItems: {
    configs: number;
    sessions: number;
    modelPrices: number;
    settings: boolean;
  };
  errors: ImportError[];
  warnings: string[];
}

export interface ImportError {
  type: 'validation' | 'format' | 'version' | 'data';
  message: string;
  field?: string;
  item?: string;
}

export interface ExportOptions {
  includeConfigs: boolean;
  includeSessions: boolean;
  includeSettings: boolean;
  includePrices: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  format: 'json' | 'markdown' | 'csv';
  compression?: boolean;
}

export interface MarkdownExportOptions {
  includeMetadata: boolean;
  includeStatistics: boolean;
  groupBySession: boolean;
  includeTimestamps: boolean;
}