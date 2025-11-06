// src/main.jsx
import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import LanguageProvider from './context/LanguageContext.jsx';

// Стили
import './index.css';

// i18n должен быть инициализирован до рендера
import './i18n/config';

// Небольшой fallback на время подгрузки переводов
function I18nLoader() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <span>Загрузка…</span>
    </div>
  );
}

// Корневой элемент
const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}

// Рендер
createRoot(rootEl).render(
  <React.StrictMode>
    {/* ВАЖНО: Router — САМЫЙ ВЕРХНИЙ провайдер */}
    <BrowserRouter>
      {/* Языковой провайдер — внутри Router (может читать ?lang=) */}
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

// ===== PROD-инициализация: PWA + аналитика + перфоманс =====
if (import.meta.env.PROD) {
  (async () => {
    // PWA (vite-plugin-pwa). Работает, только если плагин подключён.
    try {
      const { registerSW } = await import('virtual:pwa-register');
      registerSW({
        immediate: true,
        onNeedRefresh() {
          const ok = confirm('Доступна новая версия приложения. Обновить сейчас?');
          if (ok) location.reload();
        },
        onOfflineReady() {
          console.log('✅ Приложение доступно офлайн');
        },
      });
    } catch (e) {
      // Плагин может быть отключён — это нормально
      // console.debug('PWA not available:', e?.message);
    }

    // Аналитика (опционально)
    try {
      const { initAnalytics } = await import('./utils/analytics.js');
      initAnalytics?.();
      console.log('✅ Analytics initialized');
    } catch (err) {
      console.log('ℹ️ Analytics not available:', err?.message || err);
    }

    // Перфоманс (опционально)
    try {
      const { initPerformanceMonitoring } = await import('./utils/performance.js');
      initPerformanceMonitoring?.();
      console.log('✅ Performance monitoring initialized');
    } catch (err) {
      console.log('ℹ️ Performance monitoring not available:', err?.message || err);
    }
  })();

  // Глобальные обработчики ошибок (в проде)
  window.addEventListener('error', (event) => {
    console.error('💥 Global error:', event.error);
    // TODO: отправка в Sentry/LogRocket
  });
  window.addEventListener('unhandledrejection', (event) => {
    console.error('💥 Unhandled promise rejection:', event.reason);
    // TODO: отправка в Sentry/LogRocket
  });
}

// HMR
if (import.meta.hot) {
  import.meta.hot.accept();
}

// Инфо о сборке
console.log('%c🚀 AI Resume Builder', 'font-size:20px;font-weight:bold;color:#3b82f6;');
console.log('%cVersion: ' + (import.meta.env.VITE_APP_VERSION || '1.0.0'), 'color:#10b981;');
console.log('%cEnvironment: ' + import.meta.env.MODE, 'color:#8b5cf6;');
console.log('%ci18n: Initialized ✓', 'color:#f59e0b;');
