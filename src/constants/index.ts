/**
 * Application Constants
 * Central location for all application constants and configuration
 */

// Application metadata
export const APP_CONFIG = {
  NAME: 'OpenAI API Lab',
  VERSION: '1.0.0',
  DESCRIPTION: 'A comprehensive tool for testing and debugging OpenAI-compatible APIs',
  AUTHOR: 'OpenAI API Lab Team',
  REPOSITORY: 'https://github.com/openai-api-lab/openai-api-lab',
} as const;

// API configuration
export const API_CONFIG = {
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  STREAM_TIMEOUT: 60000, // 60 seconds
  CONNECTION_TEST_TIMEOUT: 10000, // 10 seconds
} as const;

// File handling constants
export const FILE_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_FILES_PER_MESSAGE: 10,
  SUPPORTED_IMAGE_TYPES: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
  SUPPORTED_DOCUMENT_TYPES: ['text/plain', 'text/markdown', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  SUPPORTED_AUDIO_TYPES: ['audio/mpeg', 'audio/wav', 'audio/mp4'],
  CHUNK_SIZE: 1024 * 1024, // 1MB chunks for processing
} as const;

// UI constants
export const UI_CONFIG = {
  SIDEBAR_WIDTH: 280,
  SIDEBAR_COLLAPSED_WIDTH: 60,
  HEADER_HEIGHT: 64,
  MESSAGE_MAX_HEIGHT: 600,
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 4000,
} as const;

// Storage constants
export const STORAGE_CONFIG = {
  MAX_STORAGE_SIZE: 100 * 1024 * 1024, // 100MB
  CLEANUP_THRESHOLD: 0.9, // 90%
  WARNING_THRESHOLD: 0.8, // 80%
  AUTO_SAVE_INTERVAL: 30000, // 30 seconds
  CACHE_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// Performance testing constants
export const TESTING_CONFIG = {
  MAX_CONCURRENT_REQUESTS: 10,
  MAX_TEST_ITERATIONS: 100,
  DEFAULT_TEST_PROMPT: 'Hello, how are you today?',
  TIMEOUT_PER_REQUEST: 30000, // 30 seconds
  PROGRESS_UPDATE_INTERVAL: 100, // Update progress every 100ms
} as const;

// Model pricing (fallback values in USD per 1K tokens)
export const DEFAULT_MODEL_PRICES = {
  'gpt-4': { input: 0.03, output: 0.06, currency: 'USD' },
  'gpt-4-turbo': { input: 0.01, output: 0.03, currency: 'USD' },
  'gpt-3.5-turbo': { input: 0.0015, output: 0.002, currency: 'USD' },
  'claude-3-opus': { input: 0.015, output: 0.075, currency: 'USD' },
  'claude-3-sonnet': { input: 0.003, output: 0.015, currency: 'USD' },
  'claude-3-haiku': { input: 0.00025, output: 0.00125, currency: 'USD' },
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  API_KEY_INVALID: 'Invalid API key. Please check your configuration.',
  API_ENDPOINT_INVALID: 'Invalid API endpoint. Please check the URL format.',
  FILE_TOO_LARGE: 'File size exceeds the maximum limit.',
  FILE_TYPE_NOT_SUPPORTED: 'File type is not supported.',
  STORAGE_QUOTA_EXCEEDED: 'Storage quota exceeded. Please clear some data.',
  VALIDATION_FAILED: 'Data validation failed. Please check your input.',
  EXPORT_FAILED: 'Failed to export data. Please try again.',
  IMPORT_FAILED: 'Failed to import data. Please check the file format.',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  CONFIG_SAVED: 'Configuration saved successfully.',
  DATA_EXPORTED: 'Data exported successfully.',
  DATA_IMPORTED: 'Data imported successfully.',
  FILE_UPLOADED: 'File uploaded successfully.',
  SETTINGS_UPDATED: 'Settings updated successfully.',
  TEST_COMPLETED: 'Performance test completed successfully.',
} as const;

// Regular expressions for validation
export const REGEX_PATTERNS = {
  URL: /^https?:\/\/.+/,
  API_KEY: /^[a-zA-Z0-9\-_.]+$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-()]+$/,
  VERSION: /^\d+\.\d+\.\d+$/,
} as const;

// Theme colors
export const THEME_COLORS = {
  DARK: {
    primary: '#3b82f6',
    secondary: '#6b7280',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    background: '#0f0f0f',
    surface: '#1a1a1a',
    text: '#ffffff',
    textSecondary: '#a3a3a3',
    border: '#404040',
  },
  LIGHT: {
    primary: '#3b82f6',
    secondary: '#6b7280',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    background: '#ffffff',
    surface: '#f9fafb',
    text: '#111827',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
  },
} as const;

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  NEW_CHAT: 'Ctrl+N',
  SAVE_CHAT: 'Ctrl+S',
  EXPORT_DATA: 'Ctrl+E',
  SEARCH: 'Ctrl+/',
  SEND_MESSAGE: 'Ctrl+Enter',
  TOGGLE_SIDEBAR: 'Ctrl+B',
  TOGGLE_THEME: 'Ctrl+Shift+T',
  FOCUS_INPUT: 'Ctrl+K',
} as const;