import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// ===================================
// СТИЛИ
// ===================================
import './index.css';

// ===================================
// 🌐 i18n КОНФИГУРАЦИЯ
// ===================================
// ВАЖНО: Инициализация многоязычности
// Должна быть ДО рендера App!
import './i18n/config';

// ===================================
// 📊 АНАЛИТИКА И МОНИТОРИНГ (опционально)
// ===================================
// Динамический импорт - не упадет если файлы отсутствуют
if (import.meta.env.PROD) {
  // Google Analytics, Yandex Metrika и т.д.
  import('./utils/analytics.js')
    .then(({ initAnalytics }) => {
      initAnalytics();
      console.log('✅ Analytics initialized');
    })
    .catch((err) => {
      console.log('ℹ️ Analytics not available:', err.message);
    });

  // Performance monitoring
  import('./utils/performance.js')
    .then(({ initPerformanceMonitoring }) => {
      initPerformanceMonitoring();
      console.log('✅ Performance monitoring initialized');
    })
    .catch((err) => {
      console.log('ℹ️ Performance monitoring not available:', err.message);
    });

  // PWA Service Worker
  if ('serviceWorker' in navigator) {
    import('./utils/pwa.js')
      .then(({ registerServiceWorker }) => {
        registerServiceWorker();
        console.log('✅ Service Worker registered');
      })
      .catch((err) => {
        console.log('ℹ️ PWA not available:', err.message);
      });
  }
}

// ===================================
// 🚀 RENDER
// ===================================
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// ===================================
// 🔥 HOT MODULE REPLACEMENT (HMR)
// ===================================
if (import.meta.hot) {
  import.meta.hot.accept();
}

// ===================================
// 🐛 ГЛОБАЛЬНАЯ ОБРАБОТКА ОШИБОК
// ===================================
if (import.meta.env.PROD) {
  // Отлавливаем необработанные ошибки
  window.addEventListener('error', (event) => {
    console.error('💥 Global error:', event.error);
    // Здесь можно отправлять в Sentry/LogRocket
  });

  // Отлавливаем необработанные Promise rejection
  window.addEventListener('unhandledrejection', (event) => {
    console.error('💥 Unhandled promise rejection:', event.reason);
    // Здесь можно отправлять в Sentry/LogRocket
  });
}

// ===================================
// ℹ️ ИНФОРМАЦИЯ О СБОРКЕ
// ===================================
console.log(
  `%c🚀 AI Resume Builder`,
  'font-size: 20px; font-weight: bold; color: #3b82f6;'
);
console.log(
  `%cVersion: ${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
  'color: #10b981;'
);
console.log(
  `%cEnvironment: ${import.meta.env.MODE}`,
  'color: #8b5cf6;'
);
console.log(
  `%ci18n: Initialized ✓`,
  'color: #f59e0b;'
);