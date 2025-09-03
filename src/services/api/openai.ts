/**
 * OpenAI API Client Service
 * Handles API calls to OpenAI-compatible endpoints with advanced features
 */

import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { 
  APIConfig, 
  APIResponse, 
  APIError, 
  ConnectionTestResult, 
  ModelInfo, 
  ModelCapability,
  TokenUsage 
} from '../../types';

// Extend axios config to include metadata
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      requestId: string;
      startTime: number;
    };
  }
}

// Cache for model information
const modelCache = new Map<string, { data: ModelInfo[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Request queue for concurrent request management
interface QueuedRequest {
  id: string;
  promise: Promise<any>;
  controller: AbortController;
}

export class OpenAIAPIClient {
  private client: AxiosInstance;
  private config: APIConfig;
  private requestQueue: Map<string, QueuedRequest> = new Map();
  private requestCounter = 0;

  constructor(config: APIConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.endpoint,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 seconds timeout for streaming
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors with enhanced logging and error handling
   */
  private setupInterceptors(): void {
    // Request interceptor for logging and request tracking
    this.client.interceptors.request.use(
      (config) => {
        const requestId = `req_${++this.requestCounter}`;
        config.metadata = { requestId, startTime: Date.now() };
        
        console.log(`[${requestId}] API Request: ${config.method?.toUpperCase()} ${config.url}`, {
          headers: this.sanitizeHeaders(config.headers),
          data: config.data ? JSON.stringify(config.data).substring(0, 200) + '...' : undefined
        });
        
        return config;
      },
      (error) => {
        console.error('API Request Setup Error:', error);
        return Promise.reject(this.handleError(error));
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        const requestId = response.config.metadata?.requestId || 'unknown';
        const duration = Date.now() - (response.config.metadata?.startTime || 0);
        
        console.log(`[${requestId}] API Response: ${response.status} (${duration}ms)`, {
          status: response.status,
          duration,
          dataSize: JSON.stringify(response.data).length
        });
        
        return response;
      },
      (error) => {
        const requestId = error.config?.metadata?.requestId || 'unknown';
        const duration = Date.now() - (error.config?.metadata?.startTime || 0);
        
        console.error(`[${requestId}] API Error: ${error.response?.status || 'Network'} (${duration}ms)`, {
          status: error.response?.status,
          message: error.response?.data?.error?.message || error.message,
          duration
        });
        
        return Promise.reject(this.handleError(error));
      }
    );
  }

  /**
   * Sanitize headers for logging (remove sensitive information)
   */
  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    if (sanitized.Authorization) {
      sanitized.Authorization = 'Bearer ***';
    }
    return sanitized;
  }

  /**
   * Test API connection and measure response time
   */
  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      // Try to get models list as a connection test
      await this.client.get('/models');
      const responseTime = Date.now() - startTime;

      return {
        success: true,
        responseTime,
        timestamp: Date.now(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const apiError = error as APIError;

      return {
        success: false,
        responseTime,
        error: apiError.message || 'Connection failed',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get available models from the API with caching
   */
  async getModels(forceRefresh = false): Promise<APIResponse<ModelInfo[]>> {
    const cacheKey = `${this.config.endpoint}_${this.config.apiKey.substring(0, 10)}`;
    
    // Check cache first
    if (!forceRefresh) {
      const cached = modelCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('Returning cached models');
        return {
          success: true,
          data: cached.data,
          responseTime: 0,
        };
      }
    }

    try {
      const startTime = Date.now();
      const response = await this.client.get('/models');
      const responseTime = Date.now() - startTime;

      // Transform API response to our ModelInfo format
      const models: ModelInfo[] = response.data.data?.map((model: any) => ({
        id: model.id,
        name: model.id,
        type: this.inferModelType(model.id),
        contextLength: this.inferContextLength(model.id),
        capabilities: this.inferCapabilities(model.id),
        description: model.description || '',
        provider: this.extractProvider(this.config.endpoint),
        // Try to extract pricing from various possible API response formats
        inputPrice: this.extractInputPrice(model),
        outputPrice: this.extractOutputPrice(model),
        maxFileSize: this.inferMaxFileSize(model.id),
        supportedFormats: this.inferSupportedFormats(model.id),
      })) || [];

      // Cache the results
      modelCache.set(cacheKey, {
        data: models,
        timestamp: Date.now()
      });

      return {
        success: true,
        data: models,
        responseTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error as APIError,
      };
    }
  }

  /**
   * Clear model cache
   */
  clearModelCache(): void {
    modelCache.clear();
  }

  /**
   * Send a chat completion request with streaming support
   */
  async createChatCompletion(
    messages: any[], 
    options: any = {},
    onStream?: (chunk: string) => void
  ): Promise<APIResponse> {
    const requestId = `chat_${Date.now()}`;
    const controller = new AbortController();

    try {
      const startTime = Date.now();
      
      const requestData = {
        model: this.config.model || 'gpt-3.5-turbo',
        messages,
        ...this.config.parameters,
        ...options,
        stream: !!onStream,
      };

      // Add to request queue for concurrent management
      const requestPromise = this.executeRequest(requestData, controller, onStream);
      this.requestQueue.set(requestId, {
        id: requestId,
        promise: requestPromise,
        controller
      });

      const result = await requestPromise;
      const responseTime = Date.now() - startTime;

      // Remove from queue
      this.requestQueue.delete(requestId);

      return {
        success: true,
        data: result,
        responseTime,
      };
    } catch (error) {
      this.requestQueue.delete(requestId);
      return {
        success: false,
        error: error as APIError,
      };
    }
  }

  /**
   * Execute the actual request with streaming support
   */
  private async executeRequest(
    requestData: any,
    controller: AbortController,
    onStream?: (chunk: string) => void
  ): Promise<any> {
    if (onStream && requestData.stream) {
      // Streaming request
      return this.handleStreamingRequest(requestData, controller, onStream);
    } else {
      // Regular request
      const response = await this.client.post('/chat/completions', requestData, {
        signal: controller.signal
      });
      return response.data;
    }
  }

  /**
   * Handle streaming chat completion
   */
  private async handleStreamingRequest(
    requestData: any,
    controller: AbortController,
    onStream: (chunk: string) => void
  ): Promise<any> {
    const response = await this.client.post('/chat/completions', requestData, {
      responseType: 'stream',
      signal: controller.signal,
    });

    let fullContent = '';
    let usage: TokenUsage | undefined;

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              resolve({
                choices: [{
                  message: {
                    role: 'assistant',
                    content: fullContent
                  },
                  finish_reason: 'stop'
                }],
                usage
              });
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              
              if (delta?.content) {
                fullContent += delta.content;
                onStream(delta.content);
              }

              if (parsed.usage) {
                usage = parsed.usage;
              }
            } catch {
              // Ignore parsing errors for malformed chunks
            }
          }
        }
      });

      response.data.on('error', (error: any) => {
        reject(this.handleError(error));
      });

      response.data.on('end', () => {
        resolve({
          choices: [{
            message: {
              role: 'assistant',
              content: fullContent
            },
            finish_reason: 'stop'
          }],
          usage
        });
      });
    });
  }

  /**
   * Cancel a specific request
   */
  cancelRequest(requestId: string): boolean {
    const request = this.requestQueue.get(requestId);
    if (request) {
      request.controller.abort();
      this.requestQueue.delete(requestId);
      return true;
    }
    return false;
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    for (const [, request] of this.requestQueue) {
      request.controller.abort();
    }
    this.requestQueue.clear();
  }

  /**
   * Get active request count
   */
  getActiveRequestCount(): number {
    return this.requestQueue.size;
  }

  /**
   * Execute multiple requests concurrently with limit
   */
  async executeConcurrentRequests<T>(
    requests: Array<() => Promise<T>>,
    concurrencyLimit = 5
  ): Promise<Array<T | Error>> {
    const results: Array<T | Error> = [];
    const executing: Promise<void>[] = [];

    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      
      const promise = request()
        .then(result => {
          results[i] = result;
        })
        .catch(error => {
          results[i] = error;
        });

      executing.push(promise);

      if (executing.length >= concurrencyLimit) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Handle and normalize API errors
   */
  private handleError(error: any): APIError {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;

      let type: APIError['type'] = 'server';
      let message = data?.error?.message || data?.message || 'Server error';

      if (status === 401 || status === 403) {
        type = 'auth';
        message = 'Invalid API key or insufficient permissions';
      } else if (status === 400) {
        type = 'validation';
        message = data?.error?.message || 'Invalid request parameters';
      } else if (status >= 500) {
        type = 'server';
        message = 'Server error, please try again later';
      }

      return {
        code: status.toString(),
        message,
        type,
        details: data,
      };
    } else if (error.request) {
      // Network error
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error - please check your connection and API endpoint',
        type: 'network',
      };
    } else {
      // Other error
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'An unknown error occurred',
        type: 'unknown',
      };
    }
  }

  /**
   * Infer model type from model ID
   */
  private inferModelType(modelId: string): ModelInfo['type'] {
    if (modelId.includes('vision') || modelId.includes('gpt-4') || modelId.includes('claude-3')) {
      return 'multimodal';
    }
    if (modelId.includes('embedding') || modelId.includes('ada')) {
      return 'embedding';
    }
    return 'text';
  }

  /**
   * Infer context length from model ID
   */
  private inferContextLength(modelId: string): number {
    if (modelId.includes('gpt-4-turbo') || modelId.includes('gpt-4-1106')) {
      return 128000;
    }
    if (modelId.includes('gpt-4')) {
      return 8192;
    }
    if (modelId.includes('gpt-3.5-turbo-16k')) {
      return 16384;
    }
    if (modelId.includes('claude-3')) {
      return 200000;
    }
    return 4096; // Default
  }

  /**
   * Infer model capabilities
   */
  private inferCapabilities(modelId: string): ModelCapability[] {
    const capabilities: ModelCapability[] = [{ type: 'text' }];
    
    if (modelId.includes('vision') || modelId.includes('gpt-4') || modelId.includes('claude-3')) {
      capabilities.push(
        { type: 'vision', description: 'Can analyze and understand images' }, 
        { type: 'image', description: 'Supports image input' }
      );
    }
    if (modelId.includes('gpt-4') || modelId.includes('claude')) {
      capabilities.push({ 
        type: 'function_calling', 
        description: 'Supports function calling and tool use' 
      });
    }
    if (modelId.includes('whisper') || modelId.includes('audio')) {
      capabilities.push({ 
        type: 'audio', 
        description: 'Can process audio input' 
      });
    }
    
    return capabilities;
  }

  /**
   * Infer maximum file size for model
   */
  private inferMaxFileSize(modelId: string): number {
    if (modelId.includes('gpt-4') || modelId.includes('claude-3')) {
      return 20 * 1024 * 1024; // 20MB for multimodal models
    }
    return 10 * 1024 * 1024; // 10MB default
  }

  /**
   * Infer supported file formats for model
   */
  private inferSupportedFormats(modelId: string): string[] {
    const formats = ['txt', 'md', 'json'];
    
    if (modelId.includes('vision') || modelId.includes('gpt-4') || modelId.includes('claude-3')) {
      formats.push('png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'docx');
    }
    if (modelId.includes('whisper') || modelId.includes('audio')) {
      formats.push('mp3', 'wav', 'm4a', 'flac');
    }
    
    return formats;
  }

  /**
   * Extract input price from model API response
   */
  private extractInputPrice(model: any): number | undefined {
    // Try various possible pricing formats from different providers
    if (model.pricing?.input !== undefined) return model.pricing.input;
    if (model.price?.input !== undefined) return model.price.input;
    if (model.input_price !== undefined) return model.input_price;
    if (model.inputPrice !== undefined) return model.inputPrice;
    
    // Some providers might have nested pricing structures
    if (model.pricing?.prompt !== undefined) return model.pricing.prompt;
    if (model.pricing?.input_tokens !== undefined) return model.pricing.input_tokens;
    
    // OpenAI-style pricing (per 1K tokens)
    if (model.pricing?.prompt_tokens !== undefined) return model.pricing.prompt_tokens;
    
    return undefined;
  }

  /**
   * Extract output price from model API response
   */
  private extractOutputPrice(model: any): number | undefined {
    // Try various possible pricing formats from different providers
    if (model.pricing?.output !== undefined) return model.pricing.output;
    if (model.price?.output !== undefined) return model.price.output;
    if (model.output_price !== undefined) return model.output_price;
    if (model.outputPrice !== undefined) return model.outputPrice;
    
    // Some providers might have nested pricing structures
    if (model.pricing?.completion !== undefined) return model.pricing.completion;
    if (model.pricing?.output_tokens !== undefined) return model.pricing.output_tokens;
    
    // OpenAI-style pricing (per 1K tokens)
    if (model.pricing?.completion_tokens !== undefined) return model.pricing.completion_tokens;
    
    return undefined;
  }

  /**
   * Extract provider name from endpoint
   */
  private extractProvider(endpoint: string): string {
    if (endpoint.includes('openai.com')) return 'OpenAI';
    if (endpoint.includes('anthropic.com')) return 'Anthropic';
    if (endpoint.includes('cohere.com')) return 'Cohere';
    if (endpoint.includes('huggingface.co')) return 'Hugging Face';
    if (endpoint.includes('together.ai')) return 'Together AI';
    if (endpoint.includes('replicate.com')) return 'Replicate';
    if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) return 'Local';
    
    try {
      const url = new URL(endpoint);
      const hostname = url.hostname.toLowerCase();
      
      // Extract main domain name
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        return parts[parts.length - 2].charAt(0).toUpperCase() + parts[parts.length - 2].slice(1);
      }
      return hostname;
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Get client configuration
   */
  getConfig(): APIConfig {
    return { ...this.config };
  }

  /**
   * Update client configuration
   */
  updateConfig(newConfig: Partial<APIConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update axios instance with new config
    this.client.defaults.baseURL = this.config.endpoint;
    this.client.defaults.headers['Authorization'] = `Bearer ${this.config.apiKey}`;
  }

  /**
   * Get request statistics
   */
  getRequestStats(): {
    activeRequests: number;
    cacheSize: number;
    cacheHitRate?: number;
  } {
    return {
      activeRequests: this.requestQueue.size,
      cacheSize: modelCache.size,
      // Note: Cache hit rate would need additional tracking to implement
    };
  }
}

/**
 * Create API client instance
 */
export function createAPIClient(config: APIConfig): OpenAIAPIClient {
  return new OpenAIAPIClient(config);
}

/**
 * Utility functions for API client management
 */
export class APIClientManager {
  private static clients = new Map<string, OpenAIAPIClient>();

  /**
   * Get or create API client for configuration
   */
  static getClient(config: APIConfig): OpenAIAPIClient {
    const key = `${config.endpoint}_${config.apiKey.substring(0, 10)}`;
    
    if (!this.clients.has(key)) {
      this.clients.set(key, new OpenAIAPIClient(config));
    }
    
    return this.clients.get(key)!;
  }

  /**
   * Remove client from cache
   */
  static removeClient(config: APIConfig): void {
    const key = `${config.endpoint}_${config.apiKey.substring(0, 10)}`;
    const client = this.clients.get(key);
    
    if (client) {
      client.cancelAllRequests();
      this.clients.delete(key);
    }
  }

  /**
   * Clear all clients
   */
  static clearAll(): void {
    for (const client of this.clients.values()) {
      client.cancelAllRequests();
    }
    this.clients.clear();
  }

  /**
   * Get all active clients
   */
  static getActiveClients(): OpenAIAPIClient[] {
    return Array.from(this.clients.values());
  }
}

/**
 * Global model cache utilities
 */
export const ModelCacheUtils = {
  /**
   * Clear all cached models
   */
  clearAll(): void {
    modelCache.clear();
  },

  /**
   * Get cache statistics
   */
  getStats(): { size: number; entries: Array<{ key: string; timestamp: number; modelCount: number }> } {
    const entries = Array.from(modelCache.entries()).map(([key, value]) => ({
      key,
      timestamp: value.timestamp,
      modelCount: value.data.length
    }));

    return {
      size: modelCache.size,
      entries
    };
  },

  /**
   * Clean expired cache entries
   */
  cleanExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of modelCache.entries()) {
      if (now - value.timestamp > CACHE_DURATION) {
        modelCache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
};