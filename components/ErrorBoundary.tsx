import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[Origynl] render error:', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          maxWidth: 720,
          margin: '96px auto',
          padding: 48,
          border: '2px solid var(--bad, #dc2626)',
          fontFamily: 'inherit',
        }}
      >
        <div
          className="label"
          style={{ color: 'var(--bad, #dc2626)', marginBottom: 20, letterSpacing: '0.1em' }}
        >
          SYSTEM · UNEXPECTED ERROR
        </div>
        <h2
          className="serif"
          style={{ fontSize: 40, letterSpacing: '-0.025em', lineHeight: 1.05, marginBottom: 16 }}
        >
          Something broke while rendering this page.
        </h2>
        <p style={{ color: 'var(--ink-dim, #666)', marginBottom: 24 }}>
          The app has been stopped to prevent inconsistent state. Your file was never uploaded —
          hashing happens locally, and no partial certification has been recorded on-chain.
        </p>
        <pre
          className="mono"
          style={{
            background: 'var(--bg-1, #111)',
            padding: 16,
            fontSize: 12,
            overflow: 'auto',
            maxHeight: 240,
            marginBottom: 24,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {this.state.error.message}
        </pre>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-seal" onClick={this.reset}>
            Try again
          </button>
          <button className="btn btn-ghost" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
