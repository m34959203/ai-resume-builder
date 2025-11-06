/**
 * src/App.jsx
 * Main Application Component
 * Production-ready with Analytics, PWA, Error Handling
 */

import React, { Suspense, lazy, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import SEO from './components/SEO';
import { PageLoader } from './components/LoadingStates';

// ═══════════════════════════════════════════════════════════
// 🎨 LAZY LOADED COMPONENTS
// ═══════════════════════════════════════════════════════════

const AIResumeBuilder = lazy(() => 
  import('./components/AIResumeBuilder').catch(() => ({
    default: () => <div>Failed to load application. Please refresh.</div>
  }))
);

// ═══════════════════════════════════════════════════════════
// 🚀 MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════

function App() {
  const location = useLocation();

  // ═══════════════════════════════════════════════════════════
  // 📄 PAGE VIEW TRACKING
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    // Analytics уже инициализирован в main.jsx
    // Здесь только трекаем навигацию
    if (import.meta.env.PROD) {
      // Динамический импорт для tree-shaking
      import('./utils/analytics.js')
        .then(({ trackPageView }) => {
          trackPageView(
            location.pathname + location.search, 
            document.title
          );
        })
        .catch(() => {
          console.log('Analytics not available');
        });
    }
    
    // Scroll to top on page change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location]);

  // ═══════════════════════════════════════════════════════════
  // 📱 PWA SERVICE WORKER
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) {
      return;
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        console.log('✅ [PWA] Service Worker registered:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 [PWA] New version available');
              
              // Notify user about update (optional)
              if (window.confirm('Доступна новая версия приложения. Обновить?')) {
                window.location.reload();
              }
            }
          });
        });

      } catch (error) {
        console.error('❌ [PWA] Service Worker registration failed:', error);
      }
    };

    // Register on load
    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════
  // 🎯 PERFORMANCE MONITORING
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    // Report initial load performance
    if (import.meta.env.PROD && window.performance?.timing) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const perfData = window.performance.timing;
          const loadTime = perfData.loadEventEnd - perfData.navigationStart;
          
          console.log(`⚡ Page loaded in ${loadTime}ms`);

          // Track via analytics
          import('./utils/analytics.js')
            .then(({ trackTiming }) => {
              trackTiming('App', 'Initial Load', loadTime);
            })
            .catch(() => {});
        }, 0);
      });
    }
  }, []);

  // ═══════════════════════════════════════════════════════════
  // 🌐 ONLINE/OFFLINE STATUS
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Online');
      // Можно показать уведомление
    };

    const handleOffline = () => {
      console.log('📴 Offline');
      // Можно показать уведомление
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ═══════════════════════════════════════════════════════════
  // 🎨 RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <ErrorBoundary>
      <SEO 
        title="AI Resume Builder"
        description="Создайте профессиональное резюме с помощью искусственного интеллекта"
      />
      
      <Suspense 
        fallback={
          <PageLoader message="Загружаем приложение..." />
        }
      >
        <AIResumeBuilder />
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;