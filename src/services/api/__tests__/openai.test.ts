/**
 * OpenAI API Client Tests
 * Comprehensive tests for the enhanced API client functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIAPIClient, createAPIClient, APIClientManager, ModelCacheUtils } from '../openai';
import type { APIConfig } from '../../../types';

// Mock axios
const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() }
  },
  defaults: {
    baseURL: '',
    headers: {}
  }
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance)
  }
}));

describe('OpenAIAPIClient', () => {
  let mockConfig: APIConfig;
  let client: OpenAIAPIClient;

  beforeEach(() => {
    mockConfig = {
      id: 'test-config',
      name: 'Test Config',
      endpoint: 'https://api.openai.com/v1',
      apiKey: 'test-key',
      model: 'gpt-3.5-turbo',
      parameters: {
        temperature: 0.7,
        maxTokens: 1000
      },
      isDefault: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    client = createAPIClient(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    ModelCacheUtils.clearAll();
    APIClientManager.clearAll();
  });

  describe('Client Creation', () => {
    it('should create client instance', () => {
      expect(client).toBeInstanceOf(OpenAIAPIClient);
    });

    it('should setup axios interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('Connection Testing', () => {
    it('should test connection successfully', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        status: 200,
        data: { data: [] }
      });

      const result = await client.testConnection();

      expect(result.success).toBe(true);
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.timestamp).toBeGreaterThan(0);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/models');
    });

    it('should handle connection failure', async () => {
      const error = new Error('Network error');
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      const result = await client.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.responseTime).toBeGreaterThan(0);
    });
  });

  describe('Model Management', () => {
    const mockModelsResponse = {
      data: {
        data: [
          {
            id: 'gpt-3.5-turbo',
            description: 'GPT-3.5 Turbo model'
          },
          {
            id: 'gpt-4-vision-preview',
            description: 'GPT-4 with vision capabilities'
          }
        ]
      }
    };

    it('should fetch models from API', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce(mockModelsResponse);

      const result = await client.getModels();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0].id).toBe('gpt-3.5-turbo');
      expect(result.data![1].type).toBe('multimodal'); // gpt-4-vision should be multimodal
    });

    it('should use cached models on subsequent calls', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce(mockModelsResponse);

      // First call
      await client.getModels();
      // Second call
      const result = await client.getModels();

      expect(result.success).toBe(true);
      expect(result.responseTime).toBe(0); // Cached response
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should force refresh when requested', async () => {
      mockAxiosInstance.get.mockResolvedValue(mockModelsResponse);

      // First call
      await client.getModels();
      // Force refresh
      await client.getModels(true);

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });

    it('should clear model cache', () => {
      client.clearModelCache();
      expect(ModelCacheUtils.getStats().size).toBe(0);
    });
  });

  describe('Chat Completion', () => {
    const mockMessages = [
      { role: 'user', content: 'Hello' }
    ];

    const mockChatResponse = {
      data: {
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Hello! How can I help you?'
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 15,
          total_tokens: 25
        }
      }
    };

    it('should send chat completion request', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce(mockChatResponse);

      const result = await client.createChatCompletion(mockMessages);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockChatResponse.data);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: mockMessages,
        temperature: 0.7,
        maxTokens: 1000,
        stream: false
      });
    });

    it('should handle streaming requests', async () => {
      const mockStreamResponse = {
        data: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              // Simulate streaming chunks
              setTimeout(() => callback(Buffer.from('data: {"choices":[{"delta":{"content":"Hello"}}]}\n')), 10);
              setTimeout(() => callback(Buffer.from('data: {"choices":[{"delta":{"content":" there!"}}]}\n')), 20);
              setTimeout(() => callback(Buffer.from('data: [DONE]\n')), 30);
            } else if (event === 'end') {
              setTimeout(callback, 40);
            }
          })
        }
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockStreamResponse);

      const chunks: string[] = [];
      const onStream = (chunk: string) => chunks.push(chunk);

      const result = await client.createChatCompletion(mockMessages, {}, onStream);

      expect(result.success).toBe(true);
      expect(chunks).toEqual(['Hello', ' there!']);
    });
  });

  describe('Request Management', () => {
    it('should track active requests', () => {
      expect(client.getActiveRequestCount()).toBe(0);
    });

    it('should cancel all requests', () => {
      client.cancelAllRequests();
      expect(client.getActiveRequestCount()).toBe(0);
    });

    it('should execute concurrent requests', async () => {
      const requests = [
        () => Promise.resolve('result1'),
        () => Promise.resolve('result2'),
        () => Promise.reject(new Error('error'))
      ];

      const results = await client.executeConcurrentRequests(requests, 2);

      expect(results).toHaveLength(3);
      expect(results[0]).toBe('result1');
      expect(results[1]).toBe('result2');
      expect(results[2]).toBeInstanceOf(Error);
    });
  });

  describe('Configuration Management', () => {
    it('should get current configuration', () => {
      const config = client.getConfig();
      expect(config).toEqual(mockConfig);
    });

    it('should update configuration', () => {
      const newConfig = { model: 'gpt-4' };
      client.updateConfig(newConfig);

      const config = client.getConfig();
      expect(config.model).toBe('gpt-4');
    });

    it('should get request statistics', () => {
      const stats = client.getRequestStats();
      expect(stats).toHaveProperty('activeRequests');
      expect(stats).toHaveProperty('cacheSize');
    });
  });

  describe('Model Inference', () => {
    it('should infer model type correctly', () => {
      const inferModelType = (client as any).inferModelType.bind(client);
      
      expect(inferModelType('gpt-4-vision')).toBe('multimodal');
      expect(inferModelType('gpt-3.5-turbo')).toBe('text');
      expect(inferModelType('text-embedding-ada-002')).toBe('embedding');
    });

    it('should infer context length correctly', () => {
      const inferContextLength = (client as any).inferContextLength.bind(client);
      
      expect(inferContextLength('gpt-4-turbo')).toBe(128000);
      expect(inferContextLength('gpt-4')).toBe(8192);
      expect(inferContextLength('gpt-3.5-turbo-16k')).toBe(16384);
      expect(inferContextLength('claude-3')).toBe(200000);
      expect(inferContextLength('unknown-model')).toBe(4096);
    });

    it('should infer capabilities correctly', () => {
      const inferCapabilities = (client as any).inferCapabilities.bind(client);
      
      const textCapabilities = inferCapabilities('gpt-3.5-turbo');
      expect(textCapabilities).toHaveLength(1);
      expect(textCapabilities[0].type).toBe('text');

      const visionCapabilities = inferCapabilities('gpt-4-vision');
      expect(visionCapabilities.length).toBeGreaterThan(1);
      expect(visionCapabilities.some((c: any) => c.type === 'vision')).toBe(true);
    });

    it('should extract provider name correctly', () => {
      const extractProvider = (client as any).extractProvider.bind(client);
      
      expect(extractProvider('https://api.openai.com/v1')).toBe('OpenAI');
      expect(extractProvider('https://api.anthropic.com/v1')).toBe('Anthropic');
      expect(extractProvider('http://localhost:11434/v1')).toBe('Local');
      expect(extractProvider('https://api.together.ai/v1')).toBe('Together AI');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', () => {
      const handleError = (client as any).handleError.bind(client);
      
      const networkError = { request: {} };
      const result = handleError(networkError);
      expect(result.type).toBe('network');
      expect(result.message).toContain('Network error');
    });

    it('should handle authentication errors', () => {
      const handleError = (client as any).handleError.bind(client);
      
      const authError = {
        response: {
          status: 401,
          data: { error: { message: 'Invalid API key' } },
        },
      };
      const result = handleError(authError);
      expect(result.type).toBe('auth');
      expect(result.message).toContain('Invalid API key');
    });

    it('should handle validation errors', () => {
      const handleError = (client as any).handleError.bind(client);
      
      const validationError = {
        response: {
          status: 400,
          data: { error: { message: 'Invalid parameters' } },
        },
      };
      const result = handleError(validationError);
      expect(result.type).toBe('validation');
    });

    it('should handle server errors', () => {
      const handleError = (client as any).handleError.bind(client);
      
      const serverError = {
        response: {
          status: 500,
          data: { error: { message: 'Internal server error' } },
        },
      };
      const result = handleError(serverError);
      expect(result.type).toBe('server');
    });
  });
});

describe('APIClientManager', () => {
  let mockConfig: APIConfig;

  beforeEach(() => {
    mockConfig = {
      id: 'test-config',
      name: 'Test Config',
      endpoint: 'https://api.openai.com/v1',
      apiKey: 'test-key',
      model: 'gpt-3.5-turbo',
      parameters: {},
      isDefault: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  });

  afterEach(() => {
    APIClientManager.clearAll();
  });

  it('should get or create client', () => {
    const client1 = APIClientManager.getClient(mockConfig);
    const client2 = APIClientManager.getClient(mockConfig);

    expect(client1).toBe(client2); // Should return same instance
  });

  it('should remove client', () => {
    const client = APIClientManager.getClient(mockConfig);
    APIClientManager.removeClient(mockConfig);

    const newClient = APIClientManager.getClient(mockConfig);
    expect(newClient).not.toBe(client); // Should create new instance
  });

  it('should clear all clients', () => {
    APIClientManager.getClient(mockConfig);
    APIClientManager.clearAll();

    expect(APIClientManager.getActiveClients()).toHaveLength(0);
  });

  it('should get active clients', () => {
    APIClientManager.getClient(mockConfig);
    const activeClients = APIClientManager.getActiveClients();
    
    expect(activeClients).toHaveLength(1);
    expect(activeClients[0]).toBeInstanceOf(OpenAIAPIClient);
  });
});

describe('ModelCacheUtils', () => {
  afterEach(() => {
    ModelCacheUtils.clearAll();
  });

  it('should provide cache statistics', () => {
    const stats = ModelCacheUtils.getStats();
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('entries');
    expect(Array.isArray(stats.entries)).toBe(true);
  });

  it('should clear all cache', () => {
    ModelCacheUtils.clearAll();
    expect(ModelCacheUtils.getStats().size).toBe(0);
  });

  it('should clean expired entries', () => {
    const cleaned = ModelCacheUtils.cleanExpired();
    expect(typeof cleaned).toBe('number');
    expect(cleaned).toBeGreaterThanOrEqual(0);
  });
});