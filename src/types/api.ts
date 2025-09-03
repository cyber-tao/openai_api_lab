/**
 * API Configuration Types
 * Defines interfaces for API endpoint configuration and parameters
 */

export interface APIConfig {
  id: string;
  name: string;
  endpoint: string;
  apiKey: string;
  model?: string;
  parameters: APIParameters;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface APIParameters {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  responseTime?: number;
}

export interface APIError {
  code: string;
  message: string;
  type: 'network' | 'auth' | 'validation' | 'server' | 'unknown';
  details?: Record<string, any>;
}

export interface ConnectionTestResult {
  success: boolean;
  responseTime: number;
  error?: string;
  timestamp: number;
}