/**
 * Message Processing Service
 * Handles message sending, streaming responses, token counting, and cost calculation
 */

import { APIClientManager } from './api/openai';
import { useChatStore } from '../stores/chatStore';
import { useConfigStore } from '../stores/configStore';
import { useModelStore } from '../stores/modelStore';
import type { 
  ChatMessage, 
  TokenUsage, 
  CostCalculation,
  ModelInfo 
} from '../types';

export interface MessageProcessingOptions {
  sessionId: string;
  message: string;
  attachments?: any[];
  onStream?: (content: string) => void;
  onProgress?: (progress: { stage: string; progress: number }) => void;
  onTokenUpdate?: (tokens: TokenUsage) => void;
  onCostUpdate?: (cost: number) => void;
}

export interface MessageProcessingResult {
  success: boolean;
  messageId?: string;
  tokens?: TokenUsage;
  cost?: number;
  responseTime?: number;
  error?: string;
}

export interface RetryOptions {
  messageId: string;
  maxRetries?: number;
  retryDelay?: number;
}

class MessageService {
  private retryAttempts = new Map<string, number>();
  private activeRequests = new Map<string, AbortController>();

  /**
   * Send a message and process the response
   */
  async sendMessage(options: MessageProcessingOptions): Promise<MessageProcessingResult> {
    const { sessionId, message, attachments, onStream, onProgress, onTokenUpdate, onCostUpdate } = options;
    
    try {
      // Get stores
      const chatStore = useChatStore.getState();
      const configStore = useConfigStore.getState();
      const modelStore = useModelStore.getState();

      // Get session and configuration
      const session = chatStore.sessions.find(s => s.id === sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const config = configStore.configs.find(c => c.id === session.apiConfigId);
      if (!config) {
        throw new Error('API configuration not found');
      }

      const model = modelStore.models.find(m => m.id === session.modelId);

      onProgress?.({ stage: 'Preparing request', progress: 10 });

      // Add user message to chat
      const userMessageId = chatStore.addMessage({
        role: 'user',
        content: message,
        attachments,
      });

      // Create assistant message placeholder
      const assistantMessageId = chatStore.addMessage({
        role: 'assistant',
        content: '',
        isStreaming: true,
      });

      onProgress?.({ stage: 'Connecting to API', progress: 20 });

      // Start streaming
      chatStore.startStreaming(assistantMessageId);

      // Prepare messages for API
      const apiMessages = this.prepareMessagesForAPI(session.messages, message, attachments);

      // Get API client
      const client = APIClientManager.getClient(config);
      const requestId = `req_${Date.now()}`;
      const controller = new AbortController();
      this.activeRequests.set(requestId, controller);

      const startTime = Date.now();
      let streamedContent = '';
      let tokens: TokenUsage | undefined;
      let cost = 0;

      onProgress?.({ stage: 'Sending request', progress: 30 });

      // Send request with streaming
      const response = await client.createChatCompletion(
        apiMessages,
        {
          stream: !!onStream,
          ...config.parameters,
        },
        onStream ? (chunk: string) => {
          streamedContent += chunk;
          chatStore.appendToStreamingMessage(chunk);
          onStream(chunk);
        } : undefined
      );

      this.activeRequests.delete(requestId);

      if (!response.success) {
        throw new Error(response.error?.message || 'API request failed');
      }

      const responseTime = Date.now() - startTime;
      onProgress?.({ stage: 'Processing response', progress: 80 });

      // Extract response data
      const responseData = response.data;
      const finalContent = streamedContent || responseData?.choices?.[0]?.message?.content || '';
      
      // Extract token usage
      if (responseData?.usage) {
        tokens = {
          input: responseData.usage.prompt_tokens || 0,
          output: responseData.usage.completion_tokens || 0,
          total: responseData.usage.total_tokens || 0,
        };
        onTokenUpdate?.(tokens);
      }

      // Calculate cost
      if (tokens && model) {
        const costCalc = this.calculateCost(tokens, model);
        cost = costCalc.totalCost;
        onCostUpdate?.(cost);
      }

      onProgress?.({ stage: 'Updating records', progress: 90 });

      // Update assistant message
      chatStore.updateMessage(assistantMessageId, {
        content: finalContent,
        tokens,
        cost,
        responseTime,
        isStreaming: false,
      });

      // Update user message with tokens and cost (for input)
      if (tokens) {
        chatStore.updateMessage(userMessageId, {
          tokens: { input: tokens.input, output: 0, total: tokens.input },
        });
      }

      // Stop streaming
      chatStore.stopStreaming();

      // Update session statistics
      if (tokens && cost) {
        chatStore.updateSessionStats(sessionId, tokens.total, cost);
      }

      onProgress?.({ stage: 'Complete', progress: 100 });

      return {
        success: true,
        messageId: assistantMessageId,
        tokens,
        cost,
        responseTime,
      };

    } catch (error) {
      // Handle error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Stop streaming and update message with error
      const chatStore = useChatStore.getState();
      chatStore.stopStreaming();

      // Find the assistant message and update with error
      const assistantMessage = chatStore.messages.find(m => m.isStreaming);
      if (assistantMessage) {
        chatStore.updateMessage(assistantMessage.id, {
          content: assistantMessage.content || 'Failed to generate response',
          error: errorMessage,
          isStreaming: false,
        });
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Retry a failed message
   */
  async retryMessage(options: RetryOptions): Promise<MessageProcessingResult> {
    const { messageId, maxRetries = 3, retryDelay = 1000 } = options;
    
    try {
      const chatStore = useChatStore.getState();
      const message = chatStore.messages.find(m => m.id === messageId);
      
      if (!message) {
        throw new Error('Message not found');
      }

      if (message.role !== 'assistant') {
        throw new Error('Can only retry assistant messages');
      }

      // Check retry attempts
      const attempts = this.retryAttempts.get(messageId) || 0;
      if (attempts >= maxRetries) {
        throw new Error(`Maximum retry attempts (${maxRetries}) exceeded`);
      }

      // Increment retry attempts
      this.retryAttempts.set(messageId, attempts + 1);

      // Add delay for retry
      if (attempts > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
      }

      // Find the user message that triggered this response
      const messageIndex = chatStore.messages.findIndex(m => m.id === messageId);
      if (messageIndex <= 0) {
        throw new Error('Cannot find original user message');
      }

      const userMessage = chatStore.messages[messageIndex - 1];
      if (userMessage.role !== 'user') {
        throw new Error('Previous message is not from user');
      }

      // Get session
      const session = chatStore.getActiveSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Clear error from message
      chatStore.updateMessage(messageId, {
        error: undefined,
        content: '',
        isStreaming: true,
      });

      // Retry the message
      const result = await this.sendMessage({
        sessionId: session.id,
        message: userMessage.content,
        attachments: userMessage.attachments,
        onStream: (chunk) => {
          chatStore.appendToStreamingMessage(chunk);
        },
      });

      // Clear retry attempts on success
      if (result.success) {
        this.retryAttempts.delete(messageId);
      }

      return result;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Retry failed',
      };
    }
  }

  /**
   * Cancel an active message request
   */
  cancelMessage(requestId: string): boolean {
    const controller = this.activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(requestId);
      
      // Stop streaming
      const chatStore = useChatStore.getState();
      chatStore.stopStreaming();
      
      return true;
    }
    return false;
  }

  /**
   * Cancel all active requests
   */
  cancelAllMessages(): void {
    for (const [, controller] of this.activeRequests) {
      controller.abort();
    }
    this.activeRequests.clear();
    
    // Stop streaming
    const chatStore = useChatStore.getState();
    chatStore.stopStreaming();
  }

  /**
   * Get active request count
   */
  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  /**
   * Prepare messages for API request
   */
  private prepareMessagesForAPI(
    sessionMessages: ChatMessage[], 
    newMessage: string, 
    attachments?: any[]
  ): any[] {
    const apiMessages: any[] = [];

    // Add existing messages (excluding the new ones we just added)
    const existingMessages = sessionMessages.slice(0, -2); // Remove the last 2 (user + assistant placeholder)
    
    for (const msg of existingMessages) {
      if (msg.role === 'system' || msg.role === 'user' || msg.role === 'assistant') {
        const apiMessage: any = {
          role: msg.role,
          content: msg.content,
        };

        // Add attachments for multimodal models
        if (msg.attachments && msg.attachments.length > 0) {
          apiMessage.content = this.formatMessageWithAttachments(msg.content, msg.attachments);
        }

        apiMessages.push(apiMessage);
      }
    }

    // Add the new user message
    const userMessage: any = {
      role: 'user',
      content: newMessage,
    };

    // Add attachments if present
    if (attachments && attachments.length > 0) {
      userMessage.content = this.formatMessageWithAttachments(newMessage, attachments);
    }

    apiMessages.push(userMessage);

    return apiMessages;
  }

  /**
   * Format message content with attachments for multimodal models
   */
  private formatMessageWithAttachments(content: string, attachments: any[]): any {
    // For text-only models, append file contents as text
    let formattedContent = content;

    for (const attachment of attachments) {
      if (attachment.content) {
        formattedContent += `\n\n[File: ${attachment.name}]\n${attachment.content}`;
      }
    }

    // For multimodal models, we could format as array with image objects
    // This would need to be enhanced based on the specific model capabilities
    return formattedContent;
  }

  /**
   * Calculate cost based on token usage and model pricing
   */
  private calculateCost(tokens: TokenUsage, model: ModelInfo): CostCalculation {
    let inputCost = 0;
    let outputCost = 0;

    // Use custom pricing if available, otherwise use model pricing
    const inputPrice = model.customPrice?.input || model.inputPrice || 0;
    const outputPrice = model.customPrice?.output || model.outputPrice || 0;

    // Calculate costs (prices are typically per 1K tokens)
    inputCost = (tokens.input / 1000) * inputPrice;
    outputCost = (tokens.output / 1000) * outputPrice;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
      currency: model.customPrice?.currency || 'USD',
      tokensUsed: tokens,
    };
  }

  /**
   * Estimate tokens for a message (rough estimation)
   */
  estimateTokens(content: string, attachments?: any[]): number {
    // Rough estimation: ~4 characters per token for English text
    let tokenCount = Math.ceil(content.length / 4);

    // Add estimated tokens for attachments
    if (attachments) {
      for (const attachment of attachments) {
        if (attachment.content) {
          tokenCount += Math.ceil(attachment.content.length / 4);
        }
        // Add overhead for file metadata
        tokenCount += 50;
      }
    }

    return tokenCount;
  }

  /**
   * Get retry attempts for a message
   */
  getRetryAttempts(messageId: string): number {
    return this.retryAttempts.get(messageId) || 0;
  }

  /**
   * Clear retry attempts for a message
   */
  clearRetryAttempts(messageId: string): void {
    this.retryAttempts.delete(messageId);
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): {
    activeRequests: number;
    totalRetryAttempts: number;
    messagesWithRetries: number;
  } {
    return {
      activeRequests: this.activeRequests.size,
      totalRetryAttempts: Array.from(this.retryAttempts.values()).reduce((sum, attempts) => sum + attempts, 0),
      messagesWithRetries: this.retryAttempts.size,
    };
  }
}

// Create singleton instance
export const messageService = new MessageService();

// Export types are already exported above