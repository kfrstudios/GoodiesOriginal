import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    showDetails: false,
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      showDetails: false,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Goodies ErrorBoundary caught an uncaught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6 text-zinc-900">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-zinc-200 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 border border-emerald-100">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                Goodies Notfallmodus
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 pt-2">
                Goodies konnte gerade nicht gestartet werden.
              </h1>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Ein unerwarteter Fehler hat das Laden verhindert. Deine gespeicherten Daten sind sicher.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 px-6 rounded-2xl shadow-sm transition-all duration-200 active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Erneut versuchen</span>
              </button>
            </div>

            <div className="pt-4 border-t border-zinc-100 text-left">
              <button
                type="button"
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                className="flex items-center justify-between w-full text-xs font-medium text-zinc-500 hover:text-zinc-800 transition-colors"
              >
                <span>Technische Details (Entwicklungsmodus)</span>
                {this.state.showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {this.state.showDetails && (
                <div className="mt-3 p-3 bg-zinc-900 text-emerald-400 rounded-xl text-xs font-mono overflow-auto max-h-48 whitespace-pre-wrap border border-zinc-800">
                  <div className="text-rose-400 font-semibold mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {this.state.error?.name}: {this.state.error?.message}
                  </div>
                  {this.state.error?.stack}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
