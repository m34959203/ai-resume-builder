// src/components/ErrorBoundary.jsx
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { LanguageContext } from '../context/LanguageContext';

/**
 * ErrorBoundary — перехватывает ошибки рендера дочерних компонентов.
 * - Локализует сообщения через t('messages.error') и др.
 * - Показывает дружелюбный экран с кнопками "Попробовать снова" и "Перезагрузить".
 * - В dev-режиме пишет стек в консоль; можно развернуть детали.
 *
 * Пропсы:
 * - onError?: (error, info) => void   — внешний логгер
 * - onRetry?: () => void              — опциональный сброс состояния родителя
 */
export default class ErrorBoundary extends React.Component {
  static contextType = LanguageContext;

  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null, showDetails: false, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // В деве покажем стек в консоли
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error, info);
    }
    // Внешний логгер (Sentry/GA/own)
    if (typeof this.props.onError === 'function') {
      try { this.props.onError(error, info); } catch {}
    }
    this.setState({ info });
  }

  handleRetry = () => {
    if (typeof this.props.onRetry === 'function') {
      try { this.props.onRetry(); } catch {}
    }
    this.setState({ hasError: false, error: null, info: null, showDetails: false, copied: false });
  };

  handleReload = () => {
    try {
      // Сохраняем текущий путь, просто перезагружаем страницу
      window.location.reload();
    } catch {
      this.handleRetry();
    }
  };

  toggleDetails = () => this.setState((s) => ({ showDetails: !s.showDetails, copied: false }));

  copyDetails = async () => {
    const { error, info } = this.state;
    const text = [
      `Error: ${String(error?.message || error)}`,
      error?.stack ? `\nStack:\n${error.stack}` : '',
      info?.componentStack ? `\nComponent stack:\n${info.componentStack}` : '',
      `\nURL: ${typeof window !== 'undefined' ? window.location.href : ''}`,
      `Env: ${import.meta.env?.MODE || ''}`,
      `Time: ${new Date().toISOString()}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 1500);
    } catch {
      // ignore
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    // Локализованные строки
    const ctx = this.context || {};
    const t = typeof ctx.t === 'function' ? ctx.t : (k, d) => d ?? k;

    const title = t('messages.errorTitle', 'Unexpected Application Error');
    const subtitle =
      t('messages.error', 'Something went wrong.') ||
      'Something went wrong.';
    const retry = t('actions.tryAgain', 'Попробовать снова');
    const reload = t('actions.reload', 'Перезагрузить страницу');
    const show = t('actions.showDetails', 'Показать детали');
    const hide = t('actions.hideDetails', 'Скрыть детали');
    const copied = t('actions.copied', 'Скопировано!');
    const copy = t('actions.copy', 'Скопировать');

    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <AlertTriangle className="text-red-600" size={28} aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="text-gray-600 mb-4 max-w-xl">
          {subtitle}
        </p>

        <div className="flex flex-wrap gap-3 justify-center mb-4">
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {retry}
          </button>
          <button
            onClick={this.handleReload}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            {reload}
          </button>
          <button
            onClick={this.toggleDetails}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            {this.state.showDetails ? hide : show}
          </button>
        </div>

        {this.state.showDetails && (
          <div className="w-full max-w-3xl text-left">
            <pre className="bg-gray-50 border rounded-lg p-3 overflow-auto text-xs leading-5 whitespace-pre-wrap">
{String(this.state.error?.message || this.state.error || 'Error')}
{this.state.error?.stack ? `\n\n${this.state.error.stack}` : ''}
{this.state.info?.componentStack ? `\n\n${this.state.info.componentStack}` : ''}
            </pre>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={this.copyDetails}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                {this.state.copied ? copied : copy}
              </button>
              <span className="text-xs text-gray-500">
                {typeof window !== 'undefined' ? window.location.href : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
}
