/**
 * Type Guards and Runtime Type Checking
 * Provides runtime type checking functions for better type safety
 */

import type { APIConfig, APIError } from './api';
import type { ModelInfo, ModelType } from './model';
import type { ChatSession, ChatMessage, MessageRole } from './chat';
import type { FileAttachment, FileType } from './file';
import type { AppSettings } from './settings';
import type { ExportData, ExportType } from './export';

/**
 * Type guard for APIConfig
 */
export function isAPIConfig(obj: any): obj is APIConfig {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.endpoint === 'string' &&
    typeof obj.apiKey === 'string' &&
    typeof obj.parameters === 'object' &&
    typeof obj.isDefault === 'boolean' &&
    typeof obj.createdAt === 'number'
  );
}

/**
 * Type guard for ModelInfo
 */
export function isModelInfo(obj: any): obj is ModelInfo {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    isModelType(obj.type) &&
    typeof obj.contextLength === 'number' &&
    Array.isArray(obj.capabilities) &&
    typeof obj.provider === 'string'
  );
}

/**
 * Type guard for ModelType
 */
export function isModelType(value: any): value is ModelType {
  return ['text', 'multimodal', 'embedding', 'image', 'audio'].includes(value);
}

/**
 * Type guard for ChatSession
 */
export function isChatSession(obj: any): obj is ChatSession {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.modelId === 'string' &&
    typeof obj.apiConfigId === 'string' &&
    Array.isArray(obj.messages) &&
    typeof obj.createdAt === 'number' &&
    typeof obj.updatedAt === 'number'
  );
}

/**
 * Type guard for ChatMessage
 */
export function isChatMessage(obj: any): obj is ChatMessage {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    isMessageRole(obj.role) &&
    typeof obj.content === 'string' &&
    typeof obj.timestamp === 'number'
  );
}

/**
 * Type guard for MessageRole
 */
export function isMessageRole(value: any): value is MessageRole {
  return ['user', 'assistant', 'system'].includes(value);
}

/**
 * Type guard for FileAttachment
 */
export function isFileAttachment(obj: any): obj is FileAttachment {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.type === 'string' &&
    isFileType(obj.fileType) &&
    typeof obj.size === 'number' &&
    ['pending', 'processing', 'completed', 'error'].includes(obj.processingStatus) &&
    typeof obj.createdAt === 'number'
  );
}

/**
 * Type guard for FileType
 */
export function isFileType(value: any): value is FileType {
  return ['text', 'image', 'audio', 'document', 'unknown'].includes(value);
}

/**
 * Type guard for AppSettings
 */
export function isAppSettings(obj: any): obj is AppSettings {
  return (
    obj &&
    typeof obj === 'object' &&
    ['dark', 'light', 'auto'].includes(obj.theme) &&
    ['en', 'zh', 'auto'].includes(obj.language) &&
    typeof obj.version === 'string' &&
    typeof obj.lastUpdated === 'number'
  );
}

/**
 * Type guard for ExportData
 */
export function isExportData(obj: any): obj is ExportData {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.version === 'string' &&
    typeof obj.exportedAt === 'number' &&
    isExportType(obj.exportType)
  );
}

/**
 * Type guard for ExportType
 */
export function isExportType(value: any): value is ExportType {
  return ['full', 'configs', 'sessions', 'settings', 'prices'].includes(value);
}

/**
 * Type guard for APIError
 */
export function isAPIError(obj: any): obj is APIError {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.code === 'string' &&
    typeof obj.message === 'string' &&
    ['network', 'auth', 'validation', 'server', 'unknown'].includes(obj.type)
  );
}

/**
 * Validates an array of items using a type guard
 */
export function validateArray<T>(
  items: any[],
  typeGuard: (item: any) => item is T
): { valid: T[]; invalid: any[] } {
  const valid: T[] = [];
  const invalid: any[] = [];

  for (const item of items) {
    if (typeGuard(item)) {
      valid.push(item);
    } else {
      invalid.push(item);
    }
  }

  return { valid, invalid };
}

/**
 * Safely parses JSON with type checking
 */
export function safeJsonParse<T>(
  json: string,
  typeGuard: (obj: any) => obj is T
): { success: true; data: T } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(json);
    if (typeGuard(parsed)) {
      return { success: true, data: parsed };
    } else {
      return { success: false, error: 'Invalid data format' };
    }
  } catch (error) {
    return { success: false, error: 'Invalid JSON format' };
  }
}

/**
 * Creates a type-safe object with default values
 */
export function createWithDefaults<T>(
  partial: Partial<T>,
  defaults: T,
  typeGuard: (obj: any) => obj is T
): T {
  const merged = { ...defaults, ...partial };
  if (typeGuard(merged)) {
    return merged;
  }
  return defaults;
}