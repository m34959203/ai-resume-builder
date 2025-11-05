// src/App.jsx - Production-ready Application
import React, { Suspense, lazy, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import SEO from './components/SEO';
import { PageLoader } from './components/LoadingStates';
import { initGA, trackPageView, trackPerformance, initSessionTracking } from './utils/analytics';

// Lazy load main component for better initial load
const AIResumeBuilder = lazy(() => import('./components/AIResumeBuilder'));

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
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('[SW] Service Worker registered:', registration.scope);
          },
          (error) => {
            console.error('[SW] Service Worker registration failed:', error);
          }
        );
      });
    }
  }, []);

  return (
    <ErrorBoundary>
      <SEO />
      <Suspense fallback={<PageLoader message="Загружаем приложение..." />}>
        <AIResumeBuilder />
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;