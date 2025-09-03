/**
 * Configuration Store
 * Manages API configurations with Zustand and localStorage persistence
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { APIConfig, ModelInfo, ModelPrice } from '../types';
import { STORAGE_KEYS } from '../types/storage';
import { API_CONFIG_SCHEMA, MODEL_PRICE_SCHEMA } from '../types/validation';
import { storageService } from '../services/storage';

interface ConfigState {
  // API Configurations
  configs: APIConfig[];
  activeConfigId: string | null;
  
  // Models
  models: ModelInfo[];
  modelPrices: Record<string, ModelPrice>;
  
  // Loading states
  loading: {
    configs: boolean;
    models: boolean;
    testing: boolean;
  };
  
  // Error states
  errors: {
    configs: string | null;
    models: string | null;
    testing: string | null;
  };

  // Actions
  addConfig: (config: Omit<APIConfig, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateConfig: (id: string, updates: Partial<APIConfig>) => void;
  deleteConfig: (id: string) => void;
  setActiveConfig: (id: string | null) => void;
  getActiveConfig: () => APIConfig | null;
  
  setModels: (models: ModelInfo[]) => void;
  updateModelPrice: (modelId: string, price: ModelPrice) => void;
  getModelPrice: (modelId: string) => ModelPrice | null;
  
  setLoading: (key: keyof ConfigState['loading'], value: boolean) => void;
  setError: (key: keyof ConfigState['errors'], value: string | null) => void;
  
  // Persistence
  loadFromStorage: () => void;
  saveToStorage: () => void;
  
  // Utilities
  reset: () => void;
  exportConfigs: () => APIConfig[];
  importConfigs: (configs: APIConfig[]) => boolean;
}

const initialState = {
  configs: [],
  activeConfigId: null,
  models: [],
  modelPrices: {},
  loading: {
    configs: false,
    models: false,
    testing: false,
  },
  errors: {
    configs: null,
    models: null,
    testing: null,
  },
};

export const useConfigStore = create<ConfigState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Add new API configuration
    addConfig: (configData) => {
      const config: APIConfig = {
        ...configData,
        id: `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      set((state) => {
        const newConfigs = [...state.configs, config];
        
        // Set as active if it's the first config or marked as default
        let newActiveId = state.activeConfigId;
        if (!newActiveId || config.isDefault) {
          newActiveId = config.id;
          
          // Unset other defaults if this is default
          if (config.isDefault) {
            newConfigs.forEach(c => {
              if (c.id !== config.id) {
                c.isDefault = false;
              }
            });
          }
        }

        return {
          configs: newConfigs,
          activeConfigId: newActiveId,
        };
      });

      get().saveToStorage();
    },

    // Update existing configuration
    updateConfig: (id, updates) => {
      set((state) => {
        const configs = state.configs.map(config => {
          if (config.id === id) {
            const updated = {
              ...config,
              ...updates,
              updatedAt: Date.now(),
            };

            // Handle default flag
            if (updates.isDefault) {
              // Unset other defaults
              state.configs.forEach(c => {
                if (c.id !== id) {
                  c.isDefault = false;
                }
              });
            }

            return updated;
          }
          return config;
        });

        return { configs };
      });

      get().saveToStorage();
    },

    // Delete configuration
    deleteConfig: (id) => {
      set((state) => {
        const configs = state.configs.filter(config => config.id !== id);
        let activeConfigId = state.activeConfigId;

        // If deleted config was active, select another one
        if (activeConfigId === id) {
          const defaultConfig = configs.find(c => c.isDefault);
          activeConfigId = defaultConfig?.id || configs[0]?.id || null;
        }

        return {
          configs,
          activeConfigId,
        };
      });

      get().saveToStorage();
    },

    // Set active configuration
    setActiveConfig: (id) => {
      set({ activeConfigId: id });
      get().saveToStorage();
    },

    // Get active configuration
    getActiveConfig: () => {
      const { configs, activeConfigId } = get();
      return configs.find(config => config.id === activeConfigId) || null;
    },

    // Set models list
    setModels: (models) => {
      set({ models });
    },

    // Update model price
    updateModelPrice: (modelId, price) => {
      set((state) => ({
        modelPrices: {
          ...state.modelPrices,
          [modelId]: {
            ...price,
            lastUpdated: Date.now(),
          },
        },
      }));

      // Save model prices to storage
      const { modelPrices } = get();
      storageService.set(STORAGE_KEYS.MODEL_PRICES, modelPrices, MODEL_PRICE_SCHEMA);
    },

    // Get model price
    getModelPrice: (modelId) => {
      const { modelPrices } = get();
      return modelPrices[modelId] || null;
    },

    // Set loading state
    setLoading: (key, value) => {
      set((state) => ({
        loading: {
          ...state.loading,
          [key]: value,
        },
      }));
    },

    // Set error state
    setError: (key, value) => {
      set((state) => ({
        errors: {
          ...state.errors,
          [key]: value,
        },
      }));
    },

    // Load data from storage
    loadFromStorage: () => {
      try {
        // Load configurations
        const configs = storageService.get<APIConfig[]>(STORAGE_KEYS.API_CONFIGS, {
          type: 'array',
          items: API_CONFIG_SCHEMA,
        }) || [];

        // Load model prices
        const modelPrices = storageService.get<Record<string, ModelPrice>>(
          STORAGE_KEYS.MODEL_PRICES
        ) || {};

        // Load active config ID from settings
        const settings = storageService.get(STORAGE_KEYS.APP_SETTINGS);
        const activeConfigId = settings?.activeConfigId || configs.find(c => c.isDefault)?.id || configs[0]?.id || null;

        set({
          configs,
          modelPrices,
          activeConfigId,
        });
      } catch (error) {
        console.error('Failed to load config data from storage:', error);
        get().setError('configs', 'Failed to load configurations');
      }
    },

    // Save data to storage
    saveToStorage: () => {
      try {
        const { configs, activeConfigId } = get();
        
        // Save configurations
        storageService.set(STORAGE_KEYS.API_CONFIGS, configs, {
          type: 'array',
          items: API_CONFIG_SCHEMA,
        });

        // Save active config ID to settings
        const settings = storageService.get(STORAGE_KEYS.APP_SETTINGS) || {};
        settings.activeConfigId = activeConfigId;
        settings.lastUpdated = Date.now();
        storageService.set(STORAGE_KEYS.APP_SETTINGS, settings);
      } catch (error) {
        console.error('Failed to save config data to storage:', error);
        get().setError('configs', 'Failed to save configurations');
      }
    },

    // Reset store to initial state
    reset: () => {
      set(initialState);
    },

    // Export configurations
    exportConfigs: () => {
      return get().configs;
    },

    // Import configurations
    importConfigs: (configs) => {
      try {
        // Validate each config
        const validConfigs = configs.filter(config => {
          const validation = storageService.validateData(config, API_CONFIG_SCHEMA);
          if (!validation.valid) {
            console.warn('Invalid config during import:', validation.errors);
            return false;
          }
          return true;
        });

        if (validConfigs.length === 0) {
          get().setError('configs', 'No valid configurations to import');
          return false;
        }

        // Add imported configs
        set((state) => {
          const existingIds = new Set(state.configs.map(c => c.id));
          const newConfigs = validConfigs.filter(c => !existingIds.has(c.id));
          
          return {
            configs: [...state.configs, ...newConfigs],
          };
        });

        get().saveToStorage();
        return true;
      } catch (error) {
        console.error('Failed to import configurations:', error);
        get().setError('configs', 'Failed to import configurations');
        return false;
      }
    },
  }))
);

// Auto-save subscription
useConfigStore.subscribe(
  (state) => ({ configs: state.configs, activeConfigId: state.activeConfigId }),
  () => {
    // Debounced auto-save
    const timeoutId = setTimeout(() => {
      useConfigStore.getState().saveToStorage();
    }, 1000);

    return () => clearTimeout(timeoutId);
  },
  { equalityFn: (a, b) => a.configs === b.configs && a.activeConfigId === b.activeConfigId }
);

// Load initial data
useConfigStore.getState().loadFromStorage();