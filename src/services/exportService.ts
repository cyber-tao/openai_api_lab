/**
 * Export Service
 * Handles data export functionality including Markdown generation
 */

import type { ChatSession } from '../types/chat';
import type { MarkdownExportOptions, ExportData } from '../types/export';

export class ExportService {
  /**
   * Export a single chat session to Markdown format
   */
  static exportSessionToMarkdown(
    session: ChatSession, 
    options: Partial<MarkdownExportOptions> = {}
  ): string {
    const opts: MarkdownExportOptions = {
      includeMetadata: true,
      includeStatistics: true,
      groupBySession: false,
      includeTimestamps: true,
      ...options,
    };

    const lines: string[] = [];

    // Session title
    lines.push(`# ${session.title}`);
    lines.push('');

    // Metadata section
    if (opts.includeMetadata) {
      lines.push('## Session Information');
      lines.push('');
      lines.push(`**Session ID:** ${session.id}`);
      lines.push(`**Model:** ${session.modelId || 'Not specified'}`);
      lines.push(`**API Config:** ${session.apiConfigId || 'Not specified'}`);
      lines.push(`**Created:** ${new Date(session.createdAt).toLocaleString()}`);
      lines.push(`**Last Updated:** ${new Date(session.updatedAt).toLocaleString()}`);
      lines.push(`**Total Messages:** ${session.messages.length}`);
      lines.push('');
    }

    // Statistics section
    if (opts.includeStatistics && (session.totalTokens > 0 || session.totalCost > 0)) {
      lines.push('## Session Statistics');
      lines.push('');
      if (session.totalTokens > 0) {
        lines.push(`**Total Tokens:** ${session.totalTokens.toLocaleString()}`);
      }
      if (session.totalCost > 0) {
        lines.push(`**Total Cost:** $${session.totalCost.toFixed(6)}`);
      }
      lines.push('');
    }

    // Messages section
    if (session.messages.length > 0) {
      lines.push('## Conversation');
      lines.push('');

      session.messages.forEach((message, index) => {
        // Message header
        const roleTitle = message.role.charAt(0).toUpperCase() + message.role.slice(1);
        lines.push(`### ${roleTitle} ${index + 1}`);
        
        if (opts.includeTimestamps) {
          lines.push(`*${new Date(message.timestamp).toLocaleString()}*`);
        }
        lines.push('');

        // Message content
        lines.push(message.content);
        lines.push('');

        // Attachments
        if (message.attachments && message.attachments.length > 0) {
          lines.push('**Attachments:**');
          message.attachments.forEach(attachment => {
            lines.push(`- ${attachment.name} (${attachment.type}, ${this.formatFileSize(attachment.size)})`);
          });
          lines.push('');
        }

        // Message statistics
        if (opts.includeStatistics && (message.tokens || message.cost || message.responseTime)) {
          lines.push('**Message Statistics:**');
          if (message.tokens) {
            lines.push(`- Tokens: ${message.tokens.total} (${message.tokens.input} input, ${message.tokens.output} output)`);
          }
          if (message.cost) {
            lines.push(`- Cost: $${message.cost.toFixed(6)}`);
          }
          if (message.responseTime) {
            lines.push(`- Response Time: ${message.responseTime}ms`);
          }
          lines.push('');
        }

        // Separator between messages
        if (index < session.messages.length - 1) {
          lines.push('---');
          lines.push('');
        }
      });
    } else {
      lines.push('*No messages in this session*');
      lines.push('');
    }

    // Footer
    lines.push('---');
    lines.push(`*Exported from OpenAI API Lab on ${new Date().toLocaleString()}*`);

    return lines.join('\n');
  }

  /**
   * Export multiple sessions to Markdown format
   */
  static exportSessionsToMarkdown(
    sessions: ChatSession[],
    options: Partial<MarkdownExportOptions> = {}
  ): string {
    const opts: MarkdownExportOptions = {
      includeMetadata: true,
      includeStatistics: true,
      groupBySession: true,
      includeTimestamps: true,
      ...options,
    };

    const lines: string[] = [];

    // Document title
    lines.push('# Chat Sessions Export');
    lines.push('');
    lines.push(`Exported ${sessions.length} session${sessions.length !== 1 ? 's' : ''} on ${new Date().toLocaleString()}`);
    lines.push('');

    // Overall statistics
    if (opts.includeStatistics) {
      const totalMessages = sessions.reduce((sum, s) => sum + s.messages.length, 0);
      const totalTokens = sessions.reduce((sum, s) => sum + (s.totalTokens || 0), 0);
      const totalCost = sessions.reduce((sum, s) => sum + (s.totalCost || 0), 0);

      lines.push('## Overall Statistics');
      lines.push('');
      lines.push(`**Total Sessions:** ${sessions.length}`);
      lines.push(`**Total Messages:** ${totalMessages.toLocaleString()}`);
      if (totalTokens > 0) {
        lines.push(`**Total Tokens:** ${totalTokens.toLocaleString()}`);
      }
      if (totalCost > 0) {
        lines.push(`**Total Cost:** $${totalCost.toFixed(6)}`);
      }
      lines.push('');
    }

    // Table of contents
    if (sessions.length > 1) {
      lines.push('## Table of Contents');
      lines.push('');
      sessions.forEach((session, index) => {
        const anchor = session.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
        lines.push(`${index + 1}. [${session.title}](#${anchor})`);
      });
      lines.push('');
    }

    // Individual sessions
    sessions.forEach((session, index) => {
      if (index > 0) {
        lines.push('\\pagebreak');
        lines.push('');
      }

      const sessionMarkdown = this.exportSessionToMarkdown(session, {
        ...opts,
        groupBySession: false, // Avoid nested grouping
      });

      lines.push(sessionMarkdown);
      lines.push('');
    });

    return lines.join('\n');
  }

  /**
   * Download content as a file
   */
  static downloadAsFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Export session to Markdown file
   */
  static exportSessionToFile(
    session: ChatSession,
    options: Partial<MarkdownExportOptions> = {}
  ): void {
    const markdown = this.exportSessionToMarkdown(session, options);
    const filename = this.sanitizeFilename(`${session.title}.md`);
    this.downloadAsFile(markdown, filename, 'text/markdown');
  }

  /**
   * Export multiple sessions to Markdown file
   */
  static exportSessionsToFile(
    sessions: ChatSession[],
    filename: string = 'chat-sessions.md',
    options: Partial<MarkdownExportOptions> = {}
  ): void {
    const markdown = this.exportSessionsToMarkdown(sessions, options);
    const sanitizedFilename = this.sanitizeFilename(filename);
    this.downloadAsFile(markdown, sanitizedFilename, 'text/markdown');
  }

  /**
   * Export session data as JSON
   */
  static exportSessionAsJSON(session: ChatSession): void {
    const data = {
      version: '1.0',
      exportedAt: Date.now(),
      exportType: 'session' as const,
      session,
    };

    const json = JSON.stringify(data, null, 2);
    const filename = this.sanitizeFilename(`${session.title}.json`);
    this.downloadAsFile(json, filename, 'application/json');
  }

  /**
   * Export multiple sessions as JSON
   */
  static exportSessionsAsJSON(sessions: ChatSession[]): void {
    const data: ExportData = {
      version: '1.0',
      exportedAt: Date.now(),
      exportType: 'sessions',
      sessions,
      metadata: {
        appVersion: '1.0.0',
        totalSessions: sessions.length,
        totalMessages: sessions.reduce((sum, s) => sum + s.messages.length, 0),
        fileSize: 0, // Will be calculated after JSON.stringify
        dateRange: sessions.length > 0 ? {
          start: Math.min(...sessions.map(s => s.createdAt)),
          end: Math.max(...sessions.map(s => s.updatedAt)),
        } : undefined,
      },
    };

    const json = JSON.stringify(data, null, 2);
    if (data.metadata) {
      data.metadata.fileSize = new Blob([json]).size;
    }

    this.downloadAsFile(json, 'chat-sessions.json', 'application/json');
  }

  /**
   * Generate a safe filename by removing/replacing invalid characters
   */
  private static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .toLowerCase();
  }

  /**
   * Format file size in human-readable format
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  /**
   * Create a summary of session statistics
   */
  static generateSessionSummary(sessions: ChatSession[]): string {
    const totalMessages = sessions.reduce((sum, s) => sum + s.messages.length, 0);
    const totalTokens = sessions.reduce((sum, s) => sum + (s.totalTokens || 0), 0);
    const totalCost = sessions.reduce((sum, s) => sum + (s.totalCost || 0), 0);
    
    const modelUsage = sessions.reduce((acc, session) => {
      if (session.modelId) {
        acc[session.modelId] = (acc[session.modelId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const lines = [
      '# Session Summary',
      '',
      `**Total Sessions:** ${sessions.length}`,
      `**Total Messages:** ${totalMessages.toLocaleString()}`,
    ];

    if (totalTokens > 0) {
      lines.push(`**Total Tokens:** ${totalTokens.toLocaleString()}`);
    }

    if (totalCost > 0) {
      lines.push(`**Total Cost:** $${totalCost.toFixed(6)}`);
    }

    if (Object.keys(modelUsage).length > 0) {
      lines.push('', '**Model Usage:**');
      Object.entries(modelUsage)
        .sort(([,a], [,b]) => b - a)
        .forEach(([model, count]) => {
          lines.push(`- ${model}: ${count} session${count !== 1 ? 's' : ''}`);
        });
    }

    if (sessions.length > 0) {
      const oldestSession = sessions.reduce((oldest, session) => 
        session.createdAt < oldest.createdAt ? session : oldest
      );
      const newestSession = sessions.reduce((newest, session) => 
        session.updatedAt > newest.updatedAt ? session : newest
      );

      lines.push('', '**Date Range:**');
      lines.push(`- First Session: ${new Date(oldestSession.createdAt).toLocaleString()}`);
      lines.push(`- Last Activity: ${new Date(newestSession.updatedAt).toLocaleString()}`);
    }

    return lines.join('\n');
  }
}

export default ExportService;