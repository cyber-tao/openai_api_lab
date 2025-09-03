/**
 * StatsSummaryCards Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatsSummaryCards } from '../StatsSummaryCards';

describe('StatsSummaryCards', () => {
  const mockProps = {
    totalMessages: 150,
    totalTokens: 25000,
    totalCost: 0.5432,
    totalSessions: 12,
    averageResponseTime: 1250,
    averageTokensPerMessage: 166.67,
    averageCostPerMessage: 0.0036,
  };

  it('renders all summary cards', () => {
    render(<StatsSummaryCards {...mockProps} />);

    expect(screen.getByText('Total Messages')).toBeInTheDocument();
    expect(screen.getByText('Total Sessions')).toBeInTheDocument();
    expect(screen.getByText('Total Tokens')).toBeInTheDocument();
    expect(screen.getByText('Total Cost')).toBeInTheDocument();
    expect(screen.getByText('Avg Response Time')).toBeInTheDocument();
    expect(screen.getByText('Avg Tokens/Message')).toBeInTheDocument();
    expect(screen.getByText('Avg Cost/Message')).toBeInTheDocument();
  });

  it('formats numbers correctly', () => {
    render(<StatsSummaryCards {...mockProps} />);

    // Check formatted values
    expect(screen.getByText('150')).toBeInTheDocument(); // messages
    expect(screen.getByText('25K')).toBeInTheDocument(); // tokens
    expect(screen.getByText('$0.5432')).toBeInTheDocument(); // cost
    expect(screen.getByText('12')).toBeInTheDocument(); // sessions
    expect(screen.getByText('1.3s')).toBeInTheDocument(); // response time
    expect(screen.getByText('167')).toBeInTheDocument(); // tokens per message
    expect(screen.getByText('$0.0036')).toBeInTheDocument(); // cost per message
  });

  it('handles large numbers with K/M formatting', () => {
    const largeProps = {
      ...mockProps,
      totalMessages: 1500000,
      totalTokens: 25000000,
    };

    render(<StatsSummaryCards {...largeProps} />);

    expect(screen.getByText('1.5M')).toBeInTheDocument(); // messages
    expect(screen.getByText('25M')).toBeInTheDocument(); // tokens
  });

  it('handles zero values', () => {
    const zeroProps = {
      totalMessages: 0,
      totalTokens: 0,
      totalCost: 0,
      totalSessions: 0,
      averageResponseTime: 0,
      averageTokensPerMessage: 0,
      averageCostPerMessage: 0,
    };

    render(<StatsSummaryCards {...zeroProps} />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('$0.0000')).toBeInTheDocument();
    expect(screen.getByText('0ms')).toBeInTheDocument();
  });
});