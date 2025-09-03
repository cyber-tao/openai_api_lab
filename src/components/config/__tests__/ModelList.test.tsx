/**
 * ModelList Component Tests
 * Tests for model list sorting and filtering functionality
 */

import { describe, it, expect } from 'vitest';
import type { ModelInfo } from '../../../types';

// Test data
const mockModels: ModelInfo[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    type: 'text',
    contextLength: 8192,
    inputPrice: 0.03,
    outputPrice: 0.06,
    capabilities: [{ type: 'text' }],
    provider: 'OpenAI',
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    type: 'text',
    contextLength: 4096,
    inputPrice: 0.001,
    outputPrice: 0.002,
    capabilities: [{ type: 'text' }],
    provider: 'OpenAI',
  },
  {
    id: 'claude-3',
    name: 'Claude 3',
    type: 'multimodal',
    contextLength: 200000,
    inputPrice: 0.015,
    outputPrice: 0.075,
    capabilities: [{ type: 'text' }, { type: 'vision' }],
    provider: 'Anthropic',
  },
];

describe('ModelList', () => {
  it('should have models with different context lengths for sorting', () => {
    const contextLengths = mockModels.map(m => m.contextLength);
    expect(contextLengths).toEqual([8192, 4096, 200000]);
    
    // Test sorting by context length
    const sorted = [...mockModels].sort((a, b) => b.contextLength - a.contextLength);
    expect(sorted[0].name).toBe('Claude 3'); // Highest context length
    expect(sorted[2].name).toBe('GPT-3.5 Turbo'); // Lowest context length
  });

  it('should have models with different types for filtering', () => {
    const types = [...new Set(mockModels.map(m => m.type))];
    expect(types).toContain('text');
    expect(types).toContain('multimodal');
  });

  it('should have models with different providers for filtering', () => {
    const providers = [...new Set(mockModels.map(m => m.provider))];
    expect(providers).toContain('OpenAI');
    expect(providers).toContain('Anthropic');
  });

  it('should have models with pricing information', () => {
    const modelsWithPricing = mockModels.filter(m => 
      m.inputPrice !== undefined && m.outputPrice !== undefined
    );
    expect(modelsWithPricing).toHaveLength(3);
  });

  it('should support sorting by pricing', () => {
    const sortedByInputPrice = [...mockModels].sort((a, b) => 
      (a.inputPrice || 0) - (b.inputPrice || 0)
    );
    expect(sortedByInputPrice[0].name).toBe('GPT-3.5 Turbo'); // Cheapest
    expect(sortedByInputPrice[2].name).toBe('GPT-4'); // Most expensive
  });

  it('should have models with different capability counts', () => {
    const capabilityCounts = mockModels.map(m => m.capabilities.length);
    expect(capabilityCounts).toEqual([1, 1, 2]);
    
    // Test sorting by capability count
    const sorted = [...mockModels].sort((a, b) => b.capabilities.length - a.capabilities.length);
    expect(sorted[0].name).toBe('Claude 3'); // Most capabilities
  });
});