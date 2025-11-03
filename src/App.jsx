// src/App.jsx - Production-ready Application (i18n-enabled)
import React, { Suspense, lazy, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import SEO from './components/SEO';
import { PageLoader } from './components/LoadingStates';
import { initGA, trackPageView, trackPerformance, initSessionTracking } from './utils/analytics';
import { LanguageProvider } from './context/LanguageContext';
import useTranslation from './hooks/useTranslation';

// Lazy load main component for better initial load
const AIResumeBuilder = lazy(() => import('./components/AIResumeBuilder'));

/** Локальный компонент-заглушка с переводом для Suspense */
function FallbackLoader() {
  const { t } = useTranslation();
  const msg = useMemo(() => t('messages.loadingApp') || 'Loading…', [t]);
  return <PageLoader message={msg} />;
}

function App() {
  const location = useLocation();

  useEffect(() => {
    // Initialize analytics (production only)
    if (process.env.NODE_ENV === 'production') {
      initGA();
      initSessionTracking();
      trackPerformance();
    }
  }, []);

  useEffect(() => {
    // Track page views
    trackPageView(location.pathname + location.search, document.title);

    // Scroll to top on page change
    window.scrollTo(0, 0);
  }, [location]);

  useEffect(() => {
    // Register service worker for PWA (production only)
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      const onLoad = () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('[SW] Service Worker registered:', registration.scope);
          },
          (error) => {
            console.error('[SW] Service Worker registration failed:', error);
          }
        );
      };
      window.addEventListener('load', onLoad);
      return () => window.removeEventListener('load', onLoad);
    }
  }, []);

  return (
    <LanguageProvider>
      <ErrorBoundary>
        <SEO />
        <Suspense fallback={<FallbackLoader />}>
          <AIResumeBuilder />
        </Suspense>
      </ErrorBoundary>
    </LanguageProvider>
  );
}

export default App;
