/**
 * File Attachment Types
 * Defines interfaces for file handling and multimodal content
 */

export type FileType = 'text' | 'image' | 'audio' | 'document' | 'unknown';

export interface FileAttachment {
  id: string;
  name: string;
  type: string; // MIME type
  fileType: FileType;
  size: number;
  content?: string; // Extracted text content
  dataUrl?: string; // Base64 data URL for images
  metadata?: FileMetadata;
  processingStatus: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  createdAt: number;
}

export interface FileMetadata {
  width?: number;
  height?: number;
  duration?: number; // For audio/video files
  pageCount?: number; // For documents
  encoding?: string;
  language?: string;
}

export interface FileProcessingResult {
  success: boolean;
  content?: string;
  metadata?: FileMetadata;
  error?: string;
  processingTime: number;
}

export interface SupportedFileFormat {
  extension: string;
  mimeType: string;
  maxSize: number; // in bytes
  description: string;
  processor: 'text' | 'image' | 'pdf' | 'docx' | 'audio';
}

// Supported file formats configuration
export const SUPPORTED_FILE_FORMATS: SupportedFileFormat[] = [
  // Text files
  { extension: '.txt', mimeType: 'text/plain', maxSize: 10 * 1024 * 1024, description: 'Text file', processor: 'text' },
  { extension: '.md', mimeType: 'text/markdown', maxSize: 10 * 1024 * 1024, description: 'Markdown file', processor: 'text' },
  { extension: '.json', mimeType: 'application/json', maxSize: 10 * 1024 * 1024, description: 'JSON file', processor: 'text' },
  
  // Document files
  { extension: '.pdf', mimeType: 'application/pdf', maxSize: 50 * 1024 * 1024, description: 'PDF document', processor: 'pdf' },
  { extension: '.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', maxSize: 50 * 1024 * 1024, description: 'Word document', processor: 'docx' },
  
  // Image files
  { extension: '.png', mimeType: 'image/png', maxSize: 20 * 1024 * 1024, description: 'PNG image', processor: 'image' },
  { extension: '.jpg', mimeType: 'image/jpeg', maxSize: 20 * 1024 * 1024, description: 'JPEG image', processor: 'image' },
  { extension: '.jpeg', mimeType: 'image/jpeg', maxSize: 20 * 1024 * 1024, description: 'JPEG image', processor: 'image' },
  { extension: '.gif', mimeType: 'image/gif', maxSize: 20 * 1024 * 1024, description: 'GIF image', processor: 'image' },
  { extension: '.webp', mimeType: 'image/webp', maxSize: 20 * 1024 * 1024, description: 'WebP image', processor: 'image' },
  
  // Audio files
  { extension: '.mp3', mimeType: 'audio/mpeg', maxSize: 100 * 1024 * 1024, description: 'MP3 audio', processor: 'audio' },
  { extension: '.wav', mimeType: 'audio/wav', maxSize: 100 * 1024 * 1024, description: 'WAV audio', processor: 'audio' },
  { extension: '.m4a', mimeType: 'audio/mp4', maxSize: 100 * 1024 * 1024, description: 'M4A audio', processor: 'audio' },
];