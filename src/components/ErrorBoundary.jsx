import React from 'react';

/** Простой ErrorBoundary, чтобы перехватывать ошибки рендера */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // В деве покажем стек в консоли
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary:', error, info);
    }
  }

  handleRetry = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[40vh] flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-2xl font-bold mb-2">Unexpected Application Error</h1>
          <p className="text-gray-600 mb-4">
            {String(this.state.error?.message || 'Something went wrong.')}
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Попробовать снова
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
