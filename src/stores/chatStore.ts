/**
 * Chat Store
 * Manages chat sessions and messages with Zustand and localStorage persistence
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ChatSession, ChatMessage, FileAttachment } from '../types';
import { STORAGE_KEYS } from '../types/storage';
import { CHAT_SESSION_SCHEMA } from '../types/validation';
import { storageService } from '../services/storage';

interface ChatState {
  // Sessions
  sessions: ChatSession[];
  activeSessionId: string | null;
  
  // Current session state
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingMessageId: string | null;
  
  // Loading states
  loading: {
    sessions: boolean;
    messages: boolean;
    sending: boolean;
  };
  
  // Error states
  errors: {
    sessions: string | null;
    messages: string | null;
    sending: string | null;
  };

  // Session actions
  createSession: (title?: string, modelId?: string, apiConfigId?: string) => string;
  updateSession: (id: string, updates: Partial<ChatSession>) => void;
  deleteSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;
  getActiveSession: () => ChatSession | null;
  duplicateSession: (id: string) => string | null;
  
  // Message actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  deleteMessage: (id: string) => void;
  clearMessages: () => void;
  
  // Streaming actions
  startStreaming: (messageId: string) => void;
  stopStreaming: () => void;
  appendToStreamingMessage: (content: string) => void;
  
  // File attachment actions
  addAttachment: (messageId: string, attachment: FileAttachment) => void;
  removeAttachment: (messageId: string, attachmentId: string) => void;
  
  // Statistics
  updateSessionStats: (sessionId: string, tokens: number, cost: number) => void;
  getSessionStats: (sessionId: string) => { totalTokens: number; totalCost: number; messageCount: number } | null;
  
  // Loading and error management
  setLoading: (key: keyof ChatState['loading'], value: boolean) => void;
  setError: (key: keyof ChatState['errors'], value: string | null) => void;
  
  // Persistence
  loadFromStorage: () => void;
  saveToStorage: () => void;
  
  // Search and filtering
  searchMessages: (query: string, sessionId?: string) => ChatMessage[];
  getRecentSessions: (limit?: number) => ChatSession[];
  
  // Export and import
  exportSession: (sessionId: string) => ChatSession | null;
  exportAllSessions: () => ChatSession[];
  importSessions: (sessions: ChatSession[]) => boolean;
  
  // Utilities
  reset: () => void;
}

const initialState = {
  sessions: [],
  activeSessionId: null,
  messages: [],
  isStreaming: false,
  streamingMessageId: null,
  loading: {
    sessions: false,
    messages: false,
    sending: false,
  },
  errors: {
    sessions: null,
    messages: null,
    sending: null,
  },
};

export const useChatStore = create<ChatState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Create new chat session
    createSession: (title, modelId, apiConfigId) => {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = Date.now();
      
      const session: ChatSession = {
        id: sessionId,
        title: title || `Chat ${new Date().toLocaleString()}`,
        modelId: modelId || '',
        apiConfigId: apiConfigId || '',
        messages: [],
        createdAt: now,
        updatedAt: now,
        totalTokens: 0,
        totalCost: 0,
        messageCount: 0,
      };

      set((state) => ({
        sessions: [session, ...state.sessions],
        activeSessionId: sessionId,
        messages: [],
      }));

      get().saveToStorage();
      return sessionId;
    },

    // Update session
    updateSession: (id, updates) => {
      set((state) => {
        const sessions = state.sessions.map(session => {
          if (session.id === id) {
            return {
              ...session,
              ...updates,
              updatedAt: Date.now(),
            };
          }
          return session;
        });

        return { sessions };
      });

      get().saveToStorage();
    },

    // Delete session
    deleteSession: (id) => {
      set((state) => {
        const sessions = state.sessions.filter(session => session.id !== id);
        let activeSessionId = state.activeSessionId;
        let messages = state.messages;

        // If deleted session was active, select another one or clear messages
        if (activeSessionId === id) {
          const nextSession = sessions[0];
          activeSessionId = nextSession?.id || null;
          messages = nextSession?.messages || [];
        }

        return {
          sessions,
          activeSessionId,
          messages,
        };
      });

      get().saveToStorage();
    },

    // Set active session
    setActiveSession: (id) => {
      const { sessions } = get();
      const session = sessions.find(s => s.id === id);
      
      set({
        activeSessionId: id,
        messages: session?.messages || [],
        isStreaming: false,
        streamingMessageId: null,
      });
    },

    // Get active session
    getActiveSession: () => {
      const { sessions, activeSessionId } = get();
      return sessions.find(session => session.id === activeSessionId) || null;
    },

    // Duplicate session
    duplicateSession: (id) => {
      const { sessions } = get();
      const originalSession = sessions.find(s => s.id === id);
      
      if (!originalSession) return null;

      const newSessionId = get().createSession(
        `${originalSession.title} (Copy)`,
        originalSession.modelId,
        originalSession.apiConfigId
      );

      // Copy messages
      const newMessages = originalSession.messages.map(msg => ({
        ...msg,
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      }));

      set((state) => {
        const sessions = state.sessions.map(session => {
          if (session.id === newSessionId) {
            return {
              ...session,
              messages: newMessages,
              messageCount: newMessages.length,
            };
          }
          return session;
        });

        return {
          sessions,
          messages: newMessages,
        };
      });

      get().saveToStorage();
      return newSessionId;
    },

    // Add message
    addMessage: (messageData) => {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const message: ChatMessage = {
        ...messageData,
        id: messageId,
        timestamp: Date.now(),
      };

      set((state) => {
        const newMessages = [...state.messages, message];
        
        // Update active session
        const sessions = state.sessions.map(session => {
          if (session.id === state.activeSessionId) {
            return {
              ...session,
              messages: newMessages,
              messageCount: newMessages.length,
              updatedAt: Date.now(),
            };
          }
          return session;
        });

        return {
          messages: newMessages,
          sessions,
        };
      });

      get().saveToStorage();
      return messageId;
    },

    // Update message
    updateMessage: (id, updates) => {
      set((state) => {
        const messages = state.messages.map(message => {
          if (message.id === id) {
            return { ...message, ...updates };
          }
          return message;
        });

        // Update session messages
        const sessions = state.sessions.map(session => {
          if (session.id === state.activeSessionId) {
            return {
              ...session,
              messages,
              updatedAt: Date.now(),
            };
          }
          return session;
        });

        return { messages, sessions };
      });

      get().saveToStorage();
    },

    // Delete message
    deleteMessage: (id) => {
      set((state) => {
        const messages = state.messages.filter(message => message.id !== id);
        
        // Update session messages
        const sessions = state.sessions.map(session => {
          if (session.id === state.activeSessionId) {
            return {
              ...session,
              messages,
              messageCount: messages.length,
              updatedAt: Date.now(),
            };
          }
          return session;
        });

        return { messages, sessions };
      });

      get().saveToStorage();
    },

    // Clear all messages in active session
    clearMessages: () => {
      set((state) => {
        const sessions = state.sessions.map(session => {
          if (session.id === state.activeSessionId) {
            return {
              ...session,
              messages: [],
              messageCount: 0,
              totalTokens: 0,
              totalCost: 0,
              updatedAt: Date.now(),
            };
          }
          return session;
        });

        return {
          messages: [],
          sessions,
        };
      });

      get().saveToStorage();
    },

    // Start streaming
    startStreaming: (messageId) => {
      set({
        isStreaming: true,
        streamingMessageId: messageId,
      });
    },

    // Stop streaming
    stopStreaming: () => {
      set({
        isStreaming: false,
        streamingMessageId: null,
      });
    },

    // Append to streaming message
    appendToStreamingMessage: (content) => {
      const { streamingMessageId } = get();
      if (!streamingMessageId) return;

      set((state) => {
        const messages = state.messages.map(message => {
          if (message.id === streamingMessageId) {
            return {
              ...message,
              content: message.content + content,
            };
          }
          return message;
        });

        return { messages };
      });
    },

    // Add attachment to message
    addAttachment: (messageId, attachment) => {
      set((state) => {
        const messages = state.messages.map(message => {
          if (message.id === messageId) {
            const attachments = message.attachments || [];
            return {
              ...message,
              attachments: [...attachments, attachment],
            };
          }
          return message;
        });

        return { messages };
      });

      get().saveToStorage();
    },

    // Remove attachment from message
    removeAttachment: (messageId, attachmentId) => {
      set((state) => {
        const messages = state.messages.map(message => {
          if (message.id === messageId && message.attachments) {
            return {
              ...message,
              attachments: message.attachments.filter(att => att.id !== attachmentId),
            };
          }
          return message;
        });

        return { messages };
      });

      get().saveToStorage();
    },

    // Update session statistics
    updateSessionStats: (sessionId, tokens, cost) => {
      set((state) => {
        const sessions = state.sessions.map(session => {
          if (session.id === sessionId) {
            return {
              ...session,
              totalTokens: (session.totalTokens || 0) + tokens,
              totalCost: (session.totalCost || 0) + cost,
              updatedAt: Date.now(),
            };
          }
          return session;
        });

        return { sessions };
      });

      get().saveToStorage();
    },

    // Get session statistics
    getSessionStats: (sessionId) => {
      const { sessions } = get();
      const session = sessions.find(s => s.id === sessionId);
      
      if (!session) return null;

      return {
        totalTokens: session.totalTokens || 0,
        totalCost: session.totalCost || 0,
        messageCount: session.messageCount || session.messages.length,
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
        const sessions = storageService.get<ChatSession[]>(STORAGE_KEYS.CHAT_SESSIONS, {
          type: 'array',
          items: CHAT_SESSION_SCHEMA,
        }) || [];

        // Load active session ID from settings
        const settings = storageService.get(STORAGE_KEYS.APP_SETTINGS);
        const activeSessionId = settings?.activeSessionId || sessions[0]?.id || null;
        const activeSession = sessions.find(s => s.id === activeSessionId);

        set({
          sessions,
          activeSessionId,
          messages: activeSession?.messages || [],
        });
      } catch (error) {
        console.error('Failed to load chat data from storage:', error);
        get().setError('sessions', 'Failed to load chat sessions');
      }
    },

    // Save to storage
    saveToStorage: () => {
      try {
        const { sessions, activeSessionId } = get();
        
        // Save sessions
        storageService.set(STORAGE_KEYS.CHAT_SESSIONS, sessions, {
          type: 'array',
          items: CHAT_SESSION_SCHEMA,
        });

        // Save active session ID to settings
        const settings = storageService.get(STORAGE_KEYS.APP_SETTINGS) || {};
        settings.activeSessionId = activeSessionId;
        settings.lastUpdated = Date.now();
        storageService.set(STORAGE_KEYS.APP_SETTINGS, settings);
      } catch (error) {
        console.error('Failed to save chat data to storage:', error);
        get().setError('sessions', 'Failed to save chat sessions');
      }
    },

    // Search messages
    searchMessages: (query, sessionId) => {
      const { sessions, messages } = get();
      const searchIn = sessionId 
        ? sessions.find(s => s.id === sessionId)?.messages || []
        : messages;

      const lowercaseQuery = query.toLowerCase();
      return searchIn.filter(message => 
        message.content.toLowerCase().includes(lowercaseQuery) ||
        message.role.toLowerCase().includes(lowercaseQuery)
      );
    },

    // Get recent sessions
    getRecentSessions: (limit = 10) => {
      const { sessions } = get();
      return sessions
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, limit);
    },

    // Export single session
    exportSession: (sessionId) => {
      const { sessions } = get();
      return sessions.find(s => s.id === sessionId) || null;
    },

    // Export all sessions
    exportAllSessions: () => {
      return get().sessions;
    },

    // Import sessions
    importSessions: (sessions) => {
      try {
        // Validate each session
        const validSessions = sessions.filter(session => {
          const validation = storageService.validateData(session, CHAT_SESSION_SCHEMA);
          if (!validation.valid) {
            console.warn('Invalid session during import:', validation.errors);
            return false;
          }
          return true;
        });

        if (validSessions.length === 0) {
          get().setError('sessions', 'No valid sessions to import');
          return false;
        }

        // Add imported sessions
        set((state) => {
          const existingIds = new Set(state.sessions.map(s => s.id));
          const newSessions = validSessions.filter(s => !existingIds.has(s.id));
          
          return {
            sessions: [...newSessions, ...state.sessions],
          };
        });

        get().saveToStorage();
        return true;
      } catch (error) {
        console.error('Failed to import sessions:', error);
        get().setError('sessions', 'Failed to import sessions');
        return false;
      }
    },

    // Reset store
    reset: () => {
      set(initialState);
    },
  }))
);

// Auto-save subscription
useChatStore.subscribe(
  (state) => ({ sessions: state.sessions, activeSessionId: state.activeSessionId }),
  () => {
    // Debounced auto-save
    const timeoutId = setTimeout(() => {
      useChatStore.getState().saveToStorage();
    }, 2000); // Longer delay for chat to avoid too frequent saves

    return () => clearTimeout(timeoutId);
  },
  { equalityFn: (a, b) => a.sessions === b.sessions && a.activeSessionId === b.activeSessionId }
);

// Load initial data
useChatStore.getState().loadFromStorage();