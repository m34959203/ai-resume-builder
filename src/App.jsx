// src/App.jsx — Production-ready Application with i18n (Vite)
import React, { Suspense, lazy, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import SEO from './components/SEO';
import { PageLoader } from './components/LoadingStates';
import { LanguageProvider } from './context/LanguageContext';
import { initGA, trackPageView, trackPerformance, initSessionTracking } from './utils/analytics';
// Рекомендуемый способ для vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register';

// Ленивая подгрузка главного экрана
const AIResumeBuilder = lazy(() => import('./components/AIResumeBuilder'));

function AppContent() {
  const location = useLocation();

  // Инициализация аналитики (только прод)
  useEffect(() => {
    if (import.meta.env.PROD) {
      initGA();
      initSessionTracking();
      trackPerformance();
    }
  }, []);

  // Трекинг просмотров и скролл к началу
  useEffect(() => {
    trackPageView(location.pathname + location.search, document?.title || '');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location]);

  // Регистрация сервис-воркера (vite-plugin-pwa)
  useEffect(() => {
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          // можно показать тост/кнопку для обновления
          console.log('[PWA] New content available; will update on reload.');
        },
        onOfflineReady() {
          console.log('[PWA] App is ready to work offline.');
        },
      });
      // updateSW() можно вызвать по кнопке для форс-обновления SW
    }
  }, []);

  return (
    <>
      <SEO />
      <Suspense fallback={<PageLoader />}>
        <AIResumeBuilder />
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ErrorBoundary>
  );
}
