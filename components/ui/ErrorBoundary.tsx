'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message || 'Unknown error' };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[perplex/ErrorBoundary${this.props.label ? `:${this.props.label}` : ''}]`, error, info.componentStack);
  }

  handleRetry(): void {
    this.setState({ hasError: false, errorMessage: '' });
    if (this.props.onRetry) this.props.onRetry();
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="card-surface flex flex-col items-center justify-center gap-3 p-8 text-center">
          <AlertTriangle size={28} className="text-warning" aria-hidden />
          <div>
            <p className="text-[14px] font-semibold text-textPrimary">
              {this.props.label ? `${this.props.label} failed to load` : 'Something went wrong'}
            </p>
            <p className="mt-1 text-[12px] text-textMuted">{this.state.errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[12px] font-semibold text-white transition-opacity duration-150 hover:opacity-90"
          >
            <RotateCcw size={13} aria-hidden /> Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
