import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingStates from './components/LoadingStates';

// Стили
import './index.css';

// i18n конфигурация
import './i18n/config';

// Аналитика и мониторинг
import { initAnalytics } from './utils/analytics';
import { initPerformanceMonitoring } from './utils/performance';

// PWA
import { registerServiceWorker } from './utils/pwa';

// ===================================
// ИНИЦИАЛИЗАЦИЯ
// ===================================

// Аналитика (Google Analytics, Yandex Metrika и т.д.)
if (import.meta.env.PROD) {
  initAnalytics();
  initPerformanceMonitoring();
}

// Service Worker для PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  registerServiceWorker();
}

// ===================================
// RENDER
// ===================================

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<LoadingStates.FullPage />}>
        <App />
      </Suspense>
    </ErrorBoundary>
  </React.StrictMode>
);

// ===================================
// HOT MODULE REPLACEMENT (HMR)
// ===================================

if (import.meta.hot) {
  import.meta.hot.accept();
}