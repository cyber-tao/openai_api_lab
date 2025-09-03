/**
 * Test Service
 * Handles performance test execution and API calls
 */

import { createAPIClient } from './api/openai';
import { useTestStore } from '../stores/testStore';
import { useConfigStore } from '../stores/configStore';
import type { 
  TestResult, 
  PerformanceTest 
} from '../types/testing';
import type { APIConfig } from '../types';

interface TestExecutionOptions {
  testId: string;
  config: APIConfig;
  onProgress?: (progress: number, iteration: number) => void;
  onResult?: (result: TestResult) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
}

class TestService {
  private abortController: AbortController | null = null;
  private isRunning = false;

  /**
   * Execute a performance test
   */
  async executeTest(options: TestExecutionOptions): Promise<void> {
    const { testId, config, onProgress, onResult, onError, onComplete } = options;
    
    const testStore = useTestStore.getState();
    const test = testStore.tests.find(t => t.id === testId);
    
    if (!test) {
      onError?.('Test not found');
      return;
    }

    this.abortController = new AbortController();
    this.isRunning = true;

    try {
      await this.runTestIterations(test, config, {
        onProgress,
        onResult,
        onError,
        signal: this.abortController.signal,
      });
      
      onComplete?.();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        onError?.('Test was cancelled');
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        onError?.(errorMessage);
      }
    } finally {
      this.isRunning = false;
      this.abortController = null;
    }
  }

  /**
   * Stop the currently running test
   */
  stopTest(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isRunning = false;
  }

  /**
   * Check if a test is currently running
   */
  isTestRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Run test iterations for all models
   */
  private async runTestIterations(
    test: PerformanceTest,
    config: APIConfig,
    options: {
      onProgress?: (progress: number, iteration: number) => void;
      onResult?: (result: TestResult) => void;
      onError?: (error: string) => void;
      signal: AbortSignal;
    }
  ): Promise<void> {
    const { configuration } = test;
    const { modelIds, iterations, concurrent, prompt, parameters } = configuration;
    const { onProgress, onResult, onError, signal } = options;

    const totalRequests = modelIds.length * iterations;
    let completedRequests = 0;

    // Create API client
    const client = createAPIClient(config);

    // Create request queue
    const requests: Array<{
      modelId: string;
      iteration: number;
    }> = [];

    for (let iteration = 1; iteration <= iterations; iteration++) {
      for (const modelId of modelIds) {
        requests.push({ modelId, iteration });
      }
    }

    // Execute requests with concurrency control
    await this.executeConcurrentRequests({
      requests,
      concurrent,
      client,
      test,
      prompt,
      parameters,
      signal,
      onRequestComplete: (result) => {
        completedRequests++;
        const progress = (completedRequests / totalRequests) * 100;
        
        onProgress?.(progress, completedRequests);
        onResult?.(result);
        
        // Add result to store
        const testStore = useTestStore.getState();
        testStore.addResult(result);
      },
      onRequestError: (error) => {
        completedRequests++;
        const progress = (completedRequests / totalRequests) * 100;
        
        onProgress?.(progress, completedRequests);
        onError?.(error);
      },
    });
  }

  /**
   * Execute requests with concurrency control
   */
  private async executeConcurrentRequests(options: {
    requests: Array<{ modelId: string; iteration: number }>;
    concurrent: number;
    client: any;
    test: PerformanceTest;
    prompt: string;
    parameters: any;
    signal: AbortSignal;
    onRequestComplete: (result: TestResult) => void;
    onRequestError: (error: string) => void;
  }): Promise<void> {
    const {
      requests,
      concurrent,
      client,
      test,
      prompt,
      parameters,
      signal,
      onRequestComplete,
      onRequestError,
    } = options;

    const semaphore = new Semaphore(concurrent);
    const promises: Promise<void>[] = [];

    for (const request of requests) {
      const promise = semaphore.acquire().then(async (release) => {
        try {
          if (signal.aborted) {
            throw new Error('Test was cancelled');
          }

          const result = await this.executeModelRequest({
            testId: test.id,
            modelId: request.modelId,
            iteration: request.iteration,
            prompt,
            parameters,
            client,
            timeout: test.configuration.timeout || 30000,
          });

          onRequestComplete(result);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // Create failed result
          const failedResult: TestResult = {
            id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            testId: test.id,
            modelId: request.modelId,
            iteration: request.iteration,
            success: false,
            responseTime: 0,
            error: errorMessage,
            timestamp: Date.now(),
          };
          
          onRequestComplete(failedResult);
          onRequestError(errorMessage);
        } finally {
          release();
        }
      });

      promises.push(promise);
    }

    await Promise.all(promises);
  }

  /**
   * Execute a single model request
   */
  private async executeModelRequest(options: {
    testId: string;
    modelId: string;
    iteration: number;
    prompt: string;
    parameters: any;
    client: any;
    timeout: number;
  }): Promise<TestResult> {
    const {
      testId,
      modelId,
      iteration,
      prompt,
      parameters,
      client,
      timeout,
    } = options;

    const startTime = Date.now();
    
    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout);
      });

      // Make API request
      const requestPromise = client.createChatCompletion({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        ...parameters,
        stream: false,
      });

      const response = await Promise.race([requestPromise, timeoutPromise]);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (!response.success || !response.data) {
        throw new Error(response.error || 'API request failed');
      }

      const { data } = response;
      const usage = data.usage;
      const totalTokens = usage ? usage.total_tokens : 0;
      
      // Calculate cost
      const cost = this.calculateCost(modelId, usage);

      return {
        id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        testId,
        modelId,
        iteration,
        success: true,
        responseTime,
        tokens: totalTokens,
        cost,
        timestamp: Date.now(),
      };
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        testId,
        modelId,
        iteration,
        success: false,
        responseTime,
        error: errorMessage,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Calculate cost based on token usage and model pricing
   */
  private calculateCost(modelId: string, usage?: any): number {
    if (!usage) return 0;

    const configStore = useConfigStore.getState();
    const modelPrice = configStore.getModelPrice(modelId);
    
    if (!modelPrice) return 0;

    const inputCost = (usage.prompt_tokens || 0) * (modelPrice.input || 0) / 1000;
    const outputCost = (usage.completion_tokens || 0) * (modelPrice.output || 0) / 1000;
    
    return inputCost + outputCost;
  }
}

/**
 * Simple semaphore implementation for concurrency control
 */
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve(() => this.release());
      } else {
        this.waitQueue.push(() => {
          this.permits--;
          resolve(() => this.release());
        });
      }
    });
  }

  private release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      next?.();
    }
  }
}

// Export singleton instance
export const testService = new TestService();
export default testService;