/**
 * Test File Processing System
 * Simple test to verify file processing functionality
 */

import { fileProcessingService } from './services/fileProcessingService';
import { validateFile } from './utils/fileValidation';

// Test file validation
function testFileValidation() {
  console.log('Testing file validation...');
  
  // Create a mock file for testing
  const mockTextFile = new File(['Hello, world!'], 'test.txt', { type: 'text/plain' });
  const mockLargeFile = new File([new ArrayBuffer(100 * 1024 * 1024)], 'large.txt', { type: 'text/plain' });
  const mockUnsupportedFile = new File(['test'], 'test.exe', { type: 'application/x-executable' });
  
  // Test valid file
  const validResult = validateFile(mockTextFile);
  console.log('Valid file test:', validResult);
  
  // Test large file
  const largeResult = validateFile(mockLargeFile);
  console.log('Large file test:', largeResult);
  
  // Test unsupported file
  const unsupportedResult = validateFile(mockUnsupportedFile);
  console.log('Unsupported file test:', unsupportedResult);
}

// Test file processing service
async function testFileProcessingService() {
  console.log('Testing file processing service...');
  
  try {
    // Initialize service
    await fileProcessingService.initialize();
    console.log('Service initialized successfully');
    
    // Test supported formats
    const formats = fileProcessingService.getSupportedFormats();
    console.log('Supported formats:', formats.length);
    
    // Create a test text file
    const testFile = new File(['This is a test file content.\nLine 2\nLine 3'], 'test.txt', { type: 'text/plain' });
    
    // Test file validation
    const isSupported = fileProcessingService.isFileSupported(testFile);
    console.log('File is supported:', isSupported);
    
    // Test file processing
    if (isSupported) {
      console.log('Processing file...');
      const result = await fileProcessingService.processFile(testFile);
      console.log('Processing result:', {
        success: result.result.success,
        contentLength: result.attachment?.content?.length,
        processingTime: result.result.processingTime,
        error: result.result.error
      });
    }
    
  } catch (error) {
    console.error('File processing test failed:', error);
  }
}

// Run tests
export async function runFileProcessingTests() {
  console.log('=== File Processing System Tests ===');
  
  testFileValidation();
  await testFileProcessingService();
  
  console.log('=== Tests Complete ===');
}

// Auto-run tests if this file is executed directly
if (typeof window !== 'undefined') {
  runFileProcessingTests().catch(console.error);
}