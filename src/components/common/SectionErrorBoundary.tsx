import { Component, type ErrorInfo, type ReactNode } from 'react';
import { EmptyState } from './EmptyState';

interface Props {
  children: ReactNode;
  /** Label for the failed widget */
  name?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Per-section boundary so one bad widget does not kill the whole desk (Phase E).
 */
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Unexpected error' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[SectionErrorBoundary${this.props.name ? `:${this.props.name}` : ''}]`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <EmptyState
          kind="error"
          compact
          className="h-full min-h-0"
          title={this.props.name ? `${this.props.name} failed` : 'Section failed'}
          body={this.state.message}
          action={
            <button
              type="button"
              className="rounded border border-border px-2 py-1 font-mono text-type-xs text-muted-foreground hover:border-primary hover:text-primary"
              onClick={() => this.setState({ hasError: false, message: '' })}
            >
              Retry section
            </button>
          }
        />
      );
    }
    return this.props.children;
  }
}
