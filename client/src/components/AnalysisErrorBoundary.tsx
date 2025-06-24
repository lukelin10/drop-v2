/**
 * Analysis Error Boundary
 * 
 * A React error boundary specifically designed for analysis-related components.
 * Provides graceful error handling with:
 * - Analysis-specific error messaging
 * - Recovery actions (retry, reset)
 * - Error reporting and logging
 * - Consistent UI matching the app's design system
 */

import React, { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

export class AnalysisErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Generate a unique error ID for tracking
    const errorId = `analysis_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging
    console.error('Analysis Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
    });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry, LogRocket, etc.
      // sentryService.captureException(error, { extra: errorInfo });
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
    });
  };

  handleReportError = () => {
    const { error, errorId } = this.state;
    
    if (error && errorId) {
      // Create a simple error report
      const errorReport = {
        errorId,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      // Copy to clipboard for easy reporting
      navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
        .then(() => {
          alert('Error details copied to clipboard. Please share this with support.');
        })
        .catch(() => {
          console.log('Error Report:', errorReport);
          alert('Error details logged to console. Please check browser console.');
        });
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <i className="ri-error-warning-line text-2xl text-destructive" />
          </div>
          
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Analysis Error
          </h3>
          
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            Something went wrong while loading your analysis. This error has been logged 
            and our team will investigate.
          </p>

          <div className="space-y-3">
            <Button 
              onClick={this.handleRetry}
              className="min-w-32"
            >
              <i className="ri-refresh-line mr-2" />
              Try Again
            </Button>
            
            <Button 
              variant="outline"
              size="sm"
              onClick={this.handleReportError}
              className="text-muted-foreground"
            >
              <i className="ri-bug-line mr-2" />
              Report Error
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-6 w-full max-w-md">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Error Details (Development)
              </summary>
              <pre className="text-xs bg-muted p-2 rounded mt-2 text-left overflow-auto">
                {this.state.error?.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap components with the analysis error boundary
 */
export function withAnalysisErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const ComponentWithErrorBoundary = (props: P) => (
    <AnalysisErrorBoundary fallback={fallback}>
      <WrappedComponent {...props} />
    </AnalysisErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = 
    `withAnalysisErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return ComponentWithErrorBoundary;
} 