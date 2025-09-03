/**
 * Testing Store
 * Manages performance tests and model comparisons with Zustand and localStorage persistence
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { PerformanceTest, TestResult, TestConfiguration, ModelComparison } from '../types';
import { STORAGE_KEYS } from '../types/storage';
import { storageService } from '../services/storage';

interface TestState {
  // Performance Tests
  tests: PerformanceTest[];
  activeTestId: string | null;
  
  // Test Results
  results: TestResult[];
  
  // Model Comparisons
  comparisons: ModelComparison[];
  
  // Current test execution
  currentTest: {
    id: string | null;
    status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
    progress: number;
    startTime: number | null;
    endTime: number | null;
    currentIteration: number;
    totalIterations: number;
    errors: string[];
  };
  
  // Loading states
  loading: {
    tests: boolean;
    results: boolean;
    running: boolean;
  };
  
  // Error states
  errors: {
    tests: string | null;
    results: string | null;
    execution: string | null;
  };

  // Test management actions
  createTest: (config: TestConfiguration) => string;
  updateTest: (id: string, updates: Partial<PerformanceTest>) => void;
  deleteTest: (id: string) => void;
  duplicateTest: (id: string) => string | null;
  
  // Test execution actions
  startTest: (testId: string) => Promise<void>;
  pauseTest: () => void;
  resumeTest: () => void;
  stopTest: () => void;
  
  // Result management
  addResult: (result: Omit<TestResult, 'id' | 'timestamp'>) => string;
  deleteResult: (id: string) => void;
  clearResults: (testId?: string) => void;
  
  // Comparison actions
  createComparison: (name: string, modelIds: string[], testConfig: TestConfiguration) => string;
  updateComparison: (id: string, updates: Partial<ModelComparison>) => void;
  deleteComparison: (id: string) => void;
  
  // Progress tracking
  updateProgress: (progress: number, iteration?: number) => void;
  addError: (error: string) => void;
  
  // Statistics and analysis
  getTestStatistics: (testId: string) => {
    totalRuns: number;
    averageResponseTime: number;
    successRate: number;
    totalTokens: number;
    totalCost: number;
  } | null;
  
  getModelComparison: (modelIds: string[]) => {
    models: string[];
    averageResponseTimes: number[];
    successRates: number[];
    costs: number[];
  } | null;
  
  // Loading and error management
  setLoading: (key: keyof TestState['loading'], value: boolean) => void;
  setError: (key: keyof TestState['errors'], value: string | null) => void;
  
  // Persistence
  loadFromStorage: () => void;
  saveToStorage: () => void;
  
  // Export and import
  exportTests: () => PerformanceTest[];
  exportResults: (testId?: string) => TestResult[];
  importTests: (tests: PerformanceTest[]) => boolean;
  importResults: (results: TestResult[]) => boolean;
  
  // Utilities
  reset: () => void;
  getRecentTests: (limit?: number) => PerformanceTest[];
}

const initialState = {
  tests: [],
  activeTestId: null,
  results: [],
  comparisons: [],
  currentTest: {
    id: null,
    status: 'idle' as const,
    progress: 0,
    startTime: null,
    endTime: null,
    currentIteration: 0,
    totalIterations: 0,
    errors: [],
  },
  loading: {
    tests: false,
    results: false,
    running: false,
  },
  errors: {
    tests: null,
    results: null,
    execution: null,
  },
};

export const useTestStore = create<TestState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Create new performance test
    createTest: (config) => {
      const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = Date.now();
      
      const test: PerformanceTest = {
        id: testId,
        name: config.name || `Test ${new Date().toLocaleString()}`,
        description: config.description || '',
        configuration: config,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        averageResponseTime: 0,
        totalTokens: 0,
        totalCost: 0,
      };

      set((state) => ({
        tests: [test, ...state.tests],
        activeTestId: testId,
      }));

      get().saveToStorage();
      return testId;
    },

    // Update test
    updateTest: (id, updates) => {
      set((state) => {
        const tests = state.tests.map(test => {
          if (test.id === id) {
            return {
              ...test,
              ...updates,
              updatedAt: Date.now(),
            };
          }
          return test;
        });

        return { tests };
      });

      get().saveToStorage();
    },

    // Delete test
    deleteTest: (id) => {
      set((state) => {
        const tests = state.tests.filter(test => test.id !== id);
        const results = state.results.filter(result => result.testId !== id);
        let activeTestId = state.activeTestId;

        if (activeTestId === id) {
          activeTestId = tests[0]?.id || null;
        }

        return {
          tests,
          results,
          activeTestId,
        };
      });

      get().saveToStorage();
    },

    // Duplicate test
    duplicateTest: (id) => {
      const { tests } = get();
      const originalTest = tests.find(t => t.id === id);
      
      if (!originalTest) return null;

      const newTestId = get().createTest({
        name: `${originalTest.name} (Copy)`,
        description: originalTest.description,
        modelIds: originalTest.configuration.modelIds,
        prompt: originalTest.configuration.prompt,
        parameters: originalTest.configuration.parameters,
        concurrent: originalTest.configuration.concurrent,
        iterations: originalTest.configuration.iterations,
      });

      return newTestId;
    },

    // Start test execution
    startTest: async (testId) => {
      const { tests } = get();
      const test = tests.find(t => t.id === testId);
      
      if (!test) {
        get().setError('execution', 'Test not found');
        return;
      }

      set((state) => ({
        currentTest: {
          ...state.currentTest,
          id: testId,
          status: 'running',
          progress: 0,
          startTime: Date.now(),
          endTime: null,
          currentIteration: 0,
          totalIterations: test.configuration.iterations || 1,
          errors: [],
        },
      }));

      // Update test status
      get().updateTest(testId, { status: 'running' });
    },

    // Pause test
    pauseTest: () => {
      set((state) => ({
        currentTest: {
          ...state.currentTest,
          status: 'paused',
        },
      }));
    },

    // Resume test
    resumeTest: () => {
      set((state) => ({
        currentTest: {
          ...state.currentTest,
          status: 'running',
        },
      }));
    },

    // Stop test
    stopTest: () => {
      const { currentTest } = get();
      
      set((state) => ({
        currentTest: {
          ...state.currentTest,
          status: 'completed',
          endTime: Date.now(),
        },
      }));

      // Update test status
      if (currentTest.id) {
        get().updateTest(currentTest.id, { 
          status: 'completed',
        });
      }
    },

    // Add test result
    addResult: (resultData) => {
      const resultId = `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const result: TestResult = {
        id: resultId,
        ...resultData,
        timestamp: Date.now(),
      };

      set((state) => ({
        results: [result, ...state.results],
      }));

      // Update test statistics
      if (result.testId) {
        const { tests } = get();
        const test = tests.find(t => t.id === result.testId);
        
        if (test) {
          const testResults = get().results.filter(r => r.testId === result.testId);
          // Update test statistics would go here
          // Note: PerformanceTest interface needs these fields
          console.log(`Test ${result.testId} completed with ${testResults.length} results`);
        }
      }

      get().saveToStorage();
      return resultId;
    },

    // Delete result
    deleteResult: (id) => {
      set((state) => ({
        results: state.results.filter(result => result.id !== id),
      }));

      get().saveToStorage();
    },

    // Clear results
    clearResults: (testId) => {
      set((state) => ({
        results: testId 
          ? state.results.filter(result => result.testId !== testId)
          : [],
      }));

      get().saveToStorage();
    },

    // Create model comparison
    createComparison: (name, modelIds, testConfig) => {
      const comparisonId = `comparison_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = Date.now();
      
      const comparison: ModelComparison = {
        id: comparisonId,
        name,
        modelIds,
        testConfiguration: testConfig,
        results: {},
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };

      set((state) => ({
        comparisons: [comparison, ...state.comparisons],
      }));

      get().saveToStorage();
      return comparisonId;
    },

    // Update comparison
    updateComparison: (id, updates) => {
      set((state) => {
        const comparisons = state.comparisons.map(comparison => {
          if (comparison.id === id) {
            return {
              ...comparison,
              ...updates,
              updatedAt: Date.now(),
            };
          }
          return comparison;
        });

        return { comparisons };
      });

      get().saveToStorage();
    },

    // Delete comparison
    deleteComparison: (id) => {
      set((state) => ({
        comparisons: state.comparisons.filter(comparison => comparison.id !== id),
      }));

      get().saveToStorage();
    },

    // Update progress
    updateProgress: (progress, iteration) => {
      set((state) => ({
        currentTest: {
          ...state.currentTest,
          progress: Math.max(0, Math.min(100, progress)),
          currentIteration: iteration !== undefined ? iteration : state.currentTest.currentIteration,
        },
      }));
    },

    // Add error
    addError: (error) => {
      set((state) => ({
        currentTest: {
          ...state.currentTest,
          errors: [...state.currentTest.errors, error],
        },
      }));
    },

    // Get test statistics
    getTestStatistics: (testId) => {
      const { tests, results } = get();
      const test = tests.find(t => t.id === testId);
      
      if (!test) return null;

      const testResults = results.filter(r => r.testId === testId);
      const totalRuns = testResults.length;
      
      if (totalRuns === 0) {
        return {
          totalRuns: 0,
          averageResponseTime: 0,
          successRate: 0,
          totalTokens: 0,
          totalCost: 0,
        };
      }

      const successfulRuns = testResults.filter(r => r.success).length;
      const averageResponseTime = testResults.reduce((sum, r) => sum + r.responseTime, 0) / totalRuns;
      const totalTokens = testResults.reduce((sum, r) => sum + (r.tokens || 0), 0);
      const totalCost = testResults.reduce((sum, r) => sum + (r.cost || 0), 0);

      return {
        totalRuns,
        averageResponseTime,
        successRate: (successfulRuns / totalRuns) * 100,
        totalTokens,
        totalCost,
      };
    },

    // Get model comparison data
    getModelComparison: (modelIds) => {
      const { results } = get();
      
      const comparisonData = modelIds.map(modelId => {
        const modelResults = results.filter(r => r.modelId === modelId && r.success);
        
        if (modelResults.length === 0) {
          return {
            modelId,
            averageResponseTime: 0,
            successRate: 0,
            cost: 0,
          };
        }

        const totalResults = results.filter(r => r.modelId === modelId).length;
        const averageResponseTime = modelResults.reduce((sum, r) => sum + r.responseTime, 0) / modelResults.length;
        const successRate = (modelResults.length / totalResults) * 100;
        const cost = modelResults.reduce((sum, r) => sum + (r.cost || 0), 0);

        return {
          modelId,
          averageResponseTime,
          successRate,
          cost,
        };
      });

      return {
        models: modelIds,
        averageResponseTimes: comparisonData.map(d => d.averageResponseTime),
        successRates: comparisonData.map(d => d.successRate),
        costs: comparisonData.map(d => d.cost),
      };
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
        const tests = storageService.get<PerformanceTest[]>(STORAGE_KEYS.PERFORMANCE_TESTS) || [];
        const results = storageService.get<TestResult[]>(STORAGE_KEYS.TEST_RESULTS) || [];
        const comparisons = storageService.get<ModelComparison[]>(STORAGE_KEYS.TEST_COMPARISONS) || [];

        set({
          tests,
          results,
          comparisons,
          activeTestId: tests[0]?.id || null,
        });
      } catch (error) {
        console.error('Failed to load test data from storage:', error);
        get().setError('tests', 'Failed to load test data');
      }
    },

    // Save to storage
    saveToStorage: () => {
      try {
        const { tests, results, comparisons } = get();
        
        storageService.set(STORAGE_KEYS.PERFORMANCE_TESTS, tests);
        storageService.set(STORAGE_KEYS.TEST_RESULTS, results);
        storageService.set(STORAGE_KEYS.TEST_COMPARISONS, comparisons);
      } catch (error) {
        console.error('Failed to save test data to storage:', error);
        get().setError('tests', 'Failed to save test data');
      }
    },

    // Export tests
    exportTests: () => {
      return get().tests;
    },

    // Export results
    exportResults: (testId) => {
      const { results } = get();
      return testId 
        ? results.filter(r => r.testId === testId)
        : results;
    },

    // Import tests
    importTests: (tests) => {
      try {
        set((state) => {
          const existingIds = new Set(state.tests.map(t => t.id));
          const newTests = tests.filter(t => !existingIds.has(t.id));
          
          return {
            tests: [...newTests, ...state.tests],
          };
        });

        get().saveToStorage();
        return true;
      } catch (error) {
        console.error('Failed to import tests:', error);
        get().setError('tests', 'Failed to import tests');
        return false;
      }
    },

    // Import results
    importResults: (results) => {
      try {
        set((state) => {
          const existingIds = new Set(state.results.map(r => r.id));
          const newResults = results.filter(r => !existingIds.has(r.id));
          
          return {
            results: [...newResults, ...state.results],
          };
        });

        get().saveToStorage();
        return true;
      } catch (error) {
        console.error('Failed to import results:', error);
        get().setError('results', 'Failed to import results');
        return false;
      }
    },

    // Reset store
    reset: () => {
      set(initialState);
    },

    // Get recent tests
    getRecentTests: (limit = 10) => {
      const { tests } = get();
      return tests
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
    },
  }))
);

// Auto-save subscription
useTestStore.subscribe(
  (state) => ({ tests: state.tests, results: state.results, comparisons: state.comparisons }),
  () => {
    // Debounced auto-save
    const timeoutId = setTimeout(() => {
      useTestStore.getState().saveToStorage();
    }, 1000);

    return () => clearTimeout(timeoutId);
  },
  { 
    equalityFn: (a, b) => 
      a.tests === b.tests && 
      a.results === b.results && 
      a.comparisons === b.comparisons 
  }
);

// Load initial data
useTestStore.getState().loadFromStorage();