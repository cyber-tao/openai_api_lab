/**
 * File Upload Component
 * Supports drag and drop file upload with validation and preview
 */

import React, { useCallback, useState } from 'react';
import { Upload, Button, message, Progress, Card, Typography, Space, Tag, Tooltip } from 'antd';
import { 
  InboxOutlined, 
  FileOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import type { FileAttachment } from '../../types/file';
import { fileProcessingService } from '../../services/fileProcessingService';
import './FileUpload.css';

const { Dragger } = Upload;
const { Text, Paragraph } = Typography;

interface FileUploadProps {
  onFilesProcessed?: (attachments: FileAttachment[]) => void;
  onFileRemoved?: (fileId: string) => void;
  maxFiles?: number;
  disabled?: boolean;
  showPreview?: boolean;
  className?: string;
}

interface ProcessingFile {
  id: string;
  file: File;
  status: 'validating' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  attachment?: FileAttachment;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesProcessed,
  onFileRemoved,
  maxFiles = 10,
  disabled = false,
  showPreview = true,
  className,
}) => {
  const [processingFiles, setProcessingFiles] = useState<ProcessingFile[]>([]);
  const [completedFiles, setCompletedFiles] = useState<FileAttachment[]>([]);


  const generateFileId = () => `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const validateAndProcessFiles = useCallback(async (files: File[]) => {
    if (disabled) return;

    // Check file count limit
    const totalFiles = completedFiles.length + files.length;
    if (totalFiles > maxFiles) {
      message.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Create processing entries
    const newProcessingFiles: ProcessingFile[] = files.map(file => ({
      id: generateFileId(),
      file,
      status: 'validating',
      progress: 0,
    }));

    setProcessingFiles(prev => [...prev, ...newProcessingFiles]);

    // Process each file
    for (const processingFile of newProcessingFiles) {
      try {
        // Update status to processing
        setProcessingFiles(prev =>
          prev.map(f =>
            f.id === processingFile.id
              ? { ...f, status: 'processing', progress: 10 }
              : f
          )
        );

        // Validate file
        const validation = fileProcessingService.validateFile(processingFile.file);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        // Update progress
        setProcessingFiles(prev =>
          prev.map(f =>
            f.id === processingFile.id
              ? { ...f, progress: 30 }
              : f
          )
        );

        // Process file
        const { result, attachment } = await fileProcessingService.processFile(processingFile.file);

        if (!result.success) {
          throw new Error(result.error);
        }

        // Create complete attachment
        const completeAttachment: FileAttachment = {
          id: processingFile.id,
          name: processingFile.file.name,
          type: processingFile.file.type,
          fileType: attachment?.fileType || 'unknown',
          size: processingFile.file.size,
          content: attachment?.content,
          dataUrl: attachment?.dataUrl,
          metadata: attachment?.metadata,
          processingStatus: 'completed',
          createdAt: Date.now(),
        };

        // Update to completed
        setProcessingFiles(prev =>
          prev.map(f =>
            f.id === processingFile.id
              ? { ...f, status: 'completed', progress: 100, attachment: completeAttachment }
              : f
          )
        );

        // Move to completed files
        setCompletedFiles(prev => [...prev, completeAttachment]);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Processing failed';
        
        setProcessingFiles(prev =>
          prev.map(f =>
            f.id === processingFile.id
              ? { ...f, status: 'error', progress: 0, error: errorMessage }
              : f
          )
        );

        message.error(`Failed to process ${processingFile.file.name}: ${errorMessage}`);
      }
    }

    // Notify parent component
    setTimeout(() => {
      const allCompleted = completedFiles.concat(
        processingFiles
          .filter(f => f.status === 'completed' && f.attachment)
          .map(f => f.attachment!)
      );
      onFilesProcessed?.(allCompleted);
    }, 100);

  }, [completedFiles, disabled, maxFiles, onFilesProcessed, processingFiles]);

  const handleFileSelect = useCallback((info: any) => {
    const { fileList } = info;
    const files = fileList.map((item: any) => item.originFileObj).filter(Boolean);
    
    if (files.length > 0) {
      validateAndProcessFiles(files);
    }

    // Prevent default upload behavior
    return false;
  }, [validateAndProcessFiles]);

  const handleRemoveFile = useCallback((fileId: string) => {
    // Remove from processing files
    setProcessingFiles(prev => prev.filter(f => f.id !== fileId));
    
    // Remove from completed files
    setCompletedFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      return updated;
    });

    onFileRemoved?.(fileId);
  }, [onFileRemoved]);

  const handleClearAll = useCallback(() => {
    setProcessingFiles([]);
    setCompletedFiles([]);
  }, []);

  const renderFileStatus = (file: ProcessingFile) => {
    switch (file.status) {
      case 'validating':
        return <Tag color="blue">Validating</Tag>;
      case 'processing':
        return <Tag color="orange">Processing</Tag>;
      case 'completed':
        return <Tag color="green" icon={<CheckCircleOutlined />}>Completed</Tag>;
      case 'error':
        return <Tag color="red" icon={<ExclamationCircleOutlined />}>Error</Tag>;
      default:
        return null;
    }
  };

  const renderFilePreview = (file: FileAttachment) => {
    if (!showPreview) return null;

    if (file.fileType === 'image' && file.dataUrl) {
      return (
        <div className="file-preview-image">
          <img src={file.dataUrl} alt={file.name} style={{ maxWidth: 100, maxHeight: 100 }} />
        </div>
      );
    }

    if (file.content && file.fileType === 'text') {
      return (
        <div className="file-preview-text">
          <Paragraph ellipsis={{ rows: 3 }}>
            {file.content.substring(0, 200)}...
          </Paragraph>
        </div>
      );
    }

    return null;
  };

  const supportedFormats = fileProcessingService.getSupportedFormats();
  const acceptedTypes = supportedFormats.map(f => f.mimeType).join(',');

  return (
    <div className={`file-upload-container ${className || ''}`}>
      <Dragger
        name="files"
        multiple
        accept={acceptedTypes}
        beforeUpload={() => false}
        onChange={handleFileSelect}
        disabled={disabled}
        className="file-upload-dragger"
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">
          Click or drag files to this area to upload
        </p>
        <p className="ant-upload-hint">
          Support for multiple files. Maximum {maxFiles} files allowed.
          <br />
          Supported formats: PDF, Word, Images, Text files
        </p>
      </Dragger>

      {/* Processing Files */}
      {processingFiles.length > 0 && (
        <div className="processing-files">
          <Typography.Title level={5}>Processing Files</Typography.Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            {processingFiles.map(file => (
              <Card key={file.id} size="small" className="processing-file-card">
                <div className="processing-file-content">
                  <div className="file-info">
                    <FileOutlined />
                    <div className="file-details">
                      <Text strong>{file.file.name}</Text>
                      <Text type="secondary">
                        {fileProcessingService.formatFileSize(file.file.size)}
                      </Text>
                    </div>
                  </div>
                  
                  <div className="file-status">
                    {renderFileStatus(file)}
                    {file.status === 'processing' && (
                      <Progress
                        percent={file.progress}
                        size="small"
                        status="active"
                        showInfo={false}
                      />
                    )}
                    {file.error && (
                      <Tooltip title={file.error}>
                        <Text type="danger" className="error-text">
                          {file.error.length > 50 ? `${file.error.substring(0, 50)}...` : file.error}
                        </Text>
                      </Tooltip>
                    )}
                  </div>

                  <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveFile(file.id)}
                    size="small"
                  />
                </div>
              </Card>
            ))}
          </Space>
        </div>
      )}

      {/* Completed Files */}
      {completedFiles.length > 0 && (
        <div className="completed-files">
          <div className="completed-files-header">
            <Typography.Title level={5}>Uploaded Files ({completedFiles.length})</Typography.Title>
            <Button type="link" onClick={handleClearAll} size="small">
              Clear All
            </Button>
          </div>
          
          <Space direction="vertical" style={{ width: '100%' }}>
            {completedFiles.map(file => (
              <Card key={file.id} size="small" className="completed-file-card">
                <div className="completed-file-content">
                  <div className="file-info">
                    <FileOutlined />
                    <div className="file-details">
                      <Text strong>{file.name}</Text>
                      <div className="file-meta">
                        <Text type="secondary">
                          {fileProcessingService.formatFileSize(file.size)}
                        </Text>
                        <Tag color="blue">{file.fileType}</Tag>
                        {file.metadata?.pageCount && (
                          <Text type="secondary">
                            {file.metadata.pageCount} pages
                          </Text>
                        )}
                        {file.metadata?.width && file.metadata?.height && (
                          <Text type="secondary">
                            {file.metadata.width}×{file.metadata.height}
                          </Text>
                        )}
                      </div>
                    </div>
                  </div>

                  {renderFilePreview(file)}

                  <div className="file-actions">
                    {file.content && (
                      <Tooltip title="Preview content">
                        <Button
                          type="text"
                          icon={<EyeOutlined />}
                          size="small"
                          onClick={() => {
                            // Could open a modal with full content preview
                            console.log('Preview file:', file);
                          }}
                        />
                      </Tooltip>
                    )}
                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveFile(file.id)}
                      size="small"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </Space>
        </div>
      )}

      {/* Supported Formats Info */}
      <div className="supported-formats">
        <Typography.Title level={5}>Supported Formats</Typography.Title>
        <Space wrap>
          {supportedFormats.map(format => (
            <Tooltip key={format.extension} title={`${format.description} (max ${fileProcessingService.formatFileSize(format.maxSize)})`}>
              <Tag>{format.extension.toUpperCase()}</Tag>
            </Tooltip>
          ))}
        </Space>
      </div>
    </div>
  );
};

export default FileUpload;