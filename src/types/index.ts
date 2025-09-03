/**
 * Type Definitions Index
 * Central export point for all type definitions
 */

// API related types
export * from './api';
export * from './model';

// Chat and messaging types
export * from './chat';
export * from './file';

// Data management types
export * from './export';
export * from './storage';
export * from './validation';

// Application types
export * from './settings';
export * from './testing';
export * from './statistics';

// Type guards and utilities
export * from './type-guards';

// Common utility types
export interface BaseEntity {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface SearchOptions {
  query: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface AsyncOperation<T = any> {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  result?: T;
  error?: string;
  startedAt: number;
  completedAt?: number;
}

// Event types for application-wide communication
export interface AppEvent {
  type: string;
  payload?: any;
  timestamp: number;
}

export type EventHandler<T = any> = (event: AppEvent & { payload: T }) => void;

// Theme and UI types
export interface ThemeColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
}

export interface UIState {
  loading: boolean;
  error?: string;
  success?: string;
  modal?: {
    type: string;
    props?: any;
  };
}