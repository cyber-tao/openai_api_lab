/**
 * Data Validation Utilities
 * Implements validation functions for data integrity checking
 */

import type { ValidationSchema, ValidationResult, ValidationError } from '../types/storage';

/**
 * Validates data against a schema
 */
export function validateData(data: any, schema: ValidationSchema, path = ''): ValidationResult {
  const errors: ValidationError[] = [];

  // Type validation
  if (!validateType(data, schema.type)) {
    errors.push({
      path,
      message: `Expected ${schema.type}, got ${typeof data}`,
      value: data,
    });
    return { valid: false, errors };
  }

  // Object validation
  if (schema.type === 'object' && data !== null) {
    // Required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          errors.push({
            path: path ? `${path}.${field}` : field,
            message: `Required field '${field}' is missing`,
          });
        }
      }
    }

    // Property validation
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in data) {
          const propPath = path ? `${path}.${key}` : key;
          const propResult = validateData(data[key], propSchema, propPath);
          errors.push(...propResult.errors);
        }
      }
    }
  }

  // Array validation
  if (schema.type === 'array' && Array.isArray(data)) {
    if (schema.items) {
      data.forEach((item, index) => {
        const itemPath = `${path}[${index}]`;
        const itemResult = validateData(item, schema.items!, itemPath);
        errors.push(...itemResult.errors);
      });
    }
  }

  // String validation
  if (schema.type === 'string' && typeof data === 'string') {
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push({
        path,
        message: `String length ${data.length} is less than minimum ${schema.minLength}`,
        value: data,
      });
    }

    if (schema.maxLength !== undefined && data.length > schema.maxLength) {
      errors.push({
        path,
        message: `String length ${data.length} exceeds maximum ${schema.maxLength}`,
        value: data,
      });
    }

    if (schema.pattern && !new RegExp(schema.pattern).test(data)) {
      errors.push({
        path,
        message: `String does not match pattern ${schema.pattern}`,
        value: data,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates the type of a value
 */
function validateType(value: any, expectedType: string): boolean {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'object':
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    default:
      return false;
  }
}

/**
 * Sanitizes data by removing invalid fields
 */
export function sanitizeData<T>(data: any, schema: ValidationSchema): T {
  if (schema.type === 'object' && data && typeof data === 'object') {
    const sanitized: any = {};
    
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in data) {
          sanitized[key] = sanitizeData(data[key], propSchema);
        }
      }
    }
    
    return sanitized;
  }

  if (schema.type === 'array' && Array.isArray(data) && schema.items) {
    return data.map(item => sanitizeData(item, schema.items!)) as T;
  }

  return data;
}

/**
 * Generates a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validates URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates API key format (basic check)
 */
export function isValidApiKey(apiKey: string): boolean {
  return apiKey.length >= 10 && /^[a-zA-Z0-9\-_.]+$/.test(apiKey);
}

/**
 * Validates file size
 */
export function isValidFileSize(size: number, maxSize: number): boolean {
  return size > 0 && size <= maxSize;
}

/**
 * Validates MIME type
 */
export function isValidMimeType(mimeType: string, allowedTypes: string[]): boolean {
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      return mimeType.startsWith(type.slice(0, -1));
    }
    return mimeType === type;
  });
}

/**
 * Validates API configuration
 */
export function validateAPIConfig(config: any): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!config.name || typeof config.name !== 'string') {
    errors.push('Configuration name is required');
  } else if (config.name.length < 2) {
    errors.push('Configuration name must be at least 2 characters');
  }

  if (!config.endpoint || typeof config.endpoint !== 'string') {
    errors.push('API endpoint is required');
  } else if (!isValidUrl(config.endpoint)) {
    errors.push('API endpoint must be a valid URL');
  }

  if (!config.apiKey || typeof config.apiKey !== 'string') {
    errors.push('API key is required');
  } else if (!isValidApiKey(config.apiKey)) {
    errors.push('API key format is invalid');
  }

  // Optional model validation
  if (config.model && typeof config.model !== 'string') {
    errors.push('Model must be a string');
  }

  // Parameters validation
  if (config.parameters) {
    const params = config.parameters;
    
    if (params.temperature !== undefined) {
      if (typeof params.temperature !== 'number' || params.temperature < 0 || params.temperature > 2) {
        errors.push('Temperature must be a number between 0 and 2');
      }
    }

    if (params.maxTokens !== undefined) {
      if (typeof params.maxTokens !== 'number' || params.maxTokens < 1 || params.maxTokens > 32000) {
        errors.push('Max tokens must be a number between 1 and 32000');
      }
    }

    if (params.topP !== undefined) {
      if (typeof params.topP !== 'number' || params.topP < 0 || params.topP > 1) {
        errors.push('Top P must be a number between 0 and 1');
      }
    }

    if (params.frequencyPenalty !== undefined) {
      if (typeof params.frequencyPenalty !== 'number' || params.frequencyPenalty < -2 || params.frequencyPenalty > 2) {
        errors.push('Frequency penalty must be a number between -2 and 2');
      }
    }

    if (params.presencePenalty !== undefined) {
      if (typeof params.presencePenalty !== 'number' || params.presencePenalty < -2 || params.presencePenalty > 2) {
        errors.push('Presence penalty must be a number between -2 and 2');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.map(message => ({ path: '', message })),
  };
}