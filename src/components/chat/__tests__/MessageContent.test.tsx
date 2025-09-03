/**
 * MessageContent Component Tests
 * Tests for syntax highlighting and code block functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MessageContent from '../MessageContent';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

describe('MessageContent', () => {
  it('renders plain text content', () => {
    const content = 'This is a simple message';
    render(<MessageContent content={content} />);
    
    expect(screen.getByText(content)).toBeInTheDocument();
  });

  it('renders inline code', () => {
    const content = 'Here is some `inline code` in the message';
    render(<MessageContent content={content} />);
    
    const codeElement = screen.getByText('inline code');
    expect(codeElement).toBeInTheDocument();
    expect(codeElement).toHaveClass('inline-code');
  });

  it('renders code blocks with syntax highlighting', () => {
    const content = `Here is a code block:

\`\`\`javascript
function hello() {
  console.log('Hello, world!');
}
\`\`\`

End of message.`;

    render(<MessageContent content={content} />);
    
    // Check for code block container
    expect(document.querySelector('.code-block-container')).toBeInTheDocument();
    
    // Check for language label
    expect(screen.getByText('javascript')).toBeInTheDocument();
    
    // Check for copy button
    expect(screen.getByRole('button')).toBeInTheDocument();
    
    // Check for code content (syntax highlighter splits text into spans)
    expect(screen.getByText('function')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('handles copy code functionality', async () => {
    const content = `\`\`\`python
print("Hello, world!")
\`\`\``;

    render(<MessageContent content={content} />);
    
    const copyButton = screen.getByRole('button');
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('print("Hello, world!")');
    });
  });

  it('shows streaming cursor when streaming', () => {
    const content = 'This is streaming content';
    render(<MessageContent content={content} isStreaming={true} />);
    
    expect(document.querySelector('.streaming-cursor')).toBeInTheDocument();
  });

  it('handles multiple code blocks', () => {
    const content = `First block:

\`\`\`javascript
console.log('first');
\`\`\`

Second block:

\`\`\`python
print('second')
\`\`\``;

    render(<MessageContent content={content} />);
    
    const codeBlocks = document.querySelectorAll('.code-block-container');
    expect(codeBlocks).toHaveLength(2);
    
    expect(screen.getByText('javascript')).toBeInTheDocument();
    expect(screen.getByText('python')).toBeInTheDocument();
  });

  it('handles code blocks without language specification', () => {
    const content = `\`\`\`
some code without language
\`\`\``;

    render(<MessageContent content={content} />);
    
    expect(screen.getByText('text')).toBeInTheDocument();
    expect(screen.getByText('some code without language')).toBeInTheDocument();
  });

  it('preserves line breaks in content', () => {
    const content = `Line 1
Line 2
Line 3`;

    render(<MessageContent content={content} />);
    
    const contentLines = document.querySelectorAll('.content-line');
    expect(contentLines).toHaveLength(3);
  });
});