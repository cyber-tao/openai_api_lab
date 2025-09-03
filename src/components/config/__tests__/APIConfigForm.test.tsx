/**
 * API Configuration Form Tests
 * Tests for the API configuration form component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { APIConfigForm } from '../APIConfigForm';
import type { APIConfig } from '../../../types';

// Mock the validation utility
jest.mock('../../../utils/validation', () => ({
  validateAPIConfig: jest.fn(() => ({ valid: true, errors: [] })),
}));

describe('APIConfigForm', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form with basic fields', () => {
    render(
      <APIConfigForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText(/configuration name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/api endpoint/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/api key/i)).toBeInTheDocument();
  });

  it('switches between simple and advanced modes', async () => {
    render(
      <APIConfigForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const advancedButton = screen.getByText(/advanced/i);
    fireEvent.click(advancedButton);

    await waitFor(() => {
      expect(screen.getByText(/advanced parameters/i)).toBeInTheDocument();
    });
  });

  it('populates form with existing config', () => {
    const existingConfig: APIConfig = {
      id: 'test-1',
      name: 'Test Config',
      endpoint: 'https://api.openai.com/v1',
      apiKey: 'sk-test123',
      model: 'gpt-4',
      parameters: {
        temperature: 0.7,
        maxTokens: 1000,
      },
      isDefault: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    render(
      <APIConfigForm
        config={existingConfig}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByDisplayValue('Test Config')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://api.openai.com/v1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('gpt-4')).toBeInTheDocument();
  });

  it('calls onSave with form data when submitted', async () => {
    render(
      <APIConfigForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Fill out the form
    fireEvent.change(screen.getByLabelText(/configuration name/i), {
      target: { value: 'New Config' },
    });
    fireEvent.change(screen.getByLabelText(/api endpoint/i), {
      target: { value: 'https://api.openai.com/v1' },
    });
    fireEvent.change(screen.getByLabelText(/api key/i), {
      target: { value: 'sk-test123' },
    });

    // Submit the form
    fireEvent.click(screen.getByText(/save configuration/i));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Config',
          endpoint: 'https://api.openai.com/v1',
          apiKey: 'sk-test123',
        })
      );
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <APIConfigForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText(/cancel/i));
    expect(mockOnCancel).toHaveBeenCalled();
  });
});