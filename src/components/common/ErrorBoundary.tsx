/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Result, Button, Typography, Card, Space, Alert } from 'antd';
import { BugOutlined, ReloadOutlined, HomeOutlined } from '@ant-design/icons';

const { Paragraph, Text } = Typography;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Log error to external service if needed
    // logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleClearStorage = () => {
    try {
      // Clear localStorage to reset application state
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('openai-lab-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Reload the page
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ padding: '50px', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
          <Card style={{ maxWidth: 800, margin: '0 auto' }}>
            <Result
              status="error"
              icon={<BugOutlined />}
              title="Something went wrong"
              subTitle="An unexpected error occurred. This might be due to corrupted data or a bug in the application."
              extra={
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Space wrap>
                    <Button type="primary" icon={<ReloadOutlined />} onClick={this.handleReload}>
                      Reload Page
                    </Button>
                    <Button icon={<HomeOutlined />} onClick={this.handleGoHome}>
                      Go Home
                    </Button>
                    <Button danger onClick={this.handleClearStorage}>
                      Clear Data & Reload
                    </Button>
                  </Space>
                  
                  {this.state.error && (
                    <Alert
                      message="Error Details"
                      description={
                        <div>
                          <Paragraph>
                            <Text strong>Error:</Text> {this.state.error.message}
                          </Paragraph>
                          {this.state.error.stack && (
                            <details>
                              <summary>Stack Trace</summary>
                              <pre style={{ 
                                fontSize: '12px', 
                                backgroundColor: '#f5f5f5', 
                                padding: '10px',
                                overflow: 'auto',
                                maxHeight: '200px'
                              }}>
                                {this.state.error.stack}
                              </pre>
                            </details>
                          )}
                        </div>
                      }
                      type="error"
                      showIcon
                      style={{ textAlign: 'left' }}
                    />
                  )}
                </Space>
              }
            />
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;