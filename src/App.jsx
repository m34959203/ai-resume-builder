// src/App.jsx — Production-ready Application with i18n, PWA, and Analytics
import React, { Suspense, lazy, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import ErrorBoundary from './components/ErrorBoundary';
import SEO from './components/SEO';
import { PageLoader } from './components/LoadingStates';

import { LanguageProvider } from './context/LanguageContext';
import { useTranslation } from './hooks/useTranslation';

import { initGA, trackPageView, trackPerformance, initSessionTracking } from './utils/analytics';

// Lazy load main component for better initial load
const AIResumeBuilder = lazy(() => import('./components/AIResumeBuilder'));

function AppShell() {
  const location = useLocation();
  const { t, lang } = useTranslation();

  // Keep document <html lang="..."> in sync with current language
  useEffect(() => {
    if (lang) document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  // Initialize analytics (production only)
  useEffect(() => {
    if (import.meta.env.PROD) {
      try { initGA(); } catch (e) { /* no-op */ }
      try { initSessionTracking(); } catch (e) { /* no-op */ }
      try { trackPerformance(); } catch (e) { /* no-op */ }
    }
  }, []);

  // Track page views & scroll to top on route change
  useEffect(() => {
    try {
      trackPageView(location.pathname + location.search, document.title);
    } catch (e) { /* no-op */ }

    // instant not widely supported, fallback to auto
    const behavior = 'instant' in window ? 'instant' : 'auto';
    window.scrollTo({ top: 0, behavior });
  }, [location]);

  // Register service worker for PWA (production, secure contexts)
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    if (!('serviceWorker' in navigator)) return;
    if (!window.isSecureContext) return; // required for HTTPS (except localhost)

    const register = () => {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          // eslint-disable-next-line no-console
          console.log('[SW] registered:', registration.scope);
        },
        (error) => {
          // eslint-disable-next-line no-console
          console.error('[SW] registration failed:', error);
        }
      );
    };

    if (document.readyState === 'complete') {
      register();
      return;
    }
    const onLoad = () => register();
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return (
    <>
      <SEO />
      <Suspense fallback={<PageLoader message={t('common.loadingApp')} />}>
        <AIResumeBuilder />
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AppShell />
      </LanguageProvider>
    </ErrorBoundary>
  );
}
