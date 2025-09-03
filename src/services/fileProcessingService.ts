/**
 * File Processing Service
 * Manages file processing using Web Workers
 */

import type { FileAttachment, FileProcessingResult } from '../types/file';
import { SUPPORTED_FILE_FORMATS } from '../types/file';

interface ProcessingJob {
  id: string;
  file: File;
  resolve: (result: { result: FileProcessingResult; attachment?: Partial<FileAttachment> }) => void;
  reject: (error: Error) => void;
}

class FileProcessingService {
  private worker: Worker | null = null;
  private processingJobs = new Map<string, ProcessingJob>();
  private isInitialized = false;

  /**
   * Initialize the file processing service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create worker from the TypeScript file
      // Vite will handle the worker compilation
      this.worker = new Worker(new URL('../workers/fileProcessor.ts', import.meta.url), {
        type: 'module',
      });

      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize file processing worker:', error);
      throw new Error('Failed to initialize file processing service');
    }
  }

  /**
   * Process a file
   */
  async processFile(file: File): Promise<{ result: FileProcessingResult; attachment?: Partial<FileAttachment> }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.worker) {
      throw new Error('File processing worker not available');
    }

    const id = this.generateId();

    return new Promise((resolve, reject) => {
      const job: ProcessingJob = {
        id,
        file,
        resolve,
        reject,
      };

      this.processingJobs.set(id, job);

      // Send file to worker
      this.worker!.postMessage({
        type: 'PROCESS_FILE',
        payload: {
          file,
          id,
        },
      });

      // Set timeout for processing
      setTimeout(() => {
        if (this.processingJobs.has(id)) {
          this.processingJobs.delete(id);
          reject(new Error('File processing timeout'));
        }
      }, 30000); // 30 second timeout
    });
  }

  /**
   * Process multiple files
   */
  async processFiles(files: File[]): Promise<Array<{ result: FileProcessingResult; attachment?: Partial<FileAttachment> }>> {
    const promises = files.map(file => this.processFile(file));
    return Promise.all(promises);
  }

  /**
   * Validate file before processing
   */
  validateFile(file: File): { valid: boolean; error?: string; format?: any } {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const format = SUPPORTED_FILE_FORMATS.find(f => f.extension === extension || f.mimeType === file.type);

    if (!format) {
      return { valid: false, error: `Unsupported file format: ${extension}` };
    }

    if (file.size > format.maxSize) {
      const maxSizeMB = Math.round(format.maxSize / (1024 * 1024));
      return { valid: false, error: `File size exceeds limit of ${maxSizeMB}MB` };
    }

    return { valid: true, format };
  }

  /**
   * Get supported file formats
   */
  getSupportedFormats() {
    return SUPPORTED_FILE_FORMATS;
  }

  /**
   * Check if file type is supported
   */
  isFileSupported(file: File): boolean {
    return this.validateFile(file).valid;
  }

  /**
   * Get file size limit for a specific file
   */
  getFileSizeLimit(file: File): number | null {
    const validation = this.validateFile(file);
    return validation.valid ? validation.format.maxSize : null;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Reject all pending jobs
    this.processingJobs.forEach(job => {
      job.reject(new Error('Service destroyed'));
    });
    this.processingJobs.clear();

    this.isInitialized = false;
  }

  private handleWorkerMessage(event: MessageEvent): void {
    const { type, payload } = event.data;

    if (type === 'FILE_PROCESSED') {
      const job = this.processingJobs.get(payload.id);
      if (job) {
        this.processingJobs.delete(payload.id);
        job.resolve({
          result: payload.result,
          attachment: payload.attachment,
        });
      }
    }
  }

  private handleWorkerError(error: ErrorEvent): void {
    console.error('File processing worker error:', error);

    // Reject all pending jobs
    this.processingJobs.forEach(job => {
      job.reject(new Error(`Worker error: ${error.message}`));
    });
    this.processingJobs.clear();
  }

  private generateId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create singleton instance
export const fileProcessingService = new FileProcessingService();

// Auto-initialize on first import
fileProcessingService.initialize().catch(console.error);

export default fileProcessingService;