'use client';

import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ProductErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ProductGrid Error caught:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-warm-surface border border-warm-border rounded-[20px] p-6 text-center space-y-3 my-4 shadow-warm-sm">
          <div className="text-2xl">⚠️</div>
          <h3 className="text-sm font-bold text-warm-fg">
            {this.props.fallbackMessage || 'Unable to display products right now'}
          </h3>
          <p className="text-xs text-warm-muted max-w-sm mx-auto">
            A temporary problem occurred while loading this section.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold bg-[#f0c444] text-[#0B0B0D] rounded-full hover:opacity-90 transition-opacity active:scale-95 shadow-sm"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
