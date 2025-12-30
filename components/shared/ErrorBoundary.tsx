import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full bg-black flex items-center justify-center p-6">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="w-20 h-20 mx-auto bg-red-900/20 rounded-full flex items-center justify-center border-2 border-red-500/50">
              <AlertTriangle size={40} className="text-red-500" />
            </div>
            
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
                Terjadi Kesalahan
              </h1>
              <p className="text-gray-400 text-sm">
                Maaf, ada yang tidak beres. Coba muat ulang aplikasi atau hubungi bantuan jika masalah berlanjut.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-4 text-left">
                <summary className="text-red-400 font-bold text-sm cursor-pointer mb-2">
                  Detail Error (Development Only)
                </summary>
                <pre className="text-xs text-gray-400 overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="w-full py-4 bg-app-primary text-black font-black rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-400 transition-all active:scale-95"
              >
                <RefreshCw size={20} />
                Muat Ulang Aplikasi
              </button>
              
              <button
                onClick={this.handleReset}
                className="w-full py-3 bg-gray-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-700 transition-all active:scale-95"
              >
                <Home size={18} />
                Kembali
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Data Anda aman di penyimpanan lokal
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
