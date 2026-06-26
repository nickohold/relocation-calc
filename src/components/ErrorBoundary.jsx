import { Component } from 'react';

// Top-level safety net: any throw in the engine or an unguarded lookup would
// otherwise white-screen the whole app. Catch it and show a minimal fallback.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleReset = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-slate-100">
        <div className="max-w-md w-full text-center space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl">
          <h1 className="text-xl font-black tracking-tight">Something went wrong</h1>
          <p className="text-sm leading-relaxed text-slate-400">
            The calculator hit an unexpected error. Your inputs are safe — reloading usually clears it.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center justify-center rounded-full bg-orange-500 px-6 py-2.5 text-sm font-bold text-white transition-transform hover:scale-105"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
