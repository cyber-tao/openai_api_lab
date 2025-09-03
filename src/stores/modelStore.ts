/**
 * Model Store
 * Manages model information and pricing with Zustand and localStorage persistence
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ModelInfo, ModelPrice } from '../types';
import { STORAGE_KEYS } from '../types/storage';
import { MODEL_INFO_SCHEMA } from '../types/validation';
import { storageService } from '../services/storage';

interface ModelState {
  // Models
  models: ModelInfo[];
  customPrices: Record<string, ModelPrice>;
  
  // Loading states
  loading: {
    models: boolean;
    prices: boolean;
  };
  
  // Error states
  errors: {
    models: string | null;
    prices: string | null;
  };

  // Model actions
  setModels: (models: ModelInfo[]) => void;
  updateModel: (id: string, updates: Partial<ModelInfo>) => void;
  addModel: (model: ModelInfo) => void;
  removeModel: (id: string) => void;
  
  // Price actions
  setCustomPrice: (modelId: string, price: ModelPrice) => void;
  removeCustomPrice: (modelId: string) => void;
  getEffectivePrice: (modelId: string) => { input: number; output: number } | null;
  
  // Utilities
  getModel: (id: string) => ModelInfo | null;
  getModelsByType: (type: ModelInfo['type']) => ModelInfo[];
  getModelsByProvider: (provider: string) => ModelInfo[];
  searchModels: (query: string) => ModelInfo[];
  
  // Loading and error management
  setLoading: (key: keyof ModelState['loading'], value: boolean) => void;
  setError: (key: keyof ModelState['errors'], value: string | null) => void;
  
  // Persistence
  loadFromStorage: () => void;
  saveToStorage: () => void;
  
  // Reset
  reset: () => void;
}

const initialState = {
  models: [],
  customPrices: {},
  loading: {
    models: false,
    prices: false,
  },
  errors: {
    models: null,
    prices: null,
  },
};

export const useModelStore = create<ModelState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Set models
    setModels: (models) => {
      set({ models });
      get().saveToStorage();
    },

    // Update model
    updateModel: (id, updates) => {
      set((state) => ({
        models: state.models.map(model => 
          model.id === id ? { ...model, ...updates } : model
        ),
      }));
      get().saveToStorage();
    },

    // Add model
    addModel: (model) => {
      set((state) => ({
        models: [...state.models.filter(m => m.id !== model.id), model],
      }));
      get().saveToStorage();
    },

    // Remove model
    removeModel: (id) => {
      set((state) => ({
        models: state.models.filter(model => model.id !== id),
      }));
      get().saveToStorage();
    },

    // Set custom price
    setCustomPrice: (modelId, price) => {
      set((state) => ({
        customPrices: {
          ...state.customPrices,
          [modelId]: price,
        },
      }));
      get().saveToStorage();
    },

    // Remove custom price
    removeCustomPrice: (modelId) => {
      set((state) => {
        const { [modelId]: removed, ...rest } = state.customPrices;
        return { customPrices: rest };
      });
      get().saveToStorage();
    },

    // Get effective price (custom or model default)
    getEffectivePrice: (modelId) => {
      const { models, customPrices } = get();
      const model = models.find(m => m.id === modelId);
      
      if (!model) return null;

      const customPrice = customPrices[modelId];
      if (customPrice) {
        return {
          input: customPrice.input,
          output: customPrice.output,
        };
      }

      if (model.inputPrice !== undefined && model.outputPrice !== undefined) {
        return {
          input: model.inputPrice,
          output: model.outputPrice,
        };
      }

      return null;
    },

    // Get model by ID
    getModel: (id) => {
      return get().models.find(model => model.id === id) || null;
    },

    // Get models by type
    getModelsByType: (type) => {
      return get().models.filter(model => model.type === type);
    },

    // Get models by provider
    getModelsByProvider: (provider) => {
      return get().models.filter(model => model.provider === provider);
    },

    // Search models
    searchModels: (query) => {
      const { models } = get();
      const lowercaseQuery = query.toLowerCase();
      
      return models.filter(model =>
        model.name.toLowerCase().includes(lowercaseQuery) ||
        model.id.toLowerCase().includes(lowercaseQuery) ||
        model.provider.toLowerCase().includes(lowercaseQuery) ||
        model.description?.toLowerCase().includes(lowercaseQuery)
      );
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

    // Load from storage
    loadFromStorage: () => {
      try {
        const models = storageService.get<ModelInfo[]>(STORAGE_KEYS.MODELS, {
          type: 'array',
          items: MODEL_INFO_SCHEMA,
        }) || [];

        const customPrices = storageService.get<Record<string, ModelPrice>>(
          STORAGE_KEYS.MODEL_PRICES,
          { type: 'object' }
        ) || {};

        set({ models, customPrices });
      } catch (error) {
        console.error('Failed to load model data from storage:', error);
        get().setError('models', 'Failed to load model data');
      }
    },

    // Save to storage
    saveToStorage: () => {
      try {
        const { models, customPrices } = get();
        
        storageService.set(STORAGE_KEYS.MODELS, models, {
          type: 'array',
          items: MODEL_INFO_SCHEMA,
        });

        storageService.set(STORAGE_KEYS.MODEL_PRICES, customPrices, {
          type: 'object',
        });
      } catch (error) {
        console.error('Failed to save model data to storage:', error);
        get().setError('models', 'Failed to save model data');
      }
    },

    // Reset store
    reset: () => {
      set(initialState);
    },
  }))
);

// Auto-save subscription
useModelStore.subscribe(
  (state) => ({ models: state.models, customPrices: state.customPrices }),
  () => {
    // Debounced auto-save
    const timeoutId = setTimeout(() => {
      useModelStore.getState().saveToStorage();
    }, 1000);

    return () => clearTimeout(timeoutId);
  },
  { equalityFn: (a, b) => a.models === b.models && a.customPrices === b.customPrices }
);

// Load initial data
useModelStore.getState().loadFromStorage();