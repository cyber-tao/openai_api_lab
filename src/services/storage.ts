/**
 * Storage Service
 * Handles localStorage operations with validation, migration, and quota management
 */

import {
    STORAGE_KEYS,
    DATA_VERSION,
    STORAGE_LIMITS,
} from '../types/storage';
import type {
    StorageKey,
    StorageInfo,
    StorageMigration,
    ValidationSchema,
    ValidationResult,
    ValidationError,
} from '../types/storage';

class StorageService {
    private migrations: StorageMigration[] = [];
    private listeners: Map<StorageKey, Set<(data: any) => void>> = new Map();

    /**
     * Initialize storage service and run migrations if needed
     */
    async initialize(): Promise<void> {
        try {
            await this.runMigrations();
            this.setupStorageListener();
        } catch (error) {
            console.error('Failed to initialize storage service:', error);
            throw error;
        }
    }

    /**
     * Get data from localStorage with validation
     */
    get<T = any>(key: StorageKey, schema?: ValidationSchema): T | null {
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;

            const parsed = JSON.parse(item);

            // Validate data if schema provided
            if (schema) {
                const validation = this.validateData(parsed, schema);
                if (!validation.valid) {
                    console.warn(`Invalid data for key ${key}:`, validation.errors);
                    return null;
                }
            }

            return parsed;
        } catch (error) {
            console.error(`Failed to get data for key ${key}:`, error);
            return null;
        }
    }

    /**
     * Set data to localStorage with validation
     */
    set<T = any>(key: StorageKey, data: T, schema?: ValidationSchema): boolean {
        try {
            // Basic data validation
            if (data === undefined) {
                console.warn(`Attempting to save undefined data for key ${key}`);
                return false;
            }

            // Validate data if schema provided
            if (schema) {
                try {
                    const validation = this.validateData(data, schema);
                    if (!validation.valid) {
                        console.error(`Invalid data for key ${key}:`, validation.errors);
                        // Don't return false immediately, try to save anyway for recovery
                        console.warn('Attempting to save invalid data for recovery purposes');
                    }
                } catch (validationError) {
                    console.error(`Validation error for key ${key}:`, validationError);
                    // Continue with save attempt
                }
            }

            // Serialize data with error handling
            let serialized: string;
            try {
                serialized = JSON.stringify(data);
            } catch (serializationError) {
                console.error(`Failed to serialize data for key ${key}:`, serializationError);
                return false;
            }

            // Check storage quota before saving
            const size = new Blob([serialized]).size;

            if (!this.checkStorageQuota(size)) {
                console.warn('Storage quota exceeded, attempting cleanup');
                try {
                    this.cleanup();
                } catch (cleanupError) {
                    console.error('Cleanup failed:', cleanupError);
                }

                // Check again after cleanup
                if (!this.checkStorageQuota(size)) {
                    console.error('Storage quota exceeded even after cleanup');
                    return false;
                }
            }

            // Save to localStorage
            localStorage.setItem(key, serialized);

            // Notify listeners with error handling
            try {
                this.notifyListeners(key, data);
            } catch (notificationError) {
                console.error('Failed to notify listeners:', notificationError);
                // Don't fail the save operation for notification errors
            }

            return true;
        } catch (error) {
            console.error(`Failed to set data for key ${key}:`, error);
            return false;
        }
    }

    /**
     * Remove data from localStorage
     */
    remove(key: StorageKey): boolean {
        try {
            localStorage.removeItem(key);
            this.notifyListeners(key, null);
            return true;
        } catch (error) {
            console.error(`Failed to remove data for key ${key}:`, error);
            return false;
        }
    }

    /**
     * Clear all application data
     */
    clear(): boolean {
        try {
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
                this.notifyListeners(key, null);
            });
            return true;
        } catch (error) {
            console.error('Failed to clear storage:', error);
            return false;
        }
    }

    /**
     * Get storage usage information
     */
    getStorageInfo(): StorageInfo {
        let used = 0;

        // Calculate used storage
        Object.values(STORAGE_KEYS).forEach(key => {
            const item = localStorage.getItem(key);
            if (item) {
                used += new Blob([item]).size;
            }
        });

        const total = STORAGE_LIMITS.MAX_TOTAL_SIZE;
        const available = Math.max(0, total - used);
        const percentage = (used / total) * 100;

        return {
            used,
            available,
            total,
            percentage,
        };
    }

    /**
     * Check if storage quota allows for additional data
     */
    checkStorageQuota(additionalSize: number = 0): boolean {
        const info = this.getStorageInfo();
        const newUsed = info.used + additionalSize;
        const newPercentage = (newUsed / info.total) * 100;

        return newPercentage < STORAGE_LIMITS.CLEANUP_THRESHOLD * 100;
    }

    /**
     * Clean up old or unnecessary data
     */
    cleanup(): void {
        try {
            const info = this.getStorageInfo();

            if (info.percentage < STORAGE_LIMITS.CLEANUP_THRESHOLD * 100) {
                return; // No cleanup needed
            }

            // Clean up file cache first (most expendable)
            this.remove(STORAGE_KEYS.FILE_CACHE);

            // Clean up old performance test results
            const tests = this.get(STORAGE_KEYS.PERFORMANCE_TESTS);
            if (tests && Array.isArray(tests)) {
                // Keep only the last 10 test results
                const cleaned = tests.slice(-10);
                this.set(STORAGE_KEYS.PERFORMANCE_TESTS, cleaned);
            }

            // Clean up old chat sessions (keep last 50)
            const sessions = this.get(STORAGE_KEYS.CHAT_SESSIONS);
            if (sessions && Array.isArray(sessions)) {
                const sorted = sessions.sort((a, b) => b.updatedAt - a.updatedAt);
                const cleaned = sorted.slice(0, 50);
                this.set(STORAGE_KEYS.CHAT_SESSIONS, cleaned);
            }

            console.log('Storage cleanup completed');
        } catch (error) {
            console.error('Failed to cleanup storage:', error);
        }
    }

    /**
     * Validate data against schema
     */
    validateData(data: any, schema: ValidationSchema): ValidationResult {
        const errors: ValidationError[] = [];

        const validate = (value: any, schema: ValidationSchema, path: string = ''): void => {
            // Type validation
            if (schema.type && typeof value !== schema.type) {
                if (!(schema.type === 'array' && Array.isArray(value))) {
                    errors.push({
                        path,
                        message: `Expected ${schema.type}, got ${typeof value}`,
                        value,
                    });
                    return;
                }
            }

            // Required fields validation
            if (schema.required && schema.type === 'object') {
                schema.required.forEach(field => {
                    if (!(field in value)) {
                        errors.push({
                            path: path ? `${path}.${field}` : field,
                            message: `Required field missing`,
                        });
                    }
                });
            }

            // String validations
            if (schema.type === 'string' && typeof value === 'string') {
                if (schema.minLength && value.length < schema.minLength) {
                    errors.push({
                        path,
                        message: `String too short (min: ${schema.minLength})`,
                        value,
                    });
                }
                if (schema.maxLength && value.length > schema.maxLength) {
                    errors.push({
                        path,
                        message: `String too long (max: ${schema.maxLength})`,
                        value,
                    });
                }
                if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
                    errors.push({
                        path,
                        message: `String does not match pattern`,
                        value,
                    });
                }
            }

            // Object properties validation
            if (schema.type === 'object' && schema.properties && typeof value === 'object') {
                Object.entries(schema.properties).forEach(([key, propSchema]) => {
                    if (key in value) {
                        validate(value[key], propSchema, path ? `${path}.${key}` : key);
                    }
                });
            }

            // Array items validation
            if (schema.type === 'array' && schema.items && Array.isArray(value)) {
                value.forEach((item, index) => {
                    validate(item, schema.items!, path ? `${path}[${index}]` : `[${index}]`);
                });
            }
        };

        validate(data, schema);

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * Add storage migration
     */
    addMigration(migration: StorageMigration): void {
        this.migrations.push(migration);
        this.migrations.sort((a, b) => a.fromVersion.localeCompare(b.fromVersion));
    }

    /**
     * Run storage migrations
     */
    private async runMigrations(): Promise<void> {
        const currentVersion = this.get(STORAGE_KEYS.APP_SETTINGS)?.version || '0.0.0';

        if (currentVersion === DATA_VERSION) {
            return; // No migration needed
        }

        console.log(`Migrating data from version ${currentVersion} to ${DATA_VERSION}`);

        for (const migration of this.migrations) {
            if (this.shouldRunMigration(currentVersion, migration)) {
                try {
                    await this.runSingleMigration(migration);
                    console.log(`Migration completed: ${migration.description}`);
                } catch (error) {
                    console.error(`Migration failed: ${migration.description}`, error);
                    throw error;
                }
            }
        }

        // Update version
        const settings = this.get(STORAGE_KEYS.APP_SETTINGS) || {};
        settings.version = DATA_VERSION;
        settings.lastUpdated = Date.now();
        this.set(STORAGE_KEYS.APP_SETTINGS, settings);
    }

    /**
     * Check if migration should run
     */
    private shouldRunMigration(currentVersion: string, migration: StorageMigration): boolean {
        return currentVersion === migration.fromVersion;
    }

    /**
     * Run single migration
     */
    private async runSingleMigration(migration: StorageMigration): Promise<void> {
        // Migrate each storage key that exists
        Object.values(STORAGE_KEYS).forEach(key => {
            const data = this.get(key);
            if (data) {
                const migrated = migration.migrate(data);
                this.set(key, migrated);
            }
        });
    }

    /**
     * Subscribe to storage changes
     */
    subscribe(key: StorageKey, callback: (data: any) => void): () => void {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }

        this.listeners.get(key)!.add(callback);

        // Return unsubscribe function
        return () => {
            const listeners = this.listeners.get(key);
            if (listeners) {
                listeners.delete(callback);
                if (listeners.size === 0) {
                    this.listeners.delete(key);
                }
            }
        };
    }

    /**
     * Notify listeners of storage changes
     */
    private notifyListeners(key: StorageKey, data: any): void {
        const listeners = this.listeners.get(key);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Storage listener error:', error);
                }
            });
        }
    }

    /**
     * Setup storage event listener for cross-tab synchronization
     */
    private setupStorageListener(): void {
        window.addEventListener('storage', (event) => {
            if (event.key && Object.values(STORAGE_KEYS).includes(event.key as StorageKey)) {
                const data = event.newValue ? JSON.parse(event.newValue) : null;
                this.notifyListeners(event.key as StorageKey, data);
            }
        });
    }

    /**
     * Export all data
     */
    exportAll(): Record<string, any> {
        const exported: Record<string, any> = {};

        Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
            const data = this.get(key);
            if (data) {
                exported[name] = data;
            }
        });

        return {
            version: DATA_VERSION,
            exportedAt: Date.now(),
            data: exported,
        };
    }

    /**
     * Import data with validation
     */
    importAll(data: Record<string, any>): boolean {
        try {
            if (!data.data || typeof data.data !== 'object') {
                throw new Error('Invalid import data format');
            }

            // Validate version compatibility
            if (data.version && data.version !== DATA_VERSION) {
                console.warn(`Version mismatch: ${data.version} vs ${DATA_VERSION}`);
            }

            // Import each key
            Object.entries(data.data).forEach(([name, value]) => {
                const key = STORAGE_KEYS[name as keyof typeof STORAGE_KEYS];
                if (key) {
                    this.set(key, value);
                }
            });

            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }
}

// Create singleton instance
export const storageService = new StorageService();

// Initialize on module load
storageService.initialize().catch(console.error);