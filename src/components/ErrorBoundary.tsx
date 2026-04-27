import { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { Bean, Brand, ColorPill } from './primitives';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ error, info });
    console.error('ErrorBoundary caught:', error, info);
    Sentry.captureException(error, { contexts: { react: { componentStack: info.componentStack ?? null } } });
  }

  private reset = () => {
    this.setState({ error: null, info: null });
  };

  private hardReset = () => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    const message = this.state.error.message || String(this.state.error);

    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--page)',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Brand />
        <div
          style={{
            marginTop: 40,
            maxWidth: 520,
            alignSelf: 'center',
            textAlign: 'center',
          }}
        >
          <ColorPill tone="coral" style={{ marginBottom: 14 }}>
            something broke
          </ColorPill>
          <h1
            style={{
              fontFamily: 'var(--disp)',
              fontSize: 34,
              fontWeight: 600,
              letterSpacing: -0.02,
              margin: '0 0 12px',
            }}
          >
            Hmm — that's on us,{' '}
            <span style={{ fontStyle: 'italic', color: 'var(--coral-ink)' }}>not your ear.</span>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55, margin: '0 0 24px' }}>
            The app hit a snag and stopped rendering. Try again — if it keeps happening, the "reset local data"
            button wipes saved progress and starts over.
          </p>
          <pre
            style={{
              textAlign: 'left',
              background: 'var(--page-2)',
              border: '1px solid var(--hairline)',
              borderRadius: 12,
              padding: 12,
              fontFamily: 'var(--mono)',
              fontSize: 12,
              color: 'var(--ink-2)',
              overflow: 'auto',
              maxHeight: 140,
              margin: '0 0 24px',
            }}
          >
            {message}
          </pre>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Bean tone="coral" size="md" onClick={this.reset}>
              try again
            </Bean>
            <Bean tone="soft" size="md" onClick={this.hardReset}>
              reset local data
            </Bean>
          </div>
        </div>
      </div>
    );
  }
}
