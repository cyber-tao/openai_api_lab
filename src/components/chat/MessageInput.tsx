/**
 * Message Input Component
 * Input area for typing messages with file attachment support
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Input, 
  Button, 
  Space, 
  Tooltip, 
  Card, 
  Typography,
  Progress,
  Tag,
  Alert
} from 'antd';
import {
  SendOutlined,
  PaperClipOutlined,
  DeleteOutlined,
  FileOutlined,
  StopOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { useChatStore } from '../../stores/chatStore';
import { fileProcessingService } from '../../services/fileProcessingService';
import { useMessageProcessing } from '../../hooks/useMessageProcessing';
import type { FileAttachment } from '../../types/file';
import './MessageInput.css';

const { TextArea } = Input;
const { Text } = Typography;

interface MessageInputProps {
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

interface PendingFile {
  id: string;
  file: File;
  status: 'processing' | 'completed' | 'error';
  progress: number;
  attachment?: FileAttachment;
  error?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  disabled = false,
  placeholder = "Type your message...",
  className,
}) => {
  const [message, setMessage] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const textAreaRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isStreaming,
    activeSessionId,
    getActiveSession,
  } = useChatStore();

  const {
    state: processingState,
    sendMessage: processSendMessage,
    cancelMessage,
    clearError,
    estimateTokens,
  } = useMessageProcessing();

  // Auto-resize textarea
  useEffect(() => {
    if (textAreaRef.current) {
      const textarea = textAreaRef.current.resizableTextArea?.textArea;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
      }
    }
  }, [message]);

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList) => {
    if (!files || files.length === 0) return;

    const newPendingFiles: PendingFile[] = Array.from(files).map(file => ({
      id: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file,
      status: 'processing',
      progress: 0,
    }));

    setPendingFiles(prev => [...prev, ...newPendingFiles]);

    // Process each file
    for (const pendingFile of newPendingFiles) {
      try {
        // Update progress
        setPendingFiles(prev =>
          prev.map(f =>
            f.id === pendingFile.id ? { ...f, progress: 10 } : f
          )
        );

        // Validate file
        const validation = fileProcessingService.validateFile(pendingFile.file);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        // Update progress
        setPendingFiles(prev =>
          prev.map(f =>
            f.id === pendingFile.id ? { ...f, progress: 30 } : f
          )
        );

        // Process file
        const { result, attachment } = await fileProcessingService.processFile(pendingFile.file);

        if (!result.success) {
          throw new Error(result.error);
        }

        // Create complete attachment
        const completeAttachment: FileAttachment = {
          id: pendingFile.id,
          name: pendingFile.file.name,
          type: pendingFile.file.type,
          fileType: attachment?.fileType || 'unknown',
          size: pendingFile.file.size,
          content: attachment?.content,
          dataUrl: attachment?.dataUrl,
          metadata: attachment?.metadata,
          processingStatus: 'completed',
          createdAt: Date.now(),
        };

        // Update to completed
        setPendingFiles(prev =>
          prev.map(f =>
            f.id === pendingFile.id
              ? { ...f, status: 'completed', progress: 100, attachment: completeAttachment }
              : f
          )
        );

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Processing failed';
        
        setPendingFiles(prev =>
          prev.map(f =>
            f.id === pendingFile.id
              ? { ...f, status: 'error', progress: 0, error: errorMessage }
              : f
          )
        );
      }
    }
  }, []);

  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      handleFileSelect(files);
    }
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  };

  // Handle file removal
  const handleRemoveFile = (fileId: string) => {
    setPendingFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Handle send message
  const handleSendMessage = useCallback(async () => {
    if (!message.trim() && pendingFiles.filter(f => f.status === 'completed').length === 0) {
      return;
    }

    if (!activeSessionId) {
      return;
    }

    // Get completed attachments
    const attachments = pendingFiles
      .filter(f => f.status === 'completed' && f.attachment)
      .map(f => f.attachment!);

    // Send message using the processing service
    const result = await processSendMessage(message.trim(), attachments);

    if (result.success) {
      // Clear input and files on success
      setMessage('');
      setPendingFiles([]);

      // Focus back to textarea
      setTimeout(() => {
        textAreaRef.current?.focus();
      }, 100);
    }
  }, [message, pendingFiles, activeSessionId, processSendMessage]);

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle stop streaming
  const handleStopStreaming = () => {
    cancelMessage();
  };

  // Check if send is disabled
  const isSendDisabled = disabled || 
    processingState.isProcessing ||
    (!message.trim() && pendingFiles.filter(f => f.status === 'completed').length === 0) ||
    pendingFiles.some(f => f.status === 'processing');

  // Render file attachment preview
  const renderFilePreview = (pendingFile: PendingFile) => {
    const { file, status, progress, error } = pendingFile;

    return (
      <Card key={pendingFile.id} size="small" className="file-preview-card">
        <div className="file-preview-content">
          <div className="file-info">
            <FileOutlined />
            <div className="file-details">
              <Text strong style={{ fontSize: 12 }}>
                {file.name}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {fileProcessingService.formatFileSize(file.size)}
              </Text>
            </div>
          </div>

          <div className="file-status">
            {status === 'processing' && (
              <Progress
                percent={progress}
                size="small"
                status="active"
                showInfo={false}
              />
            )}
            
            {status === 'completed' && (
              <Tag color="green">
                Ready
              </Tag>
            )}
            
            {status === 'error' && (
              <Tooltip title={error}>
                <Tag color="red">
                  Error
                </Tag>
              </Tooltip>
            )}
          </div>

          <Button
            type="text"
            icon={<DeleteOutlined />}
            size="small"
            onClick={() => handleRemoveFile(pendingFile.id)}
          />
        </div>
      </Card>
    );
  };

  const activeSession = getActiveSession();
  const hasFiles = pendingFiles.length > 0;
  const estimatedTokens = estimateTokens(message, pendingFiles.filter(f => f.attachment).map(f => f.attachment));

  return (
    <div className={`message-input ${className || ''}`}>
      {/* Processing Status */}
      {processingState.isProcessing && processingState.progress && (
        <div className="processing-status">
          <Alert
            message={
              <Space>
                <LoadingOutlined />
                <span>{processingState.progress.stage}</span>
              </Space>
            }
            description={
              <Progress 
                percent={processingState.progress.progress} 
                size="small" 
                status="active"
                showInfo={false}
              />
            }
            type="info"
            showIcon={false}
            style={{ marginBottom: 8 }}
          />
        </div>
      )}

      {/* Error Display */}
      {processingState.error && (
        <div className="processing-error">
          <Alert
            message="Message Processing Error"
            description={processingState.error}
            type="error"
            showIcon
            closable
            onClose={clearError}
            style={{ marginBottom: 8 }}
          />
        </div>
      )}

      {/* File Attachments Preview */}
      {hasFiles && (
        <div className="file-attachments-preview">
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            {pendingFiles.map(renderFilePreview)}
          </Space>
        </div>
      )}

      {/* Input Area */}
      <div className="input-area">
        <div className="input-controls">
          {/* File Upload Button */}
          <Tooltip title="Attach files">
            <Button
              type="text"
              icon={<PaperClipOutlined />}
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="attach-button"
            />
          </Tooltip>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={fileProcessingService.getSupportedFormats().map(f => f.mimeType).join(',')}
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
        </div>

        {/* Text Input */}
        <div className="text-input-container">
          <TextArea
            ref={textAreaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder={disabled ? placeholder : `${placeholder} (Shift+Enter for new line)`}
            disabled={disabled}
            autoSize={{ minRows: 1, maxRows: 8 }}
            className="message-textarea"
          />
        </div>

        {/* Send/Stop Button */}
        <div className="send-controls">
          {isStreaming || processingState.isProcessing ? (
            <Tooltip title="Stop generating">
              <Button
                type="primary"
                danger
                icon={<StopOutlined />}
                onClick={handleStopStreaming}
                className="stop-button"
              />
            </Tooltip>
          ) : (
            <Tooltip title="Send message (Enter)">
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSendMessage}
                disabled={isSendDisabled}
                className="send-button"
                loading={processingState.isProcessing}
              />
            </Tooltip>
          )}
        </div>
      </div>

      {/* Input Status */}
      <div className="input-status">
        <Space size="small" wrap>
          {activeSession && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              Model: {activeSession.modelId || 'Not configured'}
            </Text>
          )}
          
          {message.length > 0 && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {message.length} characters
            </Text>
          )}

          {estimatedTokens > 0 && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              ~{estimatedTokens} tokens
            </Text>
          )}
          
          {hasFiles && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {pendingFiles.filter(f => f.status === 'completed').length} file(s) ready
            </Text>
          )}

          {processingState.currentTokens && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              Tokens: {processingState.currentTokens.total}
            </Text>
          )}

          {processingState.currentCost && processingState.currentCost > 0 && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              Cost: ${processingState.currentCost.toFixed(6)}
            </Text>
          )}
        </Space>
      </div>
    </div>
  );
};

export default MessageInput;