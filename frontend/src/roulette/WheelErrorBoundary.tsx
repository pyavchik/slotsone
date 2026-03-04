import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class WheelErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('RouletteWheel error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 300,
            height: 300,
            margin: '0 auto',
            background: 'rgba(13, 7, 4, 0.8)',
            border: '1px solid rgba(200, 160, 78, 0.3)',
            borderRadius: '50%',
            color: '#c8a04e',
            fontSize: 14,
            textAlign: 'center',
            padding: 24,
          }}
        >
          Wheel failed to load.
          <br />
          Please refresh.
        </div>
      );
    }
    return this.props.children;
  }
}
