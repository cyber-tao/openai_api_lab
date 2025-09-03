/**
 * Message Processing Hook
 * React hook for handling message sending, streaming, and retry functionality
 */

import { useState, useCallback, useRef } from 'react';
import { message as antdMessage } from 'antd';
import { messageService } from '../services/messageService';
import { useChatStore } from '../stores/chatStore';
import type { 
  MessageProcessingOptions, 
  MessageProcessingResult,
  RetryOptions
} from '../services/messageService';
import type { TokenUsage } from '../types';

export interface MessageProcessingState {
  isProcessing: boolean;
  progress: {
    stage: string;
    progress: number;
  } | null;
  error: string | null;
  currentTokens: TokenUsage | null;
  currentCost: number | null;
  streamingContent: string;
}

export interface UseMessageProcessingReturn {
  // State
  state: MessageProcessingState;
  
  // Actions
  sendMessage: (message: string, attachments?: any[]) => Promise<MessageProcessingResult>;
  retryMessage: (messageId: string, options?: Partial<RetryOptions>) => Promise<MessageProcessingResult>;
  cancelMessage: () => void;
  clearError: () => void;
  
  // Utilities
  estimateTokens: (content: string, attachments?: any[]) => number;
  getRetryAttempts: (messageId: string) => number;
  canRetry: (messageId: string) => boolean;
}

export function useMessageProcessing(): UseMessageProcessingReturn {
  const [state, setState] = useState<MessageProcessingState>({
    isProcessing: false,
    progress: null,
    error: null,
    currentTokens: null,
    currentCost: null,
    streamingContent: '',
  });

  const currentRequestRef = useRef<string | null>(null);
  const { activeSessionId } = useChatStore();

  // Send message
  const sendMessage = useCallback(async (
    messageContent: string, 
    attachments?: any[]
  ): Promise<MessageProcessingResult> => {
    if (!activeSessionId) {
      const error = 'No active session';
      setState(prev => ({ ...prev, error }));
      antdMessage.error(error);
      return { success: false, error };
    }

    if (state.isProcessing) {
      const error = 'Another message is already being processed';
      setState(prev => ({ ...prev, error }));
      antdMessage.warning(error);
      return { success: false, error };
    }

    // Reset state
    setState({
      isProcessing: true,
      progress: { stage: 'Starting', progress: 0 },
      error: null,
      currentTokens: null,
      currentCost: null,
      streamingContent: '',
    });

    const requestId = `req_${Date.now()}`;
    currentRequestRef.current = requestId;

    try {
      const options: MessageProcessingOptions = {
        sessionId: activeSessionId,
        message: messageContent,
        attachments,
        onStream: (content: string) => {
          setState(prev => ({
            ...prev,
            streamingContent: prev.streamingContent + content,
          }));
        },
        onProgress: (progress) => {
          setState(prev => ({ ...prev, progress }));
        },
        onTokenUpdate: (tokens: TokenUsage) => {
          setState(prev => ({ ...prev, currentTokens: tokens }));
        },
        onCostUpdate: (cost: number) => {
          setState(prev => ({ ...prev, currentCost: cost }));
        },
      };

      const result = await messageService.sendMessage(options);

      // Check if request was cancelled
      if (currentRequestRef.current !== requestId) {
        return { success: false, error: 'Request was cancelled' };
      }

      if (result.success) {
        setState({
          isProcessing: false,
          progress: null,
          error: null,
          currentTokens: result.tokens || null,
          currentCost: result.cost || null,
          streamingContent: '',
        });

        antdMessage.success('Message sent successfully');
      } else {
        setState(prev => ({
          ...prev,
          isProcessing: false,
          progress: null,
          error: result.error || 'Failed to send message',
        }));

        antdMessage.error(result.error || 'Failed to send message');
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        progress: null,
        error: errorMessage,
      }));

      antdMessage.error(errorMessage);
      
      return { success: false, error: errorMessage };
    } finally {
      currentRequestRef.current = null;
    }
  }, [activeSessionId, state.isProcessing]);

  // Retry message
  const retryMessage = useCallback(async (
    messageId: string, 
    options?: Partial<RetryOptions>
  ): Promise<MessageProcessingResult> => {
    if (state.isProcessing) {
      const error = 'Another message is already being processed';
      setState(prev => ({ ...prev, error }));
      antdMessage.warning(error);
      return { success: false, error };
    }

    // Reset state
    setState({
      isProcessing: true,
      progress: { stage: 'Retrying', progress: 0 },
      error: null,
      currentTokens: null,
      currentCost: null,
      streamingContent: '',
    });

    const requestId = `retry_${Date.now()}`;
    currentRequestRef.current = requestId;

    try {
      const retryOptions: RetryOptions = {
        messageId,
        maxRetries: 3,
        retryDelay: 1000,
        ...options,
      };

      const result = await messageService.retryMessage(retryOptions);

      // Check if request was cancelled
      if (currentRequestRef.current !== requestId) {
        return { success: false, error: 'Request was cancelled' };
      }

      if (result.success) {
        setState({
          isProcessing: false,
          progress: null,
          error: null,
          currentTokens: result.tokens || null,
          currentCost: result.cost || null,
          streamingContent: '',
        });

        antdMessage.success('Message retried successfully');
      } else {
        setState(prev => ({
          ...prev,
          isProcessing: false,
          progress: null,
          error: result.error || 'Failed to retry message',
        }));

        antdMessage.error(result.error || 'Failed to retry message');
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        progress: null,
        error: errorMessage,
      }));

      antdMessage.error(errorMessage);
      
      return { success: false, error: errorMessage };
    } finally {
      currentRequestRef.current = null;
    }
  }, [state.isProcessing]);

  // Cancel message
  const cancelMessage = useCallback(() => {
    if (currentRequestRef.current) {
      messageService.cancelMessage(currentRequestRef.current);
      currentRequestRef.current = null;
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        progress: null,
        error: null,
        streamingContent: '',
      }));

      antdMessage.info('Message cancelled');
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Estimate tokens
  const estimateTokens = useCallback((content: string, attachments?: any[]): number => {
    return messageService.estimateTokens(content, attachments);
  }, []);

  // Get retry attempts
  const getRetryAttempts = useCallback((messageId: string): number => {
    return messageService.getRetryAttempts(messageId);
  }, []);

  // Check if message can be retried
  const canRetry = useCallback((messageId: string): boolean => {
    const attempts = messageService.getRetryAttempts(messageId);
    return attempts < 3 && !state.isProcessing;
  }, [state.isProcessing]);

  return {
    state,
    sendMessage,
    retryMessage,
    cancelMessage,
    clearError,
    estimateTokens,
    getRetryAttempts,
    canRetry,
  };
}

export default useMessageProcessing;