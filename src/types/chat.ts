/**
 * Chat Session and Message Types
 * Defines interfaces for chat functionality and conversation management
 */

import type { TokenUsage } from './model';
import type { FileAttachment } from './file';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  attachments?: FileAttachment[];
  timestamp: number;
  tokens?: TokenUsage;
  cost?: number;
  responseTime?: number;
  error?: string;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  modelId: string;
  apiConfigId: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  totalTokens: number;
  totalCost: number;
  messageCount: number;
  averageResponseTime?: number;
}

export interface ChatStatistics {
  totalSessions: number;
  totalMessages: number;
  totalTokens: TokenUsage;
  totalCost: number;
  averageResponseTime: number;
  mostUsedModel: string;
  sessionsToday: number;
  costToday: number;
}

export interface StreamingResponse {
  id: string;
  content: string;
  isComplete: boolean;
  tokens?: TokenUsage;
  error?: string;
}