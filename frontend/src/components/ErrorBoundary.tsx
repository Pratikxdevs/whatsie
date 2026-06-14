import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, LogIn } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-zinc-400 text-sm mb-2">
              An unexpected error occurred. This is likely a temporary issue.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-left text-xs text-red-400 bg-red-500/5 border border-red-500/10 rounded-xl p-4 mb-6 overflow-auto max-h-40">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3 justify-center mt-6">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-semibold text-sm px-5 py-2.5 rounded-xl transition-all"
              >
                <RefreshCw size={15} />
                Reload
              </button>
              <a
                href="/login"
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-sm px-5 py-2.5 rounded-xl transition-all"
              >
                <LogIn size={15} />
                Back to Login
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
