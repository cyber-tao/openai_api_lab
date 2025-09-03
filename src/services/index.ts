/**
 * Services Index
 * Central export point for all services
 */

// Storage services
export { storageService } from './storage';
export { storageMonitor } from './storageMonitor';
export type { StorageAnalysis, StorageAlert } from './storageMonitor';

// Migration services
export {
  registerMigrations,
  createMigration,
  backupDataBeforeMigration,
  restoreFromBackup,
  listBackups,
  cleanOldBackups,
} from './migrations';

// File processing services
export { fileProcessingService } from './fileProcessingService';

// Export services
export { ExportService } from './exportService';

// Re-export storage types for convenience
export type {
  StorageKey,
  StorageInfo,
  StorageItem,
  StorageMigration,
  ValidationSchema,
  ValidationResult,
  ValidationError,
} from '../types/storage';

// Service initialization utility
export const initializeServices = async (): Promise<void> => {
  try {
    // Import services dynamically to avoid circular dependencies
    const { storageService } = await import('./storage');
    const { registerMigrations } = await import('./migrations');
    const { storageMonitor } = await import('./storageMonitor');
    
    // Initialize storage service
    await storageService.initialize();
    
    // Register migrations
    registerMigrations();
    
    // Start storage monitoring
    storageMonitor.startMonitoring(60000); // Check every minute
    
    console.log('All services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    throw error;
  }
};

// Service cleanup utility
export const cleanupServices = async (): Promise<void> => {
  try {
    // Import services dynamically
    const { storageMonitor } = await import('./storageMonitor');
    
    // Stop storage monitoring
    storageMonitor.stopMonitoring();
    
    console.log('Services cleaned up successfully');
  } catch (error) {
    console.error('Failed to cleanup services:', error);
  }
};