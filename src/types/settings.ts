/**
 * Application Settings Types
 * Defines interfaces for user preferences and app configuration
 */

export interface AppSettings {
  // Appearance
  theme: 'dark' | 'light' | 'auto';
  language: 'en' | 'zh' | 'auto';
  compactMode: boolean;
  animations: boolean;
  
  // Behavior
  autoSave: boolean;
  autoSaveInterval: number; // in seconds
  maxFileSize: number; // in bytes
  showStatistics: boolean;
  keyboardShortcuts: boolean;
  
  // Chat
  defaultModel?: string;
  defaultApiConfig?: string;
  streamingEnabled: boolean;
  showTokenCount: boolean;
  showCost: boolean;
  
  // Storage
  maxStorageSize: number; // in MB
  autoCleanup: boolean;
  cleanupAfterDays: number;
  
  // Privacy
  saveApiKeys: boolean;
  saveChatHistory: boolean;
  
  // Advanced
  debugMode: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  corsProxy?: string;
  
  // Version tracking
  version: string;
  lastUpdated: number;
}

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: string;
  description: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  language: 'en',
  compactMode: false,
  animations: true,
  autoSave: true,
  autoSaveInterval: 30,
  maxFileSize: 50 * 1024 * 1024, // 50MB
  showStatistics: true,
  keyboardShortcuts: true,
  streamingEnabled: true,
  showTokenCount: true,
  showCost: true,
  maxStorageSize: 100, // 100MB
  autoCleanup: false,
  cleanupAfterDays: 30,
  saveApiKeys: true,
  saveChatHistory: true,
  debugMode: false,
  logLevel: 'warn',
  version: '1.0.0',
  lastUpdated: Date.now(),
};

export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: 'n', ctrlKey: true, action: 'new-chat', description: 'New chat session' },
  { key: 's', ctrlKey: true, action: 'save-chat', description: 'Save current chat' },
  { key: 'e', ctrlKey: true, action: 'export-data', description: 'Export data' },
  { key: 'k', ctrlKey: true, action: 'toggle-shortcuts', description: 'Toggle keyboard shortcuts' },
  { key: '/', ctrlKey: true, action: 'search', description: 'Search messages' },
  { key: 'Enter', ctrlKey: true, action: 'send-message', description: 'Send message' },
];