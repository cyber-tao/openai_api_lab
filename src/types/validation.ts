/**
 * Data Validation Schemas
 * Defines validation schemas for data integrity checking
 */

import type { ValidationSchema } from './storage';

// API Configuration validation schema
export const API_CONFIG_SCHEMA: ValidationSchema = {
  type: 'object',
  required: ['id', 'name', 'endpoint', 'apiKey', 'parameters', 'isDefault', 'createdAt'],
  properties: {
    id: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1, maxLength: 100 },
    endpoint: { type: 'string', pattern: '^https?://.+' },
    apiKey: { type: 'string', minLength: 1 },
    model: { type: 'string' },
    parameters: {
      type: 'object',
      properties: {
        temperature: { type: 'number' },
        maxTokens: { type: 'number' },
        topP: { type: 'number' },
        frequencyPenalty: { type: 'number' },
        presencePenalty: { type: 'number' },
      },
    },
    isDefault: { type: 'boolean' },
    createdAt: { type: 'number' },
    updatedAt: { type: 'number' },
  },
};

// Chat Session validation schema
export const CHAT_SESSION_SCHEMA: ValidationSchema = {
  type: 'object',
  required: ['id', 'title', 'modelId', 'apiConfigId', 'messages', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1, maxLength: 200 },
    modelId: { type: 'string', minLength: 1 },
    apiConfigId: { type: 'string', minLength: 1 },
    messages: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'role', 'content', 'timestamp'],
        properties: {
          id: { type: 'string', minLength: 1 },
          role: { type: 'string', pattern: '^(user|assistant|system)$' },
          content: { type: 'string' },
          timestamp: { type: 'number' },
        },
      },
    },
    createdAt: { type: 'number' },
    updatedAt: { type: 'number' },
    totalTokens: { type: 'number' },
    totalCost: { type: 'number' },
    messageCount: { type: 'number' },
  },
};

// Model Price validation schema
export const MODEL_PRICE_SCHEMA: ValidationSchema = {
  type: 'object',
  required: ['input', 'output', 'currency', 'lastUpdated'],
  properties: {
    input: { type: 'number' },
    output: { type: 'number' },
    currency: { type: 'string', minLength: 3, maxLength: 3 },
    lastUpdated: { type: 'number' },
  },
};

// App Settings validation schema
export const APP_SETTINGS_SCHEMA: ValidationSchema = {
  type: 'object',
  required: ['theme', 'language', 'version', 'lastUpdated'],
  properties: {
    theme: { type: 'string', pattern: '^(dark|light|auto)$' },
    language: { type: 'string', pattern: '^(en|zh|auto)$' },
    compactMode: { type: 'boolean' },
    animations: { type: 'boolean' },
    autoSave: { type: 'boolean' },
    autoSaveInterval: { type: 'number' },
    maxFileSize: { type: 'number' },
    showStatistics: { type: 'boolean' },
    keyboardShortcuts: { type: 'boolean' },
    streamingEnabled: { type: 'boolean' },
    showTokenCount: { type: 'boolean' },
    showCost: { type: 'boolean' },
    maxStorageSize: { type: 'number' },
    autoCleanup: { type: 'boolean' },
    cleanupAfterDays: { type: 'number' },
    saveApiKeys: { type: 'boolean' },
    saveChatHistory: { type: 'boolean' },
    debugMode: { type: 'boolean' },
    logLevel: { type: 'string', pattern: '^(error|warn|info|debug)$' },
    version: { type: 'string', minLength: 1 },
    lastUpdated: { type: 'number' },
  },
};

// Export Data validation schema
export const EXPORT_DATA_SCHEMA: ValidationSchema = {
  type: 'object',
  required: ['version', 'exportedAt', 'exportType'],
  properties: {
    version: { type: 'string', minLength: 1 },
    exportedAt: { type: 'number' },
    exportType: { type: 'string', pattern: '^(full|configs|sessions|settings|prices)$' },
    configs: {
      type: 'array',
      items: API_CONFIG_SCHEMA,
    },
    sessions: {
      type: 'array',
      items: CHAT_SESSION_SCHEMA,
    },
    modelPrices: { type: 'object' },
    settings: APP_SETTINGS_SCHEMA,
  },
};

// File Attachment validation schema
export const FILE_ATTACHMENT_SCHEMA: ValidationSchema = {
  type: 'object',
  required: ['id', 'name', 'type', 'fileType', 'size', 'processingStatus', 'createdAt'],
  properties: {
    id: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1 },
    type: { type: 'string', minLength: 1 },
    fileType: { type: 'string', pattern: '^(text|image|audio|document|unknown)$' },
    size: { type: 'number' },
    content: { type: 'string' },
    dataUrl: { type: 'string' },
    processingStatus: { type: 'string', pattern: '^(pending|processing|completed|error)$' },
    error: { type: 'string' },
    createdAt: { type: 'number' },
  },
};