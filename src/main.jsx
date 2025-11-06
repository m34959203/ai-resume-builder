// src/main.jsx
import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import LanguageProvider from './context/LanguageContext.jsx';

import './index.css';
import './i18n/config';

function I18nLoader() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <span>Загрузка…</span>
    </div>
  );
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <React.StrictMode>
    {/* Router — обязательно самый верхний провайдер */}
    <BrowserRouter>
      {/* Контекст языка внутри Router (может читать ?lang=) */}
      <LanguageProvider>
        <ErrorBoundary>
          <Suspense fallback={<I18nLoader />}>
            <App />
          </Suspense>
        </ErrorBoundary>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// PROD: PWA + аналитика + перфоманс (опционально)
if (import.meta.env.PROD) {
  (async () => {
    try {
      const { registerSW } = await import('virtual:pwa-register');
      registerSW({
        immediate: true,
        onNeedRefresh() {
          if (confirm('Доступна новая версия приложения. Обновить сейчас?')) location.reload();
        },
        onOfflineReady() {
          console.log('✅ Приложение доступно офлайн');
        },
      });
    } catch {}

    try {
      const { initAnalytics } = await import('./utils/analytics.js');
      initAnalytics?.();
      console.log('✅ Analytics initialized');
    } catch (err) {
      console.log('ℹ️ Analytics not available:', err?.message || err);
    }

    try {
      const { initPerformanceMonitoring } = await import('./utils/performance.js');
      initPerformanceMonitoring?.();
      console.log('✅ Performance monitoring initialized');
    } catch (err) {
      console.log('ℹ️ Performance monitoring not available:', err?.message || err);
    }
  })();

  window.addEventListener('error', (e) => {
    console.error('💥 Global error:', e.error);
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('💥 Unhandled promise rejection:', e.reason);
  });
}

if (import.meta.hot) import.meta.hot.accept();

console.log('%c🚀 AI Resume Builder', 'font-size:20px;font-weight:bold;color:#3b82f6;');
console.log('%cVersion: ' + (import.meta.env.VITE_APP_VERSION || '1.0.0'), 'color:#10b981;');
console.log('%cEnvironment: ' + import.meta.env.MODE, 'color:#8b5cf6;');
console.log('%ci18n: Initialized ✓', 'color:#f59e0b;');
