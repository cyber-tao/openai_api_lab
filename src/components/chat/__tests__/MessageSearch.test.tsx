/**
 * MessageSearch Component Tests
 * Tests for message search functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MessageSearch from '../MessageSearch';
import type { ChatMessage } from '../../../types/chat';

// Mock the chat store
const mockMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    content: 'Hello, how are you?',
    timestamp: Date.now() - 1000,
  },
  {
    id: '2',
    role: 'assistant',
    content: 'I am doing well, thank you for asking!',
    timestamp: Date.now() - 500,
  },
  {
    id: '3',
    role: 'user',
    content: 'Can you help me with JavaScript?',
    timestamp: Date.now(),
  },
];

vi.mock('../../../stores/chatStore', () => ({
  useChatStore: () => ({
    messages: mockMessages,
    getActiveSession: () => ({
      id: 'session1',
      title: 'Test Session',
    }),
  }),
}));

describe('MessageSearch', () => {
  const mockOnClose = vi.fn();
  const mockOnMessageSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when visible', () => {
    render(
      <MessageSearch
        visible={true}
        onClose={mockOnClose}
        onMessageSelect={mockOnMessageSelect}
      />
    );
    
    expect(screen.getByText('Search Messages')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search in messages...')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(
      <MessageSearch
        visible={false}
        onClose={mockOnClose}
        onMessageSelect={mockOnMessageSelect}
      />
    );
    
    expect(screen.queryByText('Search Messages')).not.toBeInTheDocument();
  });

  it('searches messages by content', () => {
    render(
      <MessageSearch
        visible={true}
        onClose={mockOnClose}
        onMessageSelect={mockOnMessageSelect}
      />
    );
    
    const searchInput = screen.getByPlaceholderText('Search in messages...');
    fireEvent.change(searchInput, { target: { value: 'JavaScript' } });
    
    expect(screen.getByText('1 result')).toBeInTheDocument();
    expect(screen.getByText(/Can you help me with/)).toBeInTheDocument();
  });

  it('shows no results for non-matching search', () => {
    render(
      <MessageSearch
        visible={true}
        onClose={mockOnClose}
        onMessageSelect={mockOnMessageSelect}
      />
    );
    
    const searchInput = screen.getByPlaceholderText('Search in messages...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    expect(screen.getByText('0 results')).toBeInTheDocument();
    expect(screen.getByText('No messages found')).toBeInTheDocument();
  });

  it('filters by role', () => {
    render(
      <MessageSearch
        visible={true}
        onClose={mockOnClose}
        onMessageSelect={mockOnMessageSelect}
      />
    );
    
    const searchInput = screen.getByPlaceholderText('Search in messages...');
    fireEvent.change(searchInput, { target: { value: 'you' } });
    
    // Should find messages from both user and assistant
    expect(screen.getByText('2 results')).toBeInTheDocument();
    
    // Filter by user only
    const userButton = screen.getByText('User');
    fireEvent.click(userButton);
    
    expect(screen.getByText('1 result')).toBeInTheDocument();
  });

  it('handles case sensitivity toggle', () => {
    render(
      <MessageSearch
        visible={true}
        onClose={mockOnClose}
        onMessageSelect={mockOnMessageSelect}
      />
    );
    
    const searchInput = screen.getByPlaceholderText('Search in messages...');
    fireEvent.change(searchInput, { target: { value: 'HELLO' } });
    
    // Should find match (case insensitive by default)
    expect(screen.getByText('1 result')).toBeInTheDocument();
    
    // Toggle case sensitivity
    const caseButton = screen.getByText('Aa');
    fireEvent.click(caseButton);
    
    // Should not find match (case sensitive)
    expect(screen.getByText('0 results')).toBeInTheDocument();
  });

  it('calls onMessageSelect when result is clicked', () => {
    render(
      <MessageSearch
        visible={true}
        onClose={mockOnClose}
        onMessageSelect={mockOnMessageSelect}
      />
    );
    
    const searchInput = screen.getByPlaceholderText('Search in messages...');
    fireEvent.change(searchInput, { target: { value: 'JavaScript' } });
    
    const resultItem = screen.getByText(/Can you help me with/);
    fireEvent.click(resultItem.closest('.search-result-item')!);
    
    expect(mockOnMessageSelect).toHaveBeenCalledWith('3');
  });

  it('navigates through results with buttons', () => {
    render(
      <MessageSearch
        visible={true}
        onClose={mockOnClose}
        onMessageSelect={mockOnMessageSelect}
      />
    );
    
    const searchInput = screen.getByPlaceholderText('Search in messages...');
    fireEvent.change(searchInput, { target: { value: 'you' } });
    
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    
    // Navigate to next result
    const nextButton = screen.getByRole('button', { name: /down/i });
    fireEvent.click(nextButton);
    
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(mockOnMessageSelect).toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <MessageSearch
        visible={true}
        onClose={mockOnClose}
        onMessageSelect={mockOnMessageSelect}
      />
    );
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });
});