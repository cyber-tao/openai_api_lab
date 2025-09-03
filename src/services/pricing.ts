/**
 * Pricing Service
 * Handles cost calculations and pricing utilities
 */

import type { ModelInfo, ModelPrice, TokenUsage, CostCalculation } from '../types';

/**
 * Calculate cost for token usage
 */
export function calculateCost(
  tokenUsage: TokenUsage,
  inputPrice: number,
  outputPrice: number,
  currency: string = 'USD'
): CostCalculation {
  const inputCost = (inputPrice / 1000) * tokenUsage.input;
  const outputCost = (outputPrice / 1000) * tokenUsage.output;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    currency,
    tokensUsed: tokenUsage,
  };
}

/**
 * Get effective pricing for a model (custom price overrides API price)
 */
export function getEffectivePrice(
  model: ModelInfo,
  customPrice?: ModelPrice | null
): { input: number; output: number; currency: string } | null {
  if (customPrice) {
    return {
      input: customPrice.input,
      output: customPrice.output,
      currency: customPrice.currency,
    };
  }

  if (model.inputPrice !== undefined && model.outputPrice !== undefined) {
    return {
      input: model.inputPrice,
      output: model.outputPrice,
      currency: 'USD', // Default currency for API prices
    };
  }

  return null;
}

/**
 * Estimate token count from text (simplified approximation)
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  
  // Rough estimation based on OpenAI's guidelines:
  // - 1 token ≈ 4 characters for English text
  // - 1 token ≈ 0.75 words on average
  
  const chars = text.length;
  const words = text.split(/\s+/).filter(word => word.length > 0).length;
  
  // Use the higher of the two estimates for safety
  const charBasedTokens = Math.ceil(chars / 4);
  const wordBasedTokens = Math.ceil(words / 0.75);
  
  return Math.max(charBasedTokens, wordBasedTokens);
}

/**
 * Calculate cost per token for a model
 */
export function calculateCostPerToken(
  model: ModelInfo,
  customPrice?: ModelPrice | null
): { input: number; output: number; average: number } | null {
  const effectivePrice = getEffectivePrice(model, customPrice);
  
  if (!effectivePrice) return null;

  const inputCostPerToken = effectivePrice.input / 1000;
  const outputCostPerToken = effectivePrice.output / 1000;
  const averageCostPerToken = (inputCostPerToken + outputCostPerToken) / 2;

  return {
    input: inputCostPerToken,
    output: outputCostPerToken,
    average: averageCostPerToken,
  };
}

/**
 * Estimate cost for a conversation
 */
export function estimateConversationCost(
  messages: Array<{ role: string; content: string }>,
  model: ModelInfo,
  customPrice?: ModelPrice | null,
  expectedOutputLength?: number
): CostCalculation | null {
  const effectivePrice = getEffectivePrice(model, customPrice);
  
  if (!effectivePrice) return null;

  // Calculate input tokens (all messages)
  const inputTokens = messages.reduce((total, message) => {
    return total + estimateTokenCount(message.content);
  }, 0);

  // Estimate output tokens
  const outputTokens = expectedOutputLength 
    ? estimateTokenCount(' '.repeat(expectedOutputLength))
    : Math.ceil(inputTokens * 0.5); // Default to 50% of input length

  const tokenUsage: TokenUsage = {
    input: inputTokens,
    output: outputTokens,
    total: inputTokens + outputTokens,
  };

  return calculateCost(tokenUsage, effectivePrice.input, effectivePrice.output, effectivePrice.currency);
}

/**
 * Compare costs between different models
 */
export function compareModelCosts(
  models: ModelInfo[],
  tokenUsage: TokenUsage,
  customPrices: Record<string, ModelPrice>
): Array<{
  model: ModelInfo;
  cost: CostCalculation | null;
  costPerToken: number | null;
}> {
  return models.map(model => {
    const customPrice = customPrices[model.id];
    const effectivePrice = getEffectivePrice(model, customPrice);
    
    let cost: CostCalculation | null = null;
    let costPerToken: number | null = null;

    if (effectivePrice) {
      cost = calculateCost(tokenUsage, effectivePrice.input, effectivePrice.output, effectivePrice.currency);
      costPerToken = cost.totalCost / tokenUsage.total;
    }

    return {
      model,
      cost,
      costPerToken,
    };
  }).sort((a, b) => {
    // Sort by cost (cheapest first), models without pricing go to end
    if (a.costPerToken === null) return 1;
    if (b.costPerToken === null) return -1;
    return a.costPerToken - b.costPerToken;
  });
}

/**
 * Calculate monthly cost projection
 */
export function calculateMonthlyCost(
  dailyTokenUsage: TokenUsage,
  model: ModelInfo,
  customPrice?: ModelPrice | null
): CostCalculation | null {
  const effectivePrice = getEffectivePrice(model, customPrice);
  
  if (!effectivePrice) return null;

  const monthlyTokenUsage: TokenUsage = {
    input: dailyTokenUsage.input * 30,
    output: dailyTokenUsage.output * 30,
    total: dailyTokenUsage.total * 30,
  };

  return calculateCost(monthlyTokenUsage, effectivePrice.input, effectivePrice.output, effectivePrice.currency);
}

/**
 * Pricing tier recommendations
 */
export interface PricingTier {
  name: string;
  description: string;
  monthlyTokenLimit: number;
  estimatedMonthlyCost: number;
  recommended: boolean;
}

export function getPricingRecommendations(
  averageDailyTokens: number,
  model: ModelInfo,
  customPrice?: ModelPrice | null
): PricingTier[] {
  const effectivePrice = getEffectivePrice(model, customPrice);
  
  if (!effectivePrice) return [];

  const monthlyTokens = averageDailyTokens * 30;
  const costPerToken = (effectivePrice.input + effectivePrice.output) / 2000; // Average cost per token

  const tiers: PricingTier[] = [
    {
      name: 'Light Usage',
      description: 'Perfect for occasional use and testing',
      monthlyTokenLimit: 100000,
      estimatedMonthlyCost: 100000 * costPerToken,
      recommended: monthlyTokens <= 100000,
    },
    {
      name: 'Regular Usage',
      description: 'Good for regular development and small projects',
      monthlyTokenLimit: 1000000,
      estimatedMonthlyCost: 1000000 * costPerToken,
      recommended: monthlyTokens > 100000 && monthlyTokens <= 1000000,
    },
    {
      name: 'Heavy Usage',
      description: 'Suitable for production applications',
      monthlyTokenLimit: 10000000,
      estimatedMonthlyCost: 10000000 * costPerToken,
      recommended: monthlyTokens > 1000000 && monthlyTokens <= 10000000,
    },
    {
      name: 'Enterprise',
      description: 'For large-scale applications with high volume',
      monthlyTokenLimit: 100000000,
      estimatedMonthlyCost: 100000000 * costPerToken,
      recommended: monthlyTokens > 10000000,
    },
  ];

  return tiers;
}

/**
 * Budget tracking utilities
 */
export interface BudgetAlert {
  type: 'warning' | 'danger';
  message: string;
  currentSpend: number;
  budgetLimit: number;
  percentageUsed: number;
}

export function checkBudgetAlerts(
  currentSpend: number,
  budgetLimit: number,
  warningThreshold: number = 0.8,
  dangerThreshold: number = 0.95
): BudgetAlert | null {
  if (budgetLimit <= 0) return null;

  const percentageUsed = currentSpend / budgetLimit;

  if (percentageUsed >= dangerThreshold) {
    return {
      type: 'danger',
      message: `You've used ${(percentageUsed * 100).toFixed(1)}% of your budget!`,
      currentSpend,
      budgetLimit,
      percentageUsed,
    };
  }

  if (percentageUsed >= warningThreshold) {
    return {
      type: 'warning',
      message: `You've used ${(percentageUsed * 100).toFixed(1)}% of your budget.`,
      currentSpend,
      budgetLimit,
      percentageUsed,
    };
  }

  return null;
}