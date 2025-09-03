/**
 * Session Management Hook
 * Provides enhanced session management functionality
 */

import { useCallback } from 'react';
import { message } from 'antd';
import { useChatStore } from '../stores/chatStore';
import { ExportService } from '../services/exportService';
import type { ChatSession } from '../types/chat';
import type { MarkdownExportOptions } from '../types/export';

export interface UseSessionManagementReturn {
  // Session operations
  createNewSession: (title?: string, modelId?: string, apiConfigId?: string) => string;
  duplicateSession: (sessionId: string) => void;
  deleteSessionWithConfirm: (sessionId: string) => void;
  renameSession: (sessionId: string, newTitle: string) => void;
  
  // Export operations
  exportSessionAsMarkdown: (sessionId: string, options?: Partial<MarkdownExportOptions>) => void;
  exportSessionAsJSON: (sessionId: string) => void;
  exportMultipleSessionsAsMarkdown: (sessionIds: string[], options?: Partial<MarkdownExportOptions>) => void;
  exportMultipleSessionsAsJSON: (sessionIds: string[]) => void;
  exportAllSessionsAsMarkdown: (options?: Partial<MarkdownExportOptions>) => void;
  exportAllSessionsAsJSON: () => void;
  
  // Session organization
  searchSessions: (query: string) => ChatSession[];
  getSessionsByDateRange: (startDate: Date, endDate: Date) => ChatSession[];
  getSessionsByModel: (modelId: string) => ChatSession[];
  getRecentSessions: (limit?: number) => ChatSession[];
  
  // Session statistics
  getSessionStats: (sessionId: string) => {
    messageCount: number;
    totalTokens: number;
    totalCost: number;
    averageResponseTime: number;
    createdAt: number;
    lastActivity: number;
  } | null;
  
  getTotalStats: () => {
    totalSessions: number;
    totalMessages: number;
    totalTokens: number;
    totalCost: number;
    averageSessionLength: number;
    mostUsedModel: string | null;
  };
}

export const useSessionManagement = (): UseSessionManagementReturn => {
  const {
    sessions,
    createSession,
    updateSession,
    deleteSession,
    duplicateSession: storeDuplicateSession,
    setActiveSession,

    getRecentSessions: storeGetRecentSessions,
  } = useChatStore();

  // Create new session with better defaults
  const createNewSession = useCallback((title?: string, modelId?: string, apiConfigId?: string): string => {
    const defaultTitle = title || `Chat ${new Date().toLocaleString()}`;
    const sessionId = createSession(defaultTitle, modelId, apiConfigId);
    message.success('New chat session created');
    return sessionId;
  }, [createSession]);

  // Duplicate session with user feedback
  const duplicateSessionCallback = useCallback((sessionId: string): void => {
    const newSessionId = storeDuplicateSession(sessionId);
    if (newSessionId) {
      setActiveSession(newSessionId);
      message.success('Session duplicated successfully');
    } else {
      message.error('Failed to duplicate session');
    }
  }, [storeDuplicateSession, setActiveSession]);

  // Delete session with confirmation
  const deleteSessionWithConfirm = useCallback((sessionId: string): void => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      message.error('Session not found');
      return;
    }

    // For now, just delete directly. In a real app, you might want to show a confirmation modal
    deleteSession(sessionId);
    message.success(`Session "${session.title}" deleted`);
  }, [sessions, deleteSession]);

  // Rename session
  const renameSession = useCallback((sessionId: string, newTitle: string): void => {
    if (!newTitle.trim()) {
      message.error('Session title cannot be empty');
      return;
    }

    updateSession(sessionId, { title: newTitle.trim() });
    message.success('Session renamed successfully');
  }, [updateSession]);

  // Export single session as Markdown
  const exportSessionAsMarkdown = useCallback((
    sessionId: string, 
    options: Partial<MarkdownExportOptions> = {}
  ): void => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      message.error('Session not found');
      return;
    }

    try {
      ExportService.exportSessionToFile(session, {
        includeMetadata: true,
        includeStatistics: true,
        includeTimestamps: true,
        ...options,
      });
      message.success('Session exported as Markdown');
    } catch (error) {
      console.error('Export failed:', error);
      message.error('Failed to export session');
    }
  }, [sessions]);

  // Export single session as JSON
  const exportSessionAsJSON = useCallback((sessionId: string): void => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      message.error('Session not found');
      return;
    }

    try {
      ExportService.exportSessionAsJSON(session);
      message.success('Session exported as JSON');
    } catch (error) {
      console.error('Export failed:', error);
      message.error('Failed to export session');
    }
  }, [sessions]);

  // Export multiple sessions as Markdown
  const exportMultipleSessionsAsMarkdown = useCallback((
    sessionIds: string[], 
    options: Partial<MarkdownExportOptions> = {}
  ): void => {
    const sessionsToExport = sessions.filter(s => sessionIds.includes(s.id));
    
    if (sessionsToExport.length === 0) {
      message.error('No sessions found to export');
      return;
    }

    try {
      ExportService.exportSessionsToFile(sessionsToExport, 'selected-sessions.md', {
        includeMetadata: true,
        includeStatistics: true,
        includeTimestamps: true,
        ...options,
      });
      message.success(`${sessionsToExport.length} sessions exported as Markdown`);
    } catch (error) {
      console.error('Export failed:', error);
      message.error('Failed to export sessions');
    }
  }, [sessions]);

  // Export multiple sessions as JSON
  const exportMultipleSessionsAsJSON = useCallback((sessionIds: string[]): void => {
    const sessionsToExport = sessions.filter(s => sessionIds.includes(s.id));
    
    if (sessionsToExport.length === 0) {
      message.error('No sessions found to export');
      return;
    }

    try {
      ExportService.exportSessionsAsJSON(sessionsToExport);
      message.success(`${sessionsToExport.length} sessions exported as JSON`);
    } catch (error) {
      console.error('Export failed:', error);
      message.error('Failed to export sessions');
    }
  }, [sessions]);

  // Export all sessions as Markdown
  const exportAllSessionsAsMarkdown = useCallback((options: Partial<MarkdownExportOptions> = {}): void => {
    if (sessions.length === 0) {
      message.error('No sessions to export');
      return;
    }

    try {
      ExportService.exportSessionsToFile(sessions, 'all-sessions.md', {
        includeMetadata: true,
        includeStatistics: true,
        includeTimestamps: true,
        ...options,
      });
      message.success(`All ${sessions.length} sessions exported as Markdown`);
    } catch (error) {
      console.error('Export failed:', error);
      message.error('Failed to export sessions');
    }
  }, [sessions]);

  // Export all sessions as JSON
  const exportAllSessionsAsJSON = useCallback((): void => {
    if (sessions.length === 0) {
      message.error('No sessions to export');
      return;
    }

    try {
      ExportService.exportSessionsAsJSON(sessions);
      message.success(`All ${sessions.length} sessions exported as JSON`);
    } catch (error) {
      console.error('Export failed:', error);
      message.error('Failed to export sessions');
    }
  }, [sessions]);

  // Search sessions
  const searchSessions = useCallback((query: string): ChatSession[] => {
    if (!query.trim()) return sessions;

    const lowercaseQuery = query.toLowerCase();
    return sessions.filter(session =>
      session.title.toLowerCase().includes(lowercaseQuery) ||
      session.modelId.toLowerCase().includes(lowercaseQuery) ||
      session.messages.some(msg => 
        msg.content.toLowerCase().includes(lowercaseQuery)
      )
    );
  }, [sessions]);

  // Get sessions by date range
  const getSessionsByDateRange = useCallback((startDate: Date, endDate: Date): ChatSession[] => {
    const start = startDate.getTime();
    const end = endDate.getTime();
    
    return sessions.filter(session => 
      session.createdAt >= start && session.createdAt <= end
    );
  }, [sessions]);

  // Get sessions by model
  const getSessionsByModel = useCallback((modelId: string): ChatSession[] => {
    return sessions.filter(session => session.modelId === modelId);
  }, [sessions]);

  // Get recent sessions
  const getRecentSessions = useCallback((limit: number = 10): ChatSession[] => {
    return storeGetRecentSessions(limit);
  }, [storeGetRecentSessions]);

  // Get session statistics
  const getSessionStats = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return null;

    const messages = session.messages;
    const responseMessages = messages.filter(m => m.role === 'assistant');
    const responseTimes = responseMessages
      .map(m => m.responseTime)
      .filter((time): time is number => typeof time === 'number');

    return {
      messageCount: messages.length,
      totalTokens: session.totalTokens || 0,
      totalCost: session.totalCost || 0,
      averageResponseTime: responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0,
      createdAt: session.createdAt,
      lastActivity: session.updatedAt,
    };
  }, [sessions]);

  // Get total statistics
  const getTotalStats = useCallback(() => {
    const totalMessages = sessions.reduce((sum, s) => sum + s.messages.length, 0);
    const totalTokens = sessions.reduce((sum, s) => sum + (s.totalTokens || 0), 0);
    const totalCost = sessions.reduce((sum, s) => sum + (s.totalCost || 0), 0);
    
    // Find most used model
    const modelUsage = sessions.reduce((acc, session) => {
      if (session.modelId) {
        acc[session.modelId] = (acc[session.modelId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const mostUsedModel = Object.entries(modelUsage)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null;

    return {
      totalSessions: sessions.length,
      totalMessages,
      totalTokens,
      totalCost,
      averageSessionLength: sessions.length > 0 ? totalMessages / sessions.length : 0,
      mostUsedModel,
    };
  }, [sessions]);

  return {
    // Session operations
    createNewSession,
    duplicateSession: duplicateSessionCallback,
    deleteSessionWithConfirm,
    renameSession,
    
    // Export operations
    exportSessionAsMarkdown,
    exportSessionAsJSON,
    exportMultipleSessionsAsMarkdown,
    exportMultipleSessionsAsJSON,
    exportAllSessionsAsMarkdown,
    exportAllSessionsAsJSON,
    
    // Session organization
    searchSessions,
    getSessionsByDateRange,
    getSessionsByModel,
    getRecentSessions,
    
    // Session statistics
    getSessionStats,
    getTotalStats,
  };
};

export default useSessionManagement;