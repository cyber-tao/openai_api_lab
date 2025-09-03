# Type Definitions Documentation

This directory contains all TypeScript type definitions for the OpenAI API Lab application. The types are organized by functionality and provide comprehensive coverage for all application features.

## File Structure

### Core Types
- **`api.ts`** - API configuration and response types
- **`model.ts`** - Model information, pricing, and capabilities
- **`chat.ts`** - Chat sessions, messages, and statistics
- **`file.ts`** - File attachments and multimodal content support

### Data Management
- **`export.ts`** - Data export/import functionality
- **`storage.ts`** - Storage keys, validation, and management
- **`validation.ts`** - Validation schemas for data integrity

### Application
- **`settings.ts`** - User preferences and app configuration
- **`testing.ts`** - Performance testing and benchmarking

### Utilities
- **`type-guards.ts`** - Runtime type checking and validation
- **`index.ts`** - Central export point for all types

## Requirements Coverage

### ✅ Requirement 1.1 - API Configuration Types
- `APIConfig` interface with all required fields
- `APIParameters` for advanced configuration options
- `APIResponse` and `APIError` for handling responses
- `ConnectionTestResult` for connection testing

### ✅ Requirement 4.1 - Storage and Settings
- `AppSettings` interface with comprehensive preferences
- `STORAGE_KEYS` constants for localStorage management
- `StorageInfo` and `StorageItem` for storage management
- Default settings and keyboard shortcuts

### ✅ Requirement 6.3 - Model Pricing and Cost Calculation
- `ModelPrice` and `CostCalculation` interfaces
- `TokenUsage` for tracking token consumption
- Default pricing for common models
- Price management and validation

### ✅ Additional Features Covered
- **File Handling**: Complete support for multimodal files (images, documents, audio)
- **Chat Management**: Session and message management with statistics
- **Performance Testing**: Comprehensive testing and benchmarking types
- **Data Export/Import**: Full backup and restore functionality
- **Validation**: Runtime type checking and data integrity validation

## Key Features

### Type Safety
- Comprehensive TypeScript interfaces for all data structures
- Runtime type guards for validation
- Strict typing for better development experience

### Data Integrity
- Validation schemas for all major data types
- Sanitization functions for safe data handling
- Migration support for data version management

### Extensibility
- Modular type organization for easy extension
- Generic types for reusable patterns
- Event system for application-wide communication

### File Support
- Support for text files (TXT, MD, JSON)
- Document processing (PDF, DOCX)
- Image handling (PNG, JPEG, GIF, WebP)
- Audio file support (MP3, WAV, M4A)

## Usage Examples

### Creating an API Configuration
```typescript
import { APIConfig, generateId } from './types';

const config: APIConfig = {
  id: generateId(),
  name: 'OpenAI GPT-4',
  endpoint: 'https://api.openai.com/v1',
  apiKey: 'sk-...',
  parameters: {
    temperature: 0.7,
    maxTokens: 1000,
  },
  isDefault: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
```

### Type-Safe Data Validation
```typescript
import { isAPIConfig, validateArray } from './types';

const configs = loadConfigsFromStorage();
const { valid, invalid } = validateArray(configs, isAPIConfig);

if (invalid.length > 0) {
  console.warn('Found invalid configurations:', invalid);
}
```

### File Processing
```typescript
import { FileAttachment, SUPPORTED_FILE_FORMATS } from './types';

const attachment: FileAttachment = {
  id: generateId(),
  name: 'document.pdf',
  type: 'application/pdf',
  fileType: 'document',
  size: 1024 * 1024, // 1MB
  processingStatus: 'pending',
  createdAt: Date.now(),
};
```

## Testing

The types include comprehensive test coverage in `__tests__/types.test.ts` to ensure:
- All interfaces work correctly
- Type guards function properly
- Default values are valid
- Validation functions work as expected

## Constants and Configuration

### Storage Keys
All localStorage keys are centralized in `STORAGE_KEYS` constant to prevent conflicts and ensure consistency.

### File Format Support
`SUPPORTED_FILE_FORMATS` array defines all supported file types with their specifications, size limits, and processing methods.

### Default Values
Default configurations are provided for settings, keyboard shortcuts, and model pricing to ensure the application works out of the box.

## Migration and Versioning

The type system includes support for data migration through:
- Version tracking in all major data structures
- Migration interfaces for handling data format changes
- Validation and sanitization for safe upgrades

This comprehensive type system ensures type safety, data integrity, and extensibility throughout the OpenAI API Lab application.