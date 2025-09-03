/**
 * Model Information Types
 * Defines interfaces for AI model specifications and pricing
 */

export type ModelType = 'text' | 'multimodal' | 'embedding' | 'image' | 'audio';

export interface ModelInfo {
  id: string;
  name: string;
  type: ModelType;
  contextLength: number;
  inputPrice?: number;
  outputPrice?: number;
  capabilities: ModelCapability[];
  description?: string;
  provider: string;
  customPrice?: ModelPrice;
  maxFileSize?: number;
  supportedFormats?: string[];
}

export interface ModelPrice {
  input: number;  // Price per 1K tokens
  output: number; // Price per 1K tokens
  currency: string;
  lastUpdated: number;
}

export interface ModelCapability {
  type: 'text' | 'image' | 'audio' | 'video' | 'function_calling' | 'vision';
  description?: string;
}

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

export interface CostCalculation {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
  tokensUsed: TokenUsage;
}