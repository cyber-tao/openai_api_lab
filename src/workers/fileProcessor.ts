/**
 * File Processing Web Worker
 * Handles file processing in a separate thread to avoid blocking the main UI
 */

import type { FileAttachment, FileProcessingResult, FileType } from '../types/file';
import { SUPPORTED_FILE_FORMATS } from '../types/file';

// Import libraries for file processing
// Note: These will be loaded dynamically to avoid bundling issues
declare const self: Worker;

interface ProcessFileMessage {
  type: 'PROCESS_FILE';
  payload: {
    file: File;
    id: string;
  };
}

interface ProcessFileResponse {
  type: 'FILE_PROCESSED';
  payload: {
    id: string;
    result: FileProcessingResult;
    attachment?: Partial<FileAttachment>;
  };
}

type WorkerMessage = ProcessFileMessage;
type WorkerResponse = ProcessFileResponse;

// File type detection
function detectFileType(mimeType: string, fileName: string): FileType {
  if (mimeType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.json')) {
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
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
    return 'document';
  }
  return 'unknown';
}

// Validate file against supported formats
function validateFile(file: File): { valid: boolean; error?: string; format?: any } {
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

// Process text files
async function processTextFile(file: File): Promise<FileProcessingResult> {
  const startTime = Date.now();
  
  try {
    const content = await file.text();
    
    return {
      success: true,
      content,
      metadata: {
        encoding: 'utf-8',
      },
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to read text file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      processingTime: Date.now() - startTime,
    };
  }
}

// Process image files
async function processImageFile(file: File): Promise<FileProcessingResult> {
  const startTime = Date.now();
  
  try {
    // Create data URL for image display
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    
    // Get image dimensions
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = reject;
      img.src = dataUrl;
    });
    
    return {
      success: true,
      content: dataUrl,
      metadata: {
        width: dimensions.width,
        height: dimensions.height,
      },
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      processingTime: Date.now() - startTime,
    };
  }
}

// Process PDF files
async function processPDFFile(file: File): Promise<FileProcessingResult> {
  const startTime = Date.now();
  
  try {
    // Load pdf-parse dynamically
    const pdfParse = await import('pdf-parse');
    
    const arrayBuffer = await file.arrayBuffer();
    const data = await pdfParse.default(Buffer.from(arrayBuffer));
    
    return {
      success: true,
      content: data.text,
      metadata: {
        pageCount: data.numpages,
      },
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      processingTime: Date.now() - startTime,
    };
  }
}

// Process Word documents
async function processWordFile(file: File): Promise<FileProcessingResult> {
  const startTime = Date.now();
  
  try {
    // Load mammoth dynamically
    const mammoth = await import('mammoth');
    
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    return {
      success: true,
      content: result.value,
      metadata: {},
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to process Word document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      processingTime: Date.now() - startTime,
    };
  }
}

// Process audio files (basic metadata extraction)
async function processAudioFile(file: File): Promise<FileProcessingResult> {
  const startTime = Date.now();
  
  try {
    // For audio files, we mainly extract metadata
    // Content processing would require audio-to-text services
    
    return {
      success: true,
      content: `[Audio file: ${file.name}]`,
      metadata: {
        duration: 0, // Would need audio context to get actual duration
      },
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to process audio file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      processingTime: Date.now() - startTime,
    };
  }
}

// Main file processing function
async function processFile(file: File, id: string): Promise<{ result: FileProcessingResult; attachment?: Partial<FileAttachment> }> {
  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    return {
      result: {
        success: false,
        error: validation.error!,
        processingTime: 0,
      },
    };
  }
  
  const fileType = detectFileType(file.type, file.name);
  let result: FileProcessingResult;
  
  // Process based on file type
  switch (validation.format!.processor) {
    case 'text':
      result = await processTextFile(file);
      break;
    case 'image':
      result = await processImageFile(file);
      break;
    case 'pdf':
      result = await processPDFFile(file);
      break;
    case 'docx':
      result = await processWordFile(file);
      break;
    case 'audio':
      result = await processAudioFile(file);
      break;
    default:
      result = {
        success: false,
        error: `Unsupported processor: ${validation.format!.processor}`,
        processingTime: 0,
      };
  }
  
  // Create attachment object
  const attachment: Partial<FileAttachment> = {
    id,
    name: file.name,
    type: file.type,
    fileType,
    size: file.size,
    content: result.success ? result.content : undefined,
    dataUrl: fileType === 'image' && result.success ? result.content : undefined,
    metadata: result.metadata,
    processingStatus: result.success ? 'completed' : 'error',
    error: result.error,
    createdAt: Date.now(),
  };
  
  return { result, attachment };
}

// Worker message handler
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;
  
  if (type === 'PROCESS_FILE') {
    try {
      const { result, attachment } = await processFile(payload.file, payload.id);
      
      const response: WorkerResponse = {
        type: 'FILE_PROCESSED',
        payload: {
          id: payload.id,
          result,
          attachment,
        },
      };
      
      self.postMessage(response);
    } catch (error) {
      const response: WorkerResponse = {
        type: 'FILE_PROCESSED',
        payload: {
          id: payload.id,
          result: {
            success: false,
            error: `Worker error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            processingTime: 0,
          },
        },
      };
      
      self.postMessage(response);
    }
  }
};

// Export for TypeScript
export {};