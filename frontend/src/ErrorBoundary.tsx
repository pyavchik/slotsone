import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'Unexpected UI error' };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ui_unhandled_error', { error, componentStack: info.componentStack });
  }

  public render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="ui-error-shell" role="alert" aria-live="assertive">
        <h1>Something went wrong</h1>
        <p>The app crashed while rendering. Reload to continue.</p>
        <code>{this.state.message}</code>
        <button type="button" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}
