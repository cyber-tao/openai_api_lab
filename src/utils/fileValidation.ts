/**
 * File Validation Utilities
 * Provides comprehensive file validation and security checks
 */

import type { FileType } from '../types/file';
import { SUPPORTED_FILE_FORMATS } from '../types/file';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
  fileType?: FileType;
  format?: any;
  securityRisk?: boolean;
}

export interface FileValidationOptions {
  maxFileSize?: number;
  allowedTypes?: string[];
  strictMimeTypeCheck?: boolean;
  checkFileSignature?: boolean;
  maxFilenameLength?: number;
}

/**
 * Comprehensive file validation
 */
export function validateFile(file: File, options: FileValidationOptions = {}): FileValidationResult {
  const warnings: string[] = [];
  let securityRisk = false;

  // Basic file existence check
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Filename validation
  const maxFilenameLength = options.maxFilenameLength || 255;
  if (file.name.length > maxFilenameLength) {
    return { valid: false, error: `Filename too long (max ${maxFilenameLength} characters)` };
  }

  // Check for suspicious filename patterns
  const suspiciousPatterns = [
    /\.(exe|bat|cmd|scr|pif|com|vbs|js|jar|app|deb|rpm)$/i,
    /\.\w+\.(exe|bat|cmd|scr|pif|com|vbs|js)$/i, // Double extensions
    /[<>:"|?*]/,
    /^\./,
    /\s+$/,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(file.name)) {
      securityRisk = true;
      warnings.push('Filename contains suspicious patterns');
      break;
    }
  }

  // Get file extension and MIME type
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  const mimeType = file.type;

  // Find matching format
  const format = SUPPORTED_FILE_FORMATS.find(f => 
    f.extension === extension || f.mimeType === mimeType
  );

  if (!format) {
    return { 
      valid: false, 
      error: `Unsupported file format: ${extension}`,
      securityRisk 
    };
  }

  // Check if file type is in allowed types (if specified)
  if (options.allowedTypes && options.allowedTypes.length > 0) {
    const isAllowed = options.allowedTypes.some(type => 
      type === extension || type === mimeType || type === format.processor
    );
    
    if (!isAllowed) {
      return { 
        valid: false, 
        error: `File type not allowed: ${extension}`,
        securityRisk 
      };
    }
  }

  // File size validation
  const maxSize = options.maxFileSize || format.maxSize;
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return { 
      valid: false, 
      error: `File size exceeds limit of ${maxSizeMB}MB`,
      securityRisk 
    };
  }

  // Empty file check
  if (file.size === 0) {
    return { valid: false, error: 'File is empty', securityRisk };
  }

  // MIME type validation
  if (options.strictMimeTypeCheck && mimeType !== format.mimeType) {
    warnings.push(`MIME type mismatch: expected ${format.mimeType}, got ${mimeType}`);
  }

  // Detect file type
  const fileType = detectFileType(mimeType, file.name);

  // Additional security checks for specific file types
  if (fileType === 'image') {
    // Check for suspicious image files
    if (file.size > 50 * 1024 * 1024) { // 50MB for images is suspicious
      warnings.push('Unusually large image file');
      securityRisk = true;
    }
  }

  if (fileType === 'document') {
    // Check for macro-enabled documents
    if (file.name.match(/\.(docm|xlsm|pptm)$/i)) {
      warnings.push('Macro-enabled document detected');
      securityRisk = true;
    }
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    fileType,
    format,
    securityRisk,
  };
}

/**
 * Validate multiple files
 */
export function validateFiles(files: File[], options: FileValidationOptions = {}): FileValidationResult[] {
  return files.map(file => validateFile(file, options));
}

/**
 * Check if all files are valid
 */
export function areAllFilesValid(files: File[], options: FileValidationOptions = {}): boolean {
  return validateFiles(files, options).every(result => result.valid);
}

/**
 * Get validation summary for multiple files
 */
export function getValidationSummary(files: File[], options: FileValidationOptions = {}) {
  const results = validateFiles(files, options);
  
  return {
    totalFiles: files.length,
    validFiles: results.filter(r => r.valid).length,
    invalidFiles: results.filter(r => !r.valid).length,
    filesWithWarnings: results.filter(r => r.warnings && r.warnings.length > 0).length,
    securityRisks: results.filter(r => r.securityRisk).length,
    errors: results.filter(r => !r.valid).map(r => r.error).filter(Boolean),
    warnings: results.flatMap(r => r.warnings || []),
  };
}

/**
 * Detect file type from MIME type and filename
 */
export function detectFileType(mimeType: string, fileName: string): FileType {
  if (mimeType.startsWith('text/') || fileName.match(/\.(txt|md|json|csv|xml|html|css|js|ts)$/i)) {
    return 'text';
  }
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType.startsWith('audio/')) {
    return 'audio';
  }
  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return 'document';
  }
  if (mimeType.includes('word') || fileName.match(/\.(doc|docx)$/i)) {
    return 'document';
  }
  if (mimeType.includes('spreadsheet') || fileName.match(/\.(xls|xlsx)$/i)) {
    return 'document';
  }
  if (mimeType.includes('presentation') || fileName.match(/\.(ppt|pptx)$/i)) {
    return 'document';
  }
  return 'unknown';
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? '.' + parts.pop()!.toLowerCase() : '';
}

/**
 * Check if file signature matches expected type (basic check)
 */
export async function checkFileSignature(file: File): Promise<boolean> {
  try {
    const buffer = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Common file signatures
    const signatures: Record<string, number[][]> = {
      'image/jpeg': [[0xFF, 0xD8, 0xFF]],
      'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
      'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
      'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
      'application/zip': [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06], [0x50, 0x4B, 0x07, 0x08]],
    };

    const expectedSignatures = signatures[file.type];
    if (!expectedSignatures) {
      return true; // No signature check available
    }

    return expectedSignatures.some(signature =>
      signature.every((byte, index) => bytes[index] === byte)
    );
  } catch (error) {
    console.warn('File signature check failed:', error);
    return true; // Assume valid if check fails
  }
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"|?*]/g, '_') // Replace invalid characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .substring(0, 255); // Limit length
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get human-readable file type description
 */
export function getFileTypeDescription(fileType: FileType): string {
  switch (fileType) {
    case 'text':
      return 'Text Document';
    case 'image':
      return 'Image File';
    case 'audio':
      return 'Audio File';
    case 'document':
      return 'Document';
    default:
      return 'Unknown File Type';
  }
}

/**
 * Check if file is likely to be safe for processing
 */
export function isFileSafeForProcessing(file: File): boolean {
  const validation = validateFile(file, { strictMimeTypeCheck: true });
  return validation.valid && !validation.securityRisk;
}

/**
 * Get recommended file size limit based on file type
 */
export function getRecommendedSizeLimit(fileType: FileType): number {
  switch (fileType) {
    case 'text':
      return 10 * 1024 * 1024; // 10MB
    case 'image':
      return 20 * 1024 * 1024; // 20MB
    case 'audio':
      return 100 * 1024 * 1024; // 100MB
    case 'document':
      return 50 * 1024 * 1024; // 50MB
    default:
      return 10 * 1024 * 1024; // 10MB
  }
}