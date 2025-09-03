/**
 * File Upload Demo Component
 * Demonstrates the file upload functionality
 */

import React, { useState } from 'react';
import { Card, Typography, Space, Button, message } from 'antd';
import type { FileAttachment } from '../../types/file';
import FileUpload from './FileUpload';
import FilePreview from './FilePreview';

const { Title, Paragraph } = Typography;

const FileUploadDemo: React.FC = () => {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [previewFile, setPreviewFile] = useState<FileAttachment | null>(null);

  const handleFilesProcessed = (newAttachments: FileAttachment[]) => {
    setAttachments(newAttachments);
    message.success(`${newAttachments.length} files processed successfully`);
  };

  const handleFileRemoved = (fileId: string) => {
    setAttachments(prev => prev.filter(f => f.id !== fileId));
    message.info('File removed');
  };

  const handlePreviewFile = (file: FileAttachment) => {
    setPreviewFile(file);
  };

  const handleClearAll = () => {
    setAttachments([]);
    message.info('All files cleared');
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Card>
        <Title level={3}>File Processing System Demo</Title>
        <Paragraph>
          This demo showcases the file processing system that supports multiple file formats
          including PDF, Word documents, images, and text files. Files are processed using
          Web Workers to avoid blocking the UI.
        </Paragraph>

        <FileUpload
          onFilesProcessed={handleFilesProcessed}
          onFileRemoved={handleFileRemoved}
          maxFiles={5}
          showPreview={true}
        />

        {attachments.length > 0 && (
          <Card style={{ marginTop: '16px' }} title="Processed Files">
            <Space direction="vertical" style={{ width: '100%' }}>
              {attachments.map(file => (
                <div key={file.id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '8px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px'
                }}>
                  <div>
                    <strong>{file.name}</strong>
                    <br />
                    <small>
                      Type: {file.fileType} | Size: {Math.round(file.size / 1024)}KB
                      {file.content && ` | Content: ${file.content.length} chars`}
                    </small>
                  </div>
                  <Button 
                    type="primary" 
                    size="small"
                    onClick={() => handlePreviewFile(file)}
                  >
                    Preview
                  </Button>
                </div>
              ))}
              
              <Button type="default" onClick={handleClearAll} style={{ marginTop: '8px' }}>
                Clear All Files
              </Button>
            </Space>
          </Card>
        )}

        {previewFile && (
          <FilePreview
            file={previewFile}
            visible={!!previewFile}
            onClose={() => setPreviewFile(null)}
          />
        )}
      </Card>
    </div>
  );
};

export default FileUploadDemo;