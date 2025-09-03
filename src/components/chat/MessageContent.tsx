/**
 * Message Content Component
 * Renders message content with markdown support, code highlighting, and streaming
 */

import React, { useState, useMemo } from 'react';
import { Typography, Button, Tooltip } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import './MessageContent.css';

const { Text } = Typography;

interface MessageContentProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

interface CodeBlock {
  language: string;
  code: string;
  startIndex: number;
  endIndex: number;
}

export const MessageContent: React.FC<MessageContentProps> = ({
  content,
  isStreaming = false,
  className,
}) => {
  const [copiedBlocks, setCopiedBlocks] = useState<Set<number>>(new Set());

  // Parse code blocks from content
  const parseCodeBlocks = useMemo(() => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks: CodeBlock[] = [];
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim(),
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    return blocks;
  }, [content]);

  // Parse inline code
  const parseInlineCode = (text: string) => {
    const inlineCodeRegex = /`([^`]+)`/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = inlineCodeRegex.exec(text)) !== null) {
      // Add text before the code
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      // Add the inline code
      parts.push(
        <code key={match.index} className="inline-code">
          {match[1]}
        </code>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 1 ? parts : text;
  };

  // Handle copy code block
  const handleCopyCode = async (code: string, blockIndex: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedBlocks(prev => new Set(prev).add(blockIndex));
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedBlocks(prev => {
          const newSet = new Set(prev);
          newSet.delete(blockIndex);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  // Render code block with syntax highlighting
  const renderCodeBlock = (block: CodeBlock, index: number) => {
    const isCopied = copiedBlocks.has(index);

    return (
      <div key={index} className="code-block-container">
        <div className="code-block-header">
          <Text type="secondary" className="code-language">
            {block.language}
          </Text>
          <Tooltip title={isCopied ? 'Copied!' : 'Copy code'}>
            <Button
              type="text"
              size="small"
              icon={isCopied ? <CheckOutlined /> : <CopyOutlined />}
              onClick={() => handleCopyCode(block.code, index)}
              className={`copy-button ${isCopied ? 'copied' : ''}`}
            />
          </Tooltip>
        </div>
        <pre className="code-block">
          <code className={`language-${block.language}`}>
            {block.code}
          </code>
        </pre>
      </div>
    );
  };

  // Split content into text and code blocks
  const renderContent = () => {
    if (parseCodeBlocks.length === 0) {
      // No code blocks, just render text with inline code parsing
      const lines = content.split('\n');
      return lines.map((line, index) => (
        <div key={index} className="content-line">
          {parseInlineCode(line)}
          {index < lines.length - 1 && <br />}
        </div>
      ));
    }

    // Render content with code blocks
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    parseCodeBlocks.forEach((block, blockIndex) => {
      // Add text before the code block
      if (block.startIndex > lastIndex) {
        const textContent = content.slice(lastIndex, block.startIndex);
        const lines = textContent.split('\n');
        lines.forEach((line, lineIndex) => {
          if (line.trim() || lineIndex === 0) {
            elements.push(
              <div key={`text-${lastIndex}-${lineIndex}`} className="content-line">
                {parseInlineCode(line)}
                {lineIndex < lines.length - 1 && <br />}
              </div>
            );
          }
        });
      }

      // Add the code block
      elements.push(renderCodeBlock(block, blockIndex));

      lastIndex = block.endIndex;
    });

    // Add remaining text after the last code block
    if (lastIndex < content.length) {
      const textContent = content.slice(lastIndex);
      const lines = textContent.split('\n');
      lines.forEach((line, lineIndex) => {
        if (line.trim() || lineIndex === 0) {
          elements.push(
            <div key={`text-${lastIndex}-${lineIndex}`} className="content-line">
              {parseInlineCode(line)}
              {lineIndex < lines.length - 1 && <br />}
            </div>
          );
        }
      });
    }

    return elements;
  };

  return (
    <div className={`message-content ${isStreaming ? 'streaming' : ''} ${className || ''}`}>
      <div className="content-body">
        {renderContent()}
        {isStreaming && (
          <span className="streaming-cursor" aria-label="AI is typing">
            ▋
          </span>
        )}
      </div>
    </div>
  );
};

export default MessageContent;