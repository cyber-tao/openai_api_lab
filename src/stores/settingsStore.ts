/**
 * Settings Store
 * Manages application settings with Zustand and localStorage persistence
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { AppSettings } from '../types';
import { STORAGE_KEYS, DATA_VERSION } from '../types/storage';
import { APP_SETTINGS_SCHEMA } from '../types/validation';
import { storageService } from '../services/storage';

interface SettingsState extends AppSettings {
  // Loading states
  loading: boolean;
  
  // Error states
  error: string | null;

  // Actions
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
  
  // Theme actions
  setTheme: (theme: AppSettings['theme']) => void;
  toggleTheme: () => void;
  
  // Language actions
  setLanguage: (language: AppSettings['language']) => void;
  
  // Feature toggles
  toggleCompactMode: () => void;
  toggleAnimations: () => void;
  toggleAutoSave: () => void;
  toggleShowStatistics: () => void;
  toggleKeyboardShortcuts: () => void;
  toggleStreamingEnabled: () => void;
  
  // Storage management
  setMaxStorageSize: (size: number) => void;
  toggleAutoCleanup: () => void;
  setCleanupAfterDays: (days: number) => void;
  
  // Privacy settings
  toggleSaveApiKeys: () => void;
  toggleSaveChatHistory: () => void;
  
  // Debug settings
  toggleDebugMode: () => void;
  setLogLevel: (level: AppSettings['logLevel']) => void;
  
  // Persistence
  loadFromStorage: () => void;
  saveToStorage: () => void;
  
  // Export and import
  exportSettings: () => AppSettings;
  importSettings: (settings: Partial<AppSettings>) => boolean;
  
  // Utilities
  getStorageInfo: () => {
    used: number;
    available: number;
    percentage: number;
  };
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const defaultSettings: AppSettings = {
  // Appearance
  theme: 'dark',
  language: 'en',
  compactMode: false,
  animations: true,
  
  // Behavior
  autoSave: true,
  autoSaveInterval: 30000, // 30 seconds
  maxFileSize: 50 * 1024 * 1024, // 50MB
  showStatistics: true,
  keyboardShortcuts: true,
  streamingEnabled: true,
  showTokenCount: true,
  showCost: true,
  
  // Storage
  maxStorageSize: 100 * 1024 * 1024, // 100MB
  autoCleanup: true,
  cleanupAfterDays: 30,
  
  // Privacy
  saveApiKeys: true,
  saveChatHistory: true,
  
  // Debug
  debugMode: false,
  logLevel: 'info',
  
  // Metadata
  version: DATA_VERSION,
  lastUpdated: Date.now(),
};

export const useSettingsStore = create<SettingsState>()(
  subscribeWithSelector((set, get) => ({
    ...defaultSettings,
    loading: false,
    error: null,

    // Update settings
    updateSettings: (updates) => {
      set((state) => ({
        ...state,
        ...updates,
        lastUpdated: Date.now(),
      }));

      get().saveToStorage();
    },

    // Reset to default settings
    resetSettings: () => {
      set({
        ...defaultSettings,
        lastUpdated: Date.now(),
        loading: false,
        error: null,
      });

      get().saveToStorage();
    },

    // Set theme
    setTheme: (theme) => {
      get().updateSettings({ theme });
      
      // Apply theme to document
      document.documentElement.setAttribute('data-theme', theme);
      
      // Handle system theme
      if (theme === 'auto') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const actualTheme = mediaQuery.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', actualTheme);
      }
    },

    // Toggle theme
    toggleTheme: () => {
      const { theme } = get();
      const newTheme = theme === 'dark' ? 'light' : 'dark';
      get().setTheme(newTheme);
    },

    // Set language
    setLanguage: (language) => {
      get().updateSettings({ language });
      
      // Apply language to document
      document.documentElement.setAttribute('lang', language === 'auto' ? 'en' : language);
    },

    // Toggle compact mode
    toggleCompactMode: () => {
      const { compactMode } = get();
      get().updateSettings({ compactMode: !compactMode });
    },

    // Toggle animations
    toggleAnimations: () => {
      const { animations } = get();
      get().updateSettings({ animations: !animations });
      
      // Apply to CSS
      document.documentElement.style.setProperty(
        '--animation-duration', 
        animations ? '0ms' : '300ms'
      );
    },

    // Toggle auto-save
    toggleAutoSave: () => {
      const { autoSave } = get();
      get().updateSettings({ autoSave: !autoSave });
    },

    // Toggle show statistics
    toggleShowStatistics: () => {
      const { showStatistics } = get();
      get().updateSettings({ showStatistics: !showStatistics });
    },

    // Toggle keyboard shortcuts
    toggleKeyboardShortcuts: () => {
      const { keyboardShortcuts } = get();
      get().updateSettings({ keyboardShortcuts: !keyboardShortcuts });
    },

    // Toggle streaming
    toggleStreamingEnabled: () => {
      const { streamingEnabled } = get();
      get().updateSettings({ streamingEnabled: !streamingEnabled });
    },

    // Set max storage size
    setMaxStorageSize: (size) => {
      get().updateSettings({ maxStorageSize: size });
    },

    // Toggle auto cleanup
    toggleAutoCleanup: () => {
      const { autoCleanup } = get();
      get().updateSettings({ autoCleanup: !autoCleanup });
    },

    // Set cleanup after days
    setCleanupAfterDays: (days) => {
      get().updateSettings({ cleanupAfterDays: days });
    },

    // Toggle save API keys
    toggleSaveApiKeys: () => {
      const { saveApiKeys } = get();
      get().updateSettings({ saveApiKeys: !saveApiKeys });
      
      // If disabled, clear existing API keys
      if (saveApiKeys) {
        // This would trigger clearing of API keys from storage
        console.warn('API keys will be cleared from storage');
      }
    },

    // Toggle save chat history
    toggleSaveChatHistory: () => {
      const { saveChatHistory } = get();
      get().updateSettings({ saveChatHistory: !saveChatHistory });
      
      // If disabled, clear existing chat history
      if (saveChatHistory) {
        console.warn('Chat history will be cleared from storage');
      }
    },

    // Toggle debug mode
    toggleDebugMode: () => {
      const { debugMode } = get();
      get().updateSettings({ debugMode: !debugMode });
    },

    // Set log level
    setLogLevel: (logLevel) => {
      get().updateSettings({ logLevel });
    },

    // Load from storage
    loadFromStorage: () => {
      try {
        get().setLoading(true);
        
        const settings = storageService.get<AppSettings>(STORAGE_KEYS.APP_SETTINGS, APP_SETTINGS_SCHEMA);
        
        if (settings) {
          // Merge with defaults to ensure all properties exist
          const mergedSettings = {
            ...defaultSettings,
            ...settings,
            lastUpdated: Date.now(),
          };
          
          set({
            ...mergedSettings,
            loading: false,
            error: null,
          });

          // Apply theme and language
          get().setTheme(mergedSettings.theme);
          get().setLanguage(mergedSettings.language);
          
          // Apply animations setting
          document.documentElement.style.setProperty(
            '--animation-duration', 
            mergedSettings.animations ? '300ms' : '0ms'
          );
        } else {
          // First time setup
          set({
            ...defaultSettings,
            loading: false,
            error: null,
          });
          
          get().saveToStorage();
        }
      } catch (error) {
        console.error('Failed to load settings from storage:', error);
        get().setError('Failed to load settings');
        
        // Fallback to defaults
        set({
          ...defaultSettings,
          loading: false,
          error: 'Failed to load settings, using defaults',
        });
      }
    },

    // Save to storage
    saveToStorage: () => {
      try {
        const state = get();
        const settings: AppSettings = {
          theme: state.theme,
          language: state.language,
          compactMode: state.compactMode,
          animations: state.animations,
          autoSave: state.autoSave,
          autoSaveInterval: state.autoSaveInterval,
          maxFileSize: state.maxFileSize,
          showStatistics: state.showStatistics,
          keyboardShortcuts: state.keyboardShortcuts,
          streamingEnabled: state.streamingEnabled,
          showTokenCount: state.showTokenCount,
          showCost: state.showCost,
          maxStorageSize: state.maxStorageSize,
          autoCleanup: state.autoCleanup,
          cleanupAfterDays: state.cleanupAfterDays,
          saveApiKeys: state.saveApiKeys,
          saveChatHistory: state.saveChatHistory,
          debugMode: state.debugMode,
          logLevel: state.logLevel,
          version: state.version,
          lastUpdated: state.lastUpdated,
        };

        storageService.set(STORAGE_KEYS.APP_SETTINGS, settings, APP_SETTINGS_SCHEMA);
      } catch (error) {
        console.error('Failed to save settings to storage:', error);
        get().setError('Failed to save settings');
      }
    },

    // Export settings
    exportSettings: () => {
      const state = get();
      return {
        theme: state.theme,
        language: state.language,
        compactMode: state.compactMode,
        animations: state.animations,
        autoSave: state.autoSave,
        autoSaveInterval: state.autoSaveInterval,
        maxFileSize: state.maxFileSize,
        showStatistics: state.showStatistics,
        keyboardShortcuts: state.keyboardShortcuts,
        streamingEnabled: state.streamingEnabled,
        showTokenCount: state.showTokenCount,
        showCost: state.showCost,
        maxStorageSize: state.maxStorageSize,
        autoCleanup: state.autoCleanup,
        cleanupAfterDays: state.cleanupAfterDays,
        saveApiKeys: state.saveApiKeys,
        saveChatHistory: state.saveChatHistory,
        debugMode: state.debugMode,
        logLevel: state.logLevel,
        version: state.version,
        lastUpdated: Date.now(),
      };
    },

    // Import settings
    importSettings: (settings) => {
      try {
        // Validate imported settings
        const validation = storageService.validateData(settings, APP_SETTINGS_SCHEMA);
        if (!validation.valid) {
          console.warn('Invalid settings during import:', validation.errors);
          get().setError('Invalid settings format');
          return false;
        }

        // Merge with current settings
        const currentSettings = get().exportSettings();
        const mergedSettings = {
          ...currentSettings,
          ...settings,
          lastUpdated: Date.now(),
        };

        get().updateSettings(mergedSettings);
        return true;
      } catch (error) {
        console.error('Failed to import settings:', error);
        get().setError('Failed to import settings');
        return false;
      }
    },

    // Get storage information
    getStorageInfo: () => {
      const storageInfo = storageService.getStorageInfo();
      return {
        used: storageInfo.used,
        available: storageInfo.available,
        percentage: storageInfo.percentage,
      };
    },

    // Set loading state
    setLoading: (loading) => {
      set({ loading });
    },

    // Set error state
    setError: (error) => {
      set({ error });
    },
  }))
);

// Auto-save subscription
useSettingsStore.subscribe(
  (state) => ({
    theme: state.theme,
    language: state.language,
    compactMode: state.compactMode,
    animations: state.animations,
    autoSave: state.autoSave,
    showStatistics: state.showStatistics,
    keyboardShortcuts: state.keyboardShortcuts,
    streamingEnabled: state.streamingEnabled,
    maxStorageSize: state.maxStorageSize,
    autoCleanup: state.autoCleanup,
    cleanupAfterDays: state.cleanupAfterDays,
    saveApiKeys: state.saveApiKeys,
    saveChatHistory: state.saveChatHistory,
    debugMode: state.debugMode,
    logLevel: state.logLevel,
  }),
  () => {
    // Debounced auto-save
    const timeoutId = setTimeout(() => {
      useSettingsStore.getState().saveToStorage();
    }, 500);

    return () => clearTimeout(timeoutId);
  }
);

// System theme change listener
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', (e) => {
    const { theme } = useSettingsStore.getState();
    if (theme === 'auto') {
      const actualTheme = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', actualTheme);
    }
  });
}

// Load initial settings
useSettingsStore.getState().loadFromStorage();