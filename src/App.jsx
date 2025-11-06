/**
 * src/App.jsx
 * Main Application Component
 * Production-ready with Analytics, PWA, Error Handling
 */
import React, { Suspense, lazy, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import ErrorBoundary from './components/ErrorBoundary';
import SEO from './components/SEO';
import { PageLoader } from './components/LoadingStates';
import LanguageSwitcher from './components/LanguageSwitcher';

// ═══════════════════════════════════════════════════════════
// 🎨 LAZY LOADED COMPONENTS
// ═══════════════════════════════════════════════════════════
const AIResumeBuilder = lazy(() =>
  import('./components/AIResumeBuilder').catch(() => ({
    default: () => <div className="p-6 text-center">Failed to load application. Please refresh.</div>,
  }))
);

// ═══════════════════════════════════════════════════════════
// 🚀 MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════
function App() {
  const location = useLocation();
  const { t } = useTranslation('common'); // безопасно, есть fallbackLng

  // 📄 PAGE VIEW TRACKING
  useEffect(() => {
    if (import.meta.env.PROD) {
      import('./utils/analytics.js')
        .then(({ trackPageView }) => {
          trackPageView(location.pathname + location.search, document.title);
        })
        .catch(() => {
          console.log('Analytics not available');
        });
    }
    // мягкий скролл вверх при смене страницы
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location]);

  // 📱 PWA SERVICE WORKER
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('✅ [PWA] Service Worker registered:', registration.scope);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 [PWA] New version available');
              if (window.confirm(t('pwa.update', { defaultValue: 'Доступна новая версия приложения. Обновить?' }))) {
                window.location.reload();
              }
            }
          });
        });
      } catch (error) {
        console.error('❌ [PWA] Service Worker registration failed:', error);
      }
    };

    if (document.readyState === 'complete') registerSW();
    else window.addEventListener('load', registerSW);
  }, [t]);

  // 🎯 PERFORMANCE MONITORING
  useEffect(() => {
    if (import.meta.env.PROD && window.performance?.timing) {
      const onLoad = () => {
        setTimeout(() => {
          const perfData = window.performance.timing;
          const loadTime = perfData.loadEventEnd - perfData.navigationStart;
          console.log(`⚡ Page loaded in ${loadTime}ms`);
          import('./utils/analytics.js')
            .then(({ trackTiming }) => trackTiming('App', 'Initial Load', loadTime))
            .catch(() => {});
        }, 0);
      };
      window.addEventListener('load', onLoad);
      return () => window.removeEventListener('load', onLoad);
    }
  }, []);

  // 🌐 ONLINE/OFFLINE STATUS
  useEffect(() => {
    const handleOnline = () => console.log('🌐 Online');
    const handleOffline = () => console.log('📴 Offline');
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
        description={t('seo.description', {
          defaultValue: 'Создайте профессиональное резюме с помощью искусственного интеллекта',
        })}
      />

      {/* Аксессибилити: Skip link */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-white text-blue-700 border rounded px-3 py-2 shadow"
      >
        {t('a11y.skip_to_content', { defaultValue: 'Перейти к содержимому' })}
      </a>

      {/* ─────────────── ХЕДЕР + СВИТЧЕР ЯЗЫКА ─────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/75 border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-white">🧾</span>
            <span>AI Resume</span>
          </Link>

          <nav className="flex items-center gap-4" aria-label={t('nav.main', { defaultValue: 'Основная навигация' })}>
            {/* Ссылки меняют search-параметр ?page=... чтобы соответствовать логике AIResumeBuilder */}
            <Link to="/?page=builder" className="text-gray-700 hover:text-blue-600">
              {t('nav.resume', { defaultValue: 'Резюме' })}
            </Link>
            <Link to="/?page=vacancies" className="text-gray-700 hover:text-blue-600">
              {t('nav.vacancies', { defaultValue: 'Вакансии' })}
            </Link>
            <Link to="/?page=recommendations" className="text-gray-700 hover:text-blue-600">
              {t('nav.recommendations', { defaultValue: 'Рекомендации' })}
            </Link>

            {/* 👉 Переключатель языков */}
            <div className="pl-3 border-l">
              <LanguageSwitcher />
            </div>
          </nav>
        </div>
      </header>

      {/* ─────────────── ОСНОВНОЕ СОДЕРЖИМОЕ ─────────────── */}
      <main id="main">
        <Suspense fallback={<PageLoader message={t('loading.app', { defaultValue: 'Загружаем приложение...' })} />}>
          <AIResumeBuilder />
        </Suspense>
      </main>
    </ErrorBoundary>
  );
}

export default App;
