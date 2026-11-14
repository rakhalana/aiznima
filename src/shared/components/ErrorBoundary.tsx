import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { logger } from '@/shared/utils/logger';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Unexpected rendering error.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('React ErrorBoundary caught crash', {
      message: error.message,
      componentStack: info.componentStack,
    });
  }

  private handleReload = (): void => {
    this.setState({ hasError: false, message: '' });
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] p-6 text-[var(--text-primary)]">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 text-center shadow-token-sm">
            <h1 className="text-lg font-bold">Something went wrong</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {this.state.message}
            </p>
            <Button
              variant="primary"
              onClick={this.handleReload}
              leftIcon={<RefreshCw className="h-4 w-4" strokeWidth={1.75} />}
              className="mt-5"
            >
              Reload App
            </Button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
