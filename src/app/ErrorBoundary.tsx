import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Evidence Scenario Engine render failure', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="fatal-state">
        <span>EVIDENCE SCENARIO ENGINE / RECOVERY</span>
        <h1>The decision workspace could not render.</h1>
        <p>{this.state.error.message}</p>
        <button type="button" onClick={() => window.location.reload()}>Reload workspace</button>
      </main>
    );
  }
}
