/**
 * Configuration Store Tests
 * Tests for the configuration state management
 */

import { useConfigStore } from '../configStore';
import type { APIConfig } from '../../types';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('ConfigStore', () => {
  beforeEach(() => {
    // Reset store state
    useConfigStore.getState().reset();
    jest.clearAllMocks();
  });

  it('adds a new configuration', () => {
    const store = useConfigStore.getState();
    
    const configData = {
      name: 'Test Config',
      endpoint: 'https://api.openai.com/v1',
      apiKey: 'sk-test123',
      model: 'gpt-4',
      parameters: {
        temperature: 0.7,
        maxTokens: 1000,
      },
      isDefault: false,
    };

    store.addConfig(configData);

    const configs = store.configs;
    expect(configs).toHaveLength(1);
    expect(configs[0]).toMatchObject(configData);
    expect(configs[0].id).toBeDefined();
    expect(configs[0].createdAt).toBeDefined();
    expect(configs[0].updatedAt).toBeDefined();
  });

  it('updates an existing configuration', () => {
    const store = useConfigStore.getState();
    
    // Add a config first
    store.addConfig({
      name: 'Test Config',
      endpoint: 'https://api.openai.com/v1',
      apiKey: 'sk-test123',
      parameters: {},
      isDefault: false,
    });

    const configId = store.configs[0].id;
    
    // Update the config
    store.updateConfig(configId, {
      name: 'Updated Config',
      model: 'gpt-4-turbo',
    });

    const updatedConfig = store.configs[0];
    expect(updatedConfig.name).toBe('Updated Config');
    expect(updatedConfig.model).toBe('gpt-4-turbo');
    expect(updatedConfig.updatedAt).toBeGreaterThan(updatedConfig.createdAt);
  });

  it('deletes a configuration', () => {
    const store = useConfigStore.getState();
    
    // Add two configs
    store.addConfig({
      name: 'Config 1',
      endpoint: 'https://api.openai.com/v1',
      apiKey: 'sk-test123',
      parameters: {},
      isDefault: false,
    });
    
    store.addConfig({
      name: 'Config 2',
      endpoint: 'https://api.anthropic.com/v1',
      apiKey: 'sk-test456',
      parameters: {},
      isDefault: false,
    });

    expect(store.configs).toHaveLength(2);

    const configIdToDelete = store.configs[0].id;
    store.deleteConfig(configIdToDelete);

    expect(store.configs).toHaveLength(1);
    expect(store.configs[0].name).toBe('Config 2');
  });

  it('sets active configuration', () => {
    const store = useConfigStore.getState();
    
    store.addConfig({
      name: 'Test Config',
      endpoint: 'https://api.openai.com/v1',
      apiKey: 'sk-test123',
      parameters: {},
      isDefault: false,
    });

    const configId = store.configs[0].id;
    store.setActiveConfig(configId);

    expect(store.activeConfigId).toBe(configId);
    expect(store.getActiveConfig()).toEqual(store.configs[0]);
  });

  it('handles default configuration correctly', () => {
    const store = useConfigStore.getState();
    
    // Add first config as default
    store.addConfig({
      name: 'Config 1',
      endpoint: 'https://api.openai.com/v1',
      apiKey: 'sk-test123',
      parameters: {},
      isDefault: true,
    });

    // Add second config as default (should unset first)
    store.addConfig({
      name: 'Config 2',
      endpoint: 'https://api.anthropic.com/v1',
      apiKey: 'sk-test456',
      parameters: {},
      isDefault: true,
    });

    const configs = store.configs;
    expect(configs[0].isDefault).toBe(false);
    expect(configs[1].isDefault).toBe(true);
  });

  it('exports and imports configurations', () => {
    const store = useConfigStore.getState();
    
    // Add some configs
    store.addConfig({
      name: 'Config 1',
      endpoint: 'https://api.openai.com/v1',
      apiKey: 'sk-test123',
      parameters: {},
      isDefault: false,
    });

    const exportedConfigs = store.exportConfigs();
    expect(exportedConfigs).toHaveLength(1);
    expect(exportedConfigs[0].name).toBe('Config 1');

    // Reset and import
    store.reset();
    expect(store.configs).toHaveLength(0);

    const success = store.importConfigs(exportedConfigs);
    expect(success).toBe(true);
    expect(store.configs).toHaveLength(1);
    expect(store.configs[0].name).toBe('Config 1');
  });
});