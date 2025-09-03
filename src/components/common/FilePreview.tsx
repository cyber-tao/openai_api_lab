/**
 * File Preview Component
 * Displays file content in various formats with syntax highlighting and formatting
 */

import React, { useState, useMemo } from 'react';
import { Modal, Typography, Image, Card, Space, Tag, Button, Tooltip, Divider } from 'antd';
import { 
  EyeOutlined, 
  CopyOutlined, 
  DownloadOutlined, 
  FileTextOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  SoundOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import type { FileAttachment } from '../../types/file';
import { formatFileSize, getFileTypeDescription } from '../../utils/fileValidation';
import './FilePreview.css';

const { Text, Title } = Typography;

interface FilePreviewProps {
  file: FileAttachment;
  visible: boolean;
  onClose: () => void;
  maxContentLength?: number;
}

const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  visible,
  onClose,
  maxContentLength = 10000,
}) => {
  const [imageError, setImageError] = useState(false);

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'text':
        return <FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />;
      case 'image':
        return <FileImageOutlined style={{ fontSize: 24, color: '#52c41a' }} />;
      case 'document':
        if (file.type === 'application/pdf') {
          return <FilePdfOutlined style={{ fontSize: 24, color: '#f5222d' }} />;
        }
        return <FileWordOutlined style={{ fontSize: 24, color: '#1890ff' }} />;
      case 'audio':
        return <SoundOutlined style={{ fontSize: 24, color: '#fa8c16' }} />;
      default:
        return <FileTextOutlined style={{ fontSize: 24, color: '#8c8c8c' }} />;
    }
  };

  const handleCopyContent = async () => {
    if (file.content) {
      try {
        await navigator.clipboard.writeText(file.content);
        // Could show a success message here
      } catch (error) {
        console.error('Failed to copy content:', error);
      }
    }
  };

  const handleDownloadContent = () => {
    if (file.content) {
      const blob = new Blob([file.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name}_content.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const truncatedContent = useMemo(() => {
    if (!file.content) return '';
    
    if (file.content.length <= maxContentLength) {
      return file.content;
    }
    
    return file.content.substring(0, maxContentLength) + '\n\n... (content truncated)';
  }, [file.content, maxContentLength]);

  const renderFileMetadata = () => (
    <Card size="small" className="file-metadata">
      <Space direction="vertical" style={{ width: '100%' }}>
        <div className="metadata-row">
          <Text strong>File Name:</Text>
          <Text>{file.name}</Text>
        </div>
        
        <div className="metadata-row">
          <Text strong>File Type:</Text>
          <Space>
            <Tag color="blue">{getFileTypeDescription(file.fileType)}</Tag>
            <Text type="secondary">{file.type}</Text>
          </Space>
        </div>
        
        <div className="metadata-row">
          <Text strong>File Size:</Text>
          <Text>{formatFileSize(file.size)}</Text>
        </div>
        
        {file.metadata?.width && file.metadata?.height && (
          <div className="metadata-row">
            <Text strong>Dimensions:</Text>
            <Text>{file.metadata.width} × {file.metadata.height} pixels</Text>
          </div>
        )}
        
        {file.metadata?.pageCount && (
          <div className="metadata-row">
            <Text strong>Pages:</Text>
            <Text>{file.metadata.pageCount}</Text>
          </div>
        )}
        
        {file.metadata?.duration && (
          <div className="metadata-row">
            <Text strong>Duration:</Text>
            <Text>{Math.round(file.metadata.duration)} seconds</Text>
          </div>
        )}
        
        {file.metadata?.encoding && (
          <div className="metadata-row">
            <Text strong>Encoding:</Text>
            <Text>{file.metadata.encoding}</Text>
          </div>
        )}
        
        <div className="metadata-row">
          <Text strong>Processed:</Text>
          <Text>{new Date(file.createdAt).toLocaleString()}</Text>
        </div>
      </Space>
    </Card>
  );

  const renderImagePreview = () => {
    if (file.fileType !== 'image' || !file.dataUrl || imageError) {
      return (
        <div className="preview-placeholder">
          <FileImageOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
          <Text type="secondary">Image preview not available</Text>
        </div>
      );
    }

    return (
      <div className="image-preview">
        <Image
          src={file.dataUrl}
          alt={file.name}
          style={{ maxWidth: '100%', maxHeight: '400px' }}
          onError={() => setImageError(true)}
          preview={{
            mask: <EyeOutlined />,
          }}
        />
      </div>
    );
  };

  const renderTextPreview = () => {
    if (!file.content) {
      return (
        <div className="preview-placeholder">
          <FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
          <Text type="secondary">No text content available</Text>
        </div>
      );
    }

    return (
      <div className="text-preview">
        <div className="text-preview-header">
          <Space>
            <Text strong>Content Preview</Text>
            {file.content.length > maxContentLength && (
              <Tooltip title={`Showing first ${maxContentLength} characters of ${file.content.length} total`}>
                <InfoCircleOutlined style={{ color: '#1890ff' }} />
              </Tooltip>
            )}
          </Space>
          
          <Space>
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={handleCopyContent}
              size="small"
            >
              Copy
            </Button>
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={handleDownloadContent}
              size="small"
            >
              Download
            </Button>
          </Space>
        </div>
        
        <div className="text-content">
          <pre>{truncatedContent}</pre>
        </div>
      </div>
    );
  };

  const renderAudioPreview = () => {
    return (
      <div className="preview-placeholder">
        <SoundOutlined style={{ fontSize: 48, color: '#fa8c16' }} />
        <Text type="secondary">Audio file - content extraction not supported</Text>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          Audio files can be attached to messages but content cannot be previewed
        </Text>
      </div>
    );
  };

  const renderDocumentPreview = () => {
    if (file.content) {
      return renderTextPreview();
    }

    return (
      <div className="preview-placeholder">
        {file.type === 'application/pdf' ? (
          <FilePdfOutlined style={{ fontSize: 48, color: '#f5222d' }} />
        ) : (
          <FileWordOutlined style={{ fontSize: 48, color: '#1890ff' }} />
        )}
        <Text type="secondary">Document processed but content not available</Text>
      </div>
    );
  };

  const renderPreviewContent = () => {
    switch (file.fileType) {
      case 'image':
        return renderImagePreview();
      case 'text':
        return renderTextPreview();
      case 'audio':
        return renderAudioPreview();
      case 'document':
        return renderDocumentPreview();
      default:
        return (
          <div className="preview-placeholder">
            <FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
            <Text type="secondary">Preview not available for this file type</Text>
          </div>
        );
    }
  };

  return (
    <Modal
      title={
        <Space>
          {getFileIcon(file.fileType)}
          <span>File Preview</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      className="file-preview-modal"
    >
      <div className="file-preview-container">
        {/* File Metadata */}
        {renderFileMetadata()}
        
        <Divider />
        
        {/* File Content Preview */}
        <div className="file-content-preview">
          <Title level={5}>Preview</Title>
          {renderPreviewContent()}
        </div>
        
        {/* Processing Status */}
        {file.processingStatus === 'error' && file.error && (
          <>
            <Divider />
            <Card size="small" className="error-info">
              <Text type="danger" strong>Processing Error:</Text>
              <br />
              <Text type="danger">{file.error}</Text>
            </Card>
          </>
        )}
      </div>
    </Modal>
  );
};

export default FilePreview;