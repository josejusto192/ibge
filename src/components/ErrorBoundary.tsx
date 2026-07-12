import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logClientError } from '../lib/errorLog';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logClientError(error, `render: ${info.componentStack?.slice(0, 500)}`);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-app-bg p-8 text-center">
          <div className="font-display text-[20px] font-extrabold text-ink">Ops, algo deu errado.</div>
          <div className="font-sans text-[13.5px] font-semibold text-text2">Já registramos o problema. Tenta recarregar a página.</div>
          <button
            onClick={() => window.location.reload()}
            className="rounded-2xl bg-blue px-5 py-3 font-sans text-[14px] font-extrabold text-white"
            style={{ boxShadow: '0 6px 0 #0E3DAE' }}
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
