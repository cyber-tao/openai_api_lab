/**
 * Simple test to verify stores and storage work correctly
 * This can be run in the browser console to test functionality
 */

import { useConfigStore, useChatStore, useTestStore, useStatsStore, useSettingsStore } from './stores';
import { storageService } from './services/storage';

// Test function to verify all stores work
export const testStores = async () => {
  console.log('🧪 Testing Stores and Storage...');

  try {
    // Test storage service
    console.log('📦 Testing Storage Service...');
    const testKey = 'test-key' as any;
    const testData = { message: 'Hello World', timestamp: Date.now() };
    
    const saveResult = storageService.set(testKey, testData);
    console.log('✅ Storage save:', saveResult);
    
    const loadResult = storageService.get(testKey);
    console.log('✅ Storage load:', loadResult);
    
    const storageInfo = storageService.getStorageInfo();
    console.log('✅ Storage info:', storageInfo);

    // Test settings store
    console.log('⚙️ Testing Settings Store...');
    const settingsStore = useSettingsStore.getState();
    console.log('✅ Settings loaded:', {
      theme: settingsStore.theme,
      language: settingsStore.language,
      autoSave: settingsStore.autoSave,
    });

    // Test theme toggle
    settingsStore.toggleTheme();
    console.log('✅ Theme toggled to:', settingsStore.theme);

    // Test config store
    console.log('🔧 Testing Config Store...');
    const configStore = useConfigStore.getState();
    
    // Add a test configuration
    configStore.addConfig({
      name: 'Test API',
      endpoint: 'https://api.example.com/v1',
      apiKey: 'test-key-123',
      parameters: {
        temperature: 0.7,
        maxTokens: 2048,
      },
      isDefault: true,
    });
    
    console.log('✅ Config added. Total configs:', configStore.configs.length);
    console.log('✅ Active config:', configStore.getActiveConfig()?.name);

    // Test chat store
    console.log('💬 Testing Chat Store...');
    const chatStore = useChatStore.getState();
    
    // Create a test session
    const sessionId = chatStore.createSession('Test Chat', 'gpt-4', configStore.activeConfigId || '');
    console.log('✅ Session created:', sessionId);
    
    // Add a test message
    const messageId = chatStore.addMessage({
      role: 'user',
      content: 'Hello, this is a test message!',
    });
    console.log('✅ Message added:', messageId);
    console.log('✅ Total messages:', chatStore.messages.length);

    // Test stats store
    console.log('📊 Testing Stats Store...');
    const statsStore = useStatsStore.getState();
    
    // Record some test statistics
    statsStore.recordMessage('gpt-4', 50, 0.001, 1500);
    console.log('✅ Stats recorded. Total messages:', statsStore.totalMessages);
    console.log('✅ Total cost:', statsStore.totalCost);

    // Test test store
    console.log('🧪 Testing Test Store...');
    const testStore = useTestStore.getState();
    
    // Create a test configuration
    const testId = testStore.createTest({
      name: 'Performance Test',
      description: 'Test API performance',
      modelIds: ['gpt-4'],
      prompt: 'Hello world',
      parameters: {
        temperature: 0.7,
        maxTokens: 100,
      },
      concurrent: 1,
      iterations: 5,
    });
    console.log('✅ Test created:', testId);
    console.log('✅ Total tests:', testStore.tests.length);

    // Clean up test data
    storageService.remove(testKey);
    
    console.log('🎉 All store tests completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Store test failed:', error);
    return false;
  }
};

// Export for browser console testing
(window as any).testStores = testStores;