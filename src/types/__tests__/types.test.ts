/**
 * Type Definition Tests
 * Ensures all type definitions work correctly and are properly structured
 */

import type {
  APIConfig,
  ModelInfo,
  ChatSession,
  ChatMessage,
  FileAttachment,
  AppSettings,
  ExportData,
  DEFAULT_SETTINGS,
  SUPPORTED_FILE_FORMATS,
  STORAGE_KEYS,
  isAPIConfig,
  isModelInfo,
  isChatSession,
  isChatMessage,
  isFileAttachment,
  isAppSettings,
  isExportData,
  validateArray,
  safeJsonParse,
} from '../index';

describe('Type Definitions', () => {
  describe('APIConfig', () => {
    it('should create valid APIConfig object', () => {
      const config: APIConfig = {
        id: 'test-config-1',
        name: 'Test Configuration',
        endpoint: 'https://api.openai.com/v1',
        apiKey: 'sk-test123456789',
        model: 'gpt-4',
        parameters: {
          temperature: 0.7,
          maxTokens: 1000,
          topP: 1,
        },
        isDefault: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(isAPIConfig(config)).toBe(true);
      expect(config.id).toBe('test-config-1');
      expect(config.endpoint).toMatch(/^https?:\/\/.+/);
    });

    it('should reject invalid APIConfig object', () => {
      const invalidConfig = {
        id: 'test',
        name: 'Test',
        // missing required fields
      };

      expect(isAPIConfig(invalidConfig)).toBe(false);
    });
  });

  describe('ModelInfo', () => {
    it('should create valid ModelInfo object', () => {
      const model: ModelInfo = {
        id: 'gpt-4',
        name: 'GPT-4',
        type: 'text',
        contextLength: 8192,
        inputPrice: 0.03,
        outputPrice: 0.06,
        capabilities: [
          { type: 'text', description: 'Text generation' },
          { type: 'function_calling', description: 'Function calling' },
        ],
        provider: 'OpenAI',
      };

      expect(isModelInfo(model)).toBe(true);
      expect(model.type).toBe('text');
      expect(model.capabilities).toHaveLength(2);
    });
  });

  describe('ChatSession', () => {
    it('should create valid ChatSession object', () => {
      const session: ChatSession = {
        id: 'session-1',
        title: 'Test Chat',
        modelId: 'gpt-4',
        apiConfigId: 'config-1',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalTokens: 0,
        totalCost: 0,
        messageCount: 0,
      };

      expect(isChatSession(session)).toBe(true);
      expect(session.messages).toEqual([]);
    });
  });

  describe('ChatMessage', () => {
    it('should create valid ChatMessage object', () => {
      const message: ChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello, world!',
        timestamp: Date.now(),
        tokens: {
          input: 3,
          output: 0,
          total: 3,
        },
      };

      expect(isChatMessage(message)).toBe(true);
      expect(message.role).toBe('user');
      expect(message.tokens?.total).toBe(3);
    });
  });

  describe('FileAttachment', () => {
    it('should create valid FileAttachment object', () => {
      const file: FileAttachment = {
        id: 'file-1',
        name: 'test.txt',
        type: 'text/plain',
        fileType: 'text',
        size: 1024,
        content: 'Hello, world!',
        processingStatus: 'completed',
        createdAt: Date.now(),
      };

      expect(isFileAttachment(file)).toBe(true);
      expect(file.fileType).toBe('text');
      expect(file.processingStatus).toBe('completed');
    });
  });

  describe('AppSettings', () => {
    it('should have valid default settings', () => {
      expect(isAppSettings(DEFAULT_SETTINGS)).toBe(true);
      expect(DEFAULT_SETTINGS.theme).toBe('dark');
      expect(DEFAULT_SETTINGS.language).toBe('en');
      expect(DEFAULT_SETTINGS.version).toBe('1.0.0');
    });

    it('should create custom settings', () => {
      const customSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        theme: 'light',
        compactMode: true,
        showStatistics: false,
      };

      expect(isAppSettings(customSettings)).toBe(true);
      expect(customSettings.theme).toBe('light');
    });
  });

  describe('ExportData', () => {
    it('should create valid ExportData object', () => {
      const exportData: ExportData = {
        version: '1.0.0',
        exportedAt: Date.now(),
        exportType: 'full',
        configs: [],
        sessions: [],
        modelPrices: {},
        settings: DEFAULT_SETTINGS,
      };

      expect(isExportData(exportData)).toBe(true);
      expect(exportData.exportType).toBe('full');
    });
  });

  describe('File Format Support', () => {
    it('should have supported file formats defined', () => {
      expect(SUPPORTED_FILE_FORMATS).toBeDefined();
      expect(SUPPORTED_FILE_FORMATS.length).toBeGreaterThan(0);
      
      const textFormat = SUPPORTED_FILE_FORMATS.find(f => f.extension === '.txt');
      expect(textFormat).toBeDefined();
      expect(textFormat?.mimeType).toBe('text/plain');
    });
  });

  describe('Storage Keys', () => {
    it('should have all required storage keys', () => {
      expect(STORAGE_KEYS.API_CONFIGS).toBe('openai-lab-configs');
      expect(STORAGE_KEYS.CHAT_SESSIONS).toBe('openai-lab-sessions');
      expect(STORAGE_KEYS.MODEL_PRICES).toBe('openai-lab-prices');
      expect(STORAGE_KEYS.APP_SETTINGS).toBe('openai-lab-settings');
      expect(STORAGE_KEYS.USAGE_STATS).toBe('openai-lab-stats');
    });
  });

  describe('Type Guards', () => {
    it('should validate arrays correctly', () => {
      const mixedData = [
        { id: 'valid', name: 'Valid Config', endpoint: 'https://api.test.com', apiKey: 'key', parameters: {}, isDefault: false, createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'invalid' }, // missing required fields
        { id: 'valid2', name: 'Valid Config 2', endpoint: 'https://api.test2.com', apiKey: 'key2', parameters: {}, isDefault: true, createdAt: Date.now(), updatedAt: Date.now() },
      ];

      const result = validateArray(mixedData, isAPIConfig);
      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(1);
    });

    it('should safely parse JSON', () => {
      const validJson = JSON.stringify(DEFAULT_SETTINGS);
      const result = safeJsonParse(validJson, isAppSettings);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.theme).toBe('dark');
      }
    });

    it('should handle invalid JSON', () => {
      const invalidJson = '{ invalid json }';
      const result = safeJsonParse(invalidJson, isAppSettings);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid JSON');
      }
    });
  });
});