// src/components/ErrorBoundary.jsx — улучшенный ErrorBoundary с i18n, A11y и отчётом об ошибке
import React from 'react';

// Пытаемся аккуратно использовать контекст языка и словарь переводов (не ломаемся, если их нет)
let LanguageContext = null;
let translations = null;
try {
  // эти пути соответствуют структуре проекта; при необходимости подправьте
  // eslint-disable-next-line import/no-unresolved, global-require
  LanguageContext = require('../context/LanguageContext')?.LanguageContext ?? null;
  // eslint-disable-next-line import/no-unresolved, global-require
  translations = require('../locales/translations')?.translations ?? null;
} catch (_) {
  // no-op
}

// Утилиты локализации (fallback → ru строки)
function getByPath(obj, path) {
  return String(path || '')
    .split('.')
    .reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), obj);
}
function format(str, params) {
  if (!params) return str;
  return String(str).replace(/\{(\w+)\}/g, (_, k) =>
    Object.prototype.hasOwnProperty.call(params, k) ? params[k] : `{${k}}`
  );
}
function tHelper(lang, key, fallback, params) {
  try {
    if (!translations) return fallback;
    const dict = translations[lang] || translations.ru || {};
    let val = getByPath(dict, key);
    if (val == null) val = getByPath(translations.ru || {}, key);
    if (val == null) return fallback;
    return typeof val === 'string' ? format(val, params) : fallback;
  } catch {
    return fallback;
  }
}

// Генерация «идентификатора» ошибки для удобства репортинга
function makeErrorId(error, info) {
  const base =
    (error?.name || 'Error') +
    '|' +
    (error?.message || '') +
    '|' +
    (error?.stack || '') +
    '|' +
    (info?.componentStack || '');
  try {
    // В браузерах есть crypto.randomUUID
    const uuid = typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : '';
    // Простенький «хеш» по длине — лишь для короткого id; не криптостойко
    const len = base.length;
    const mix =
      (len % 997) +
      (base.charCodeAt(0) || 0) +
      (base.charCodeAt(len - 1) || 0) +
      (base.split('\n').length || 0);
    return `EB-${mix.toString(16)}${uuid ? '-' + uuid.slice(0, 8) : ''}`;
  } catch {
    return `EB-${Date.now().toString(16)}`;
  }
}

/** Простой, но удобный ErrorBoundary */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      info: null,
      detailsOpen: false,
      copied: false,
      errorId: null,
    };
  }

  // Поддержка контекста языка (если доступен)
  static contextType = LanguageContext || React.createContext({ lang: 'ru' });

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Сохраняем детали
    const errorId = makeErrorId(error, info);
    this.setState({ info, errorId });

    // Консоль — только в деве
    if (import.meta?.env?.DEV) {
      // eslint-disable-next-line no-console
      console.error('ErrorBoundary:', error, info, { errorId });
    }

    // Пользовательский хук-колбэк для отчётности
    if (typeof this.props.onError === 'function') {
      try {
        this.props.onError(error, info, { errorId });
      } catch (_) {
        // ignore
      }
    }

    // Грубая телеметрия через window.__onErrorBoundary (если проект настроен)
    try {
      if (typeof window !== 'undefined' && typeof window.__onErrorBoundary === 'function') {
        window.__onErrorBoundary({ error, info, errorId });
      }
    } catch (_) {
      // ignore
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, info: null, copied: false, errorId: null });
    if (typeof this.props.onReset === 'function') {
      try {
        this.props.onReset();
      } catch (_) {
        // ignore
      }
    }
  };

  handleReload = () => {
    try {
      window.location.reload();
    } catch (_) {
      this.handleRetry();
    }
  };

  toggleDetails = () => this.setState((s) => ({ detailsOpen: !s.detailsOpen }));

  handleCopy = async () => {
    try {
      const payload = this.buildReportPayload();
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 1500);
    } catch (_) {
      // ignore
    }
  };

  buildReportPayload() {
    const { error, info, errorId } = this.state;
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const lang = (this.context && this.context.lang) || 'ru';
    return {
      errorId,
      appSection: this.props.appSection || 'app',
      message: error?.message || '',
      name: error?.name || 'Error',
      stack: error?.stack || '',
      componentStack: info?.componentStack || '',
      url: typeof window !== 'undefined' ? window.location.href : '',
      time: new Date().toISOString(),
      userAgent: ua,
      locale: lang,
      env: import.meta?.env?.MODE || (import.meta?.env?.DEV ? 'development' : 'production'),
    };
  }

  t(key, fallback, params) {
    const lang = (this.context && this.context.lang) || 'ru';
    return tHelper(lang, key, fallback, params);
  }

  renderFallback() {
    const { error, info, detailsOpen, copied, errorId } = this.state;

    // Тексты (с i18n fallback)
    const title = this.t('errorBoundary.title', 'Упс! Что-то сломалось');
    const subtitle = this.t(
      'errorBoundary.subtitle',
      'Не волнуйтесь, мы уже смотрим на проблему.'
    );
    const primary = this.t('errorBoundary.actions.retry', 'Попробовать снова');
    const reload = this.t('errorBoundary.actions.reload', 'Перезагрузить страницу');
    const show = this.t('errorBoundary.actions.showDetails', 'Показать детали');
    const hide = this.t('errorBoundary.actions.hideDetails', 'Скрыть детали');
    const copy = this.t('errorBoundary.actions.copy', 'Скопировать отчёт');
    const copiedTxt = this.t('common.copied', 'Скопировано!');
    const labelId = errorId ? ` (ID: ${errorId})` : '';

    // Возможность переопределить готовым React-узлом
    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        className="min-h-[40vh] flex flex-col items-center justify-center p-6 text-center bg-white dark:bg-gray-900"
        role="alert"
        aria-live="assertive"
      >
        <h1 className="text-2xl font-bold mb-1 text-gray-900 dark:text-gray-100">
          {title}
          <span className="text-gray-400 dark:text-gray-500 text-base align-middle">{labelId}</span>
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-4 max-w-xl">{subtitle}</p>

        {/* Короткая сводка ошибки (без стека), полезно для пользователя */}
        {error?.message ? (
          <p className="mb-4 max-w-2xl text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded">
            {String(error.message)}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            {primary}
          </button>
          <button
            onClick={this.handleReload}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg transition"
          >
            {reload}
          </button>
          <button
            onClick={this.toggleDetails}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            aria-expanded={detailsOpen ? 'true' : 'false'}
            aria-controls="error-details"
          >
            {detailsOpen ? hide : show}
          </button>
          <button
            onClick={this.handleCopy}
            className="px-4 py-2 border border-blue-300 text-blue-700 dark:text-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
          >
            {copied ? copiedTxt : copy}
          </button>
        </div>

        {detailsOpen && (
          <div
            id="error-details"
            className="w-full max-w-3xl text-left text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 overflow-auto"
          >
            <div className="mb-3">
              <div className="text-gray-700 dark:text-gray-200 font-semibold">Детали ошибки</div>
              <pre className="mt-2 whitespace-pre-wrap text-red-800 dark:text-red-300">
                {error?.stack || error?.message || '—'}
              </pre>
            </div>
            <div className="mb-3">
              <div className="text-gray-700 dark:text-gray-200 font-semibold">Компонентный стек</div>
              <pre className="mt-2 whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {info?.componentStack || '—'}
              </pre>
            </div>
            <div className="mb-1">
              <div className="text-gray-700 dark:text-gray-200 font-semibold">Диагностика</div>
              <pre className="mt-2 whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {JSON.stringify(this.buildReportPayload(), null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Линк «Домой», если нужно */}
        {this.props.showHomeLink ? (
          <a
            href="/"
            className="mt-4 text-blue-600 hover:text-blue-700 underline underline-offset-2"
          >
            {this.t('errorBoundary.actions.home', 'На главную')}
          </a>
        ) : null}
      </div>
    );
  }

  render() {
    // Позволяем передать кастомный рендер-функционал как fallbackRender({error, resetError})
    if (this.state.hasError) {
      if (typeof this.props.fallbackRender === 'function') {
        return this.props.fallbackRender({
          error: this.state.error,
          resetError: this.handleRetry,
          errorId: this.state.errorId,
        });
      }
      return this.renderFallback();
    }
    return this.props.children;
  }
}
