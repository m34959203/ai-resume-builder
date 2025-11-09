// src/components/ErrorBoundary.jsx
import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { LanguageContext } from '../context/LanguageContext';

class ErrorBoundary extends Component {
  static contextType = LanguageContext;

  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Логирование ошибки
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Отправка в систему мониторинга (если настроено)
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  logErrorToService = (error, errorInfo) => {
    try {
      // Sentry.captureException(error, { extra: errorInfo });
      console.log('[Error Service] Logged:', error.message);
    } catch (e) {
      console.error('[Error Service] Failed to log:', e);
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleGoHome = () => {
    this.handleReset();
    window.location.href = '/';
  };

  // Функция для получения переводов (fallback если контекст недоступен)
  getTranslation = (key, fallback) => {
    try {
      const { language } = this.context || {};
      const translations = require('../locales/translations').translations;
      const keys = key.split('.');
      let value = translations[language || 'ru'];
      
      for (const k of keys) {
        value = value?.[k];
      }
      
      return typeof value === 'string' ? value : fallback;
    } catch {
      return fallback;
    }
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorCount } = this.state;
      const isDevelopment = process.env.NODE_ENV === 'development';
      const isCritical = errorCount > 3;

      // Переводы с fallback
      const t = (key, fallback) => this.getTranslation(key, fallback);

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              {/* Иконка ошибки */}
              <div className="flex justify-center mb-6">
                <div className={`
                  w-20 h-20 rounded-full flex items-center justify-center
                  ${isCritical 
                    ? 'bg-red-100 animate-pulse' 
                    : 'bg-orange-100'
                  }
                `}>
                  <AlertTriangle 
                    className={isCritical ? 'text-red-600' : 'text-orange-600'} 
                    size={40} 
                  />
                </div>
              </div>

              {/* Заголовок */}
              <h1 className="text-3xl font-bold text-center text-gray-900 mb-4">
                {isCritical 
                  ? t('errors.criticalTitle', 'Критическая ошибка')
                  : t('errors.title', 'Что-то пошло не так')
                }
              </h1>

              {/* Описание */}
              <p className="text-center text-gray-600 mb-6">
                {isCritical 
                  ? t('errors.criticalMessage', 'Приложение столкнулось с критической ошибкой. Пожалуйста, перезагрузите страницу или вернитесь на главную.')
                  : t('errors.message', 'Мы зафиксировали ошибку и работаем над её устранением. Попробуйте обновить страницу.')
                }
              </p>

              {/* Детали ошибки (только в dev) */}
              {isDevelopment && error && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <details>
                    <summary className="cursor-pointer font-semibold text-gray-700 mb-2">
                      {t('errors.details', 'Детали ошибки')} ({t('errors.devOnly', 'только в разработке')})
                    </summary>
                    
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">
                          {t('errors.errorMessage', 'Сообщение')}:
                        </p>
                        <p className="text-sm text-red-600 font-mono bg-red-50 p-2 rounded">
                          {error.toString()}
                        </p>
                      </div>

                      {errorInfo && errorInfo.componentStack && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">
                            {t('errors.componentStack', 'Стек компонентов')}:
                          </p>
                          <pre className="text-xs text-gray-700 bg-gray-100 p-2 rounded overflow-auto max-h-40">
                            {errorInfo.componentStack}
                          </pre>
                        </div>
                      )}

                      {error.stack && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">
                            {t('errors.callStack', 'Стек вызовов')}:
                          </p>
                          <pre className="text-xs text-gray-700 bg-gray-100 p-2 rounded overflow-auto max-h-40">
                            {error.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}

              {/* Кнопки действий */}
              <div className="flex flex-col sm:flex-row gap-3">
                {!isCritical && (
                  <button
                    onClick={this.handleReset}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={20} />
                    {t('errors.tryAgain', 'Попробовать снова')}
                  </button>
                )}
                
                <button
                  onClick={this.handleGoHome}
                  className={`
                    flex-1 px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2
                    ${isCritical 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }
                  `}
                >
                  <Home size={20} />
                  {t('errors.goHome', 'На главную')}
                </button>
              </div>

              {/* Дополнительная информация */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-center text-sm text-gray-500">
                  {t('errors.contactSupport', 'Если проблема повторяется, пожалуйста, свяжитесь с поддержкой')}
                </p>
                
                {errorCount > 1 && (
                  <p className="text-center text-xs text-orange-600 mt-2">
                    {t('errors.repeated', 'Ошибка повторилась')} {errorCount} {t('errors.times', 'раз')}
                  </p>
                )}
              </div>
            </div>

            {/* Советы пользователю */}
            <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">
                {t('errors.whatToTry', 'Что можно попробовать')}:
              </h3>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• {t('errors.tip1', 'Обновите страницу (Ctrl + F5 или Cmd + R)')}</li>
                <li>• {t('errors.tip2', 'Очистите кэш браузера')}</li>
                <li>• {t('errors.tip3', 'Попробуйте использовать режим инкогнито')}</li>
                <li>• {t('errors.tip4', 'Проверьте подключение к интернету')}</li>
                <li>• {t('errors.tip5', 'Обновите браузер до последней версии')}</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;