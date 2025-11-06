/**
 * ═══════════════════════════════════════════════════════════
 * 📊 PRODUCTION ANALYTICS & TRACKING SYSTEM
 * ═══════════════════════════════════════════════════════════
 * 
 * Поддержка:
 * - Google Analytics 4 (GA4)
 * - Yandex Metrika (для СНГ)
 * - Sentry (опциональный - мониторинг ошибок)
 * - Custom Events
 * - Web Vitals
 * - Session Tracking
 * - Multi-language support
 */

// ═══════════════════════════════════════════════════════════
// 🔧 CONFIGURATION
// ═══════════════════════════════════════════════════════════

const CONFIG = {
  enabled: import.meta.env.PROD && import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  debug: import.meta.env.DEV,
  
  // Google Analytics
  ga: {
    measurementId: import.meta.env.VITE_GA_ID,
    enabled: !!import.meta.env.VITE_GA_ID,
  },
  
  // Yandex Metrika (важно для СНГ)
  ym: {
    counterId: import.meta.env.VITE_YM_ID,
    enabled: !!import.meta.env.VITE_YM_ID,
  },
  
  // Sentry (ОПЦИОНАЛЬНЫЙ - только если установлен пакет)
  sentry: {
    dsn: import.meta.env.VITE_SENTRY_DSN,
    enabled: !!import.meta.env.VITE_SENTRY_DSN,
  },
};

// Внутренний стор
const eventQueue = [];
let analyticsReady = false;

// ═══════════════════════════════════════════════════════════
// 🎬 INITIALIZATION
// ═══════════════════════════════════════════════════════════

/**
 * Инициализация всех систем аналитики
 */
export async function initAnalytics() {
  if (!CONFIG.enabled) {
    log('Analytics disabled in current environment');
    return;
  }

  try {
    // Параллельная инициализация
    await Promise.all([
      CONFIG.ga.enabled && initGoogleAnalytics(),
      CONFIG.ym.enabled && initYandexMetrika(),
      CONFIG.sentry.enabled && initSentry(), // ✅ Опциональный
    ].filter(Boolean));

    analyticsReady = true;
    flushEventQueue();

    // Дополнительные треккеры
    initSessionTracking();
    initPerformanceTracking();
    initWebVitalsTracking();
    initErrorTracking();

    log('Analytics initialized successfully', {
      ga: CONFIG.ga.enabled,
      ym: CONFIG.ym.enabled,
      sentry: CONFIG.sentry.enabled,
    });
  } catch (error) {
    console.error('[Analytics] Initialization failed:', error);
  }
}

/**
 * Google Analytics 4
 */
function initGoogleAnalytics() {
  return new Promise((resolve, reject) => {
    try {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.ga.measurementId}`;
      script.onerror = reject;
      script.onload = () => {
        window.dataLayer = window.dataLayer || [];
        function gtag() {
          window.dataLayer.push(arguments);
        }
        window.gtag = gtag;

        gtag('js', new Date());
        gtag('config', CONFIG.ga.measurementId, {
          send_page_view: false,
          anonymize_ip: true,
          cookie_flags: 'SameSite=None;Secure',
        });

        log('Google Analytics initialized');
        resolve();
      };

      document.head.appendChild(script);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Yandex Metrika
 */
function initYandexMetrika() {
  return new Promise((resolve) => {
    try {
      (function(m, e, t, r, i, k, a) {
        m[i] = m[i] || function() {
          (m[i].a = m[i].a || []).push(arguments);
        };
        m[i].l = 1 * new Date();
        k = e.createElement(t);
        a = e.getElementsByTagName(t)[0];
        k.async = 1;
        k.src = r;
        a.parentNode.insertBefore(k, a);
      })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');

      window.ym(CONFIG.ym.counterId, 'init', {
        clickmap: true,
        trackLinks: true,
        accurateTrackBounce: true,
        webvisor: true,
        trackHash: true,
        ecommerce: 'dataLayer',
      });

      log('Yandex Metrika initialized');
      resolve();
    } catch (error) {
      console.error('[Analytics] Yandex Metrika init failed:', error);
      resolve();
    }
  });
}

/**
 * Sentry (ОПЦИОНАЛЬНЫЙ - динамический импорт)
 */
async function initSentry() {
  try {
    // ✅ ИСПРАВЛЕНО: Динамический импорт с обработкой ошибок
    const [SentryModule, TracingModule] = await Promise.all([
      import('@sentry/react').catch(() => null),
      import('@sentry/tracing').catch(() => null),
    ]);

    // Если пакеты не установлены - пропускаем
    if (!SentryModule || !TracingModule) {
      log('Sentry packages not installed, skipping');
      return;
    }

    const Sentry = SentryModule;
    const { BrowserTracing } = TracingModule;

    Sentry.init({
      dsn: CONFIG.sentry.dsn,
      environment: import.meta.env.MODE,
      integrations: [new BrowserTracing()],
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      beforeSend(event) {
        // Фильтрация чувствительных данных
        if (event.request?.cookies) {
          delete event.request.cookies;
        }
        return event;
      },
    });

    window.Sentry = Sentry;
    log('Sentry initialized');
  } catch (error) {
    log('Sentry init failed (packages not installed)', error.message);
  }
}

// ═══════════════════════════════════════════════════════════
// 📄 PAGE TRACKING
// ═══════════════════════════════════════════════════════════

export function trackPageView(path, title = document.title, language = 'ru') {
  const data = {
    page_path: path,
    page_title: title,
    page_language: language,
    page_location: window.location.href,
  };

  if (window.gtag) {
    window.gtag('event', 'page_view', data);
  }

  if (window.ym) {
    window.ym(CONFIG.ym.counterId, 'hit', path, {
      title: title,
      params: { language },
    });
  }

  log('Page view', data);
}

// ═══════════════════════════════════════════════════════════
// 🎯 EVENT TRACKING
// ═══════════════════════════════════════════════════════════

export function trackEvent(category, action, label = '', value = 0, params = {}) {
  if (!CONFIG.enabled && !CONFIG.debug) return;

  const eventData = {
    event_category: category,
    event_label: label,
    value: value,
    ...params,
  };

  if (analyticsReady) {
    sendEvent(action, eventData);
  } else {
    eventQueue.push({ action, data: eventData });
  }
}

function sendEvent(action, data) {
  if (window.gtag) {
    window.gtag('event', action, data);
  }

  if (window.ym) {
    window.ym(CONFIG.ym.counterId, 'reachGoal', action, data);
  }

  log('Event', { action, ...data });
}

function flushEventQueue() {
  while (eventQueue.length > 0) {
    const { action, data } = eventQueue.shift();
    sendEvent(action, data);
  }
}

// ═══════════════════════════════════════════════════════════
// 📊 PREDEFINED EVENTS
// ═══════════════════════════════════════════════════════════

export const AnalyticsEvents = {
  // RESUME BUILDER
  RESUME_CREATED: (language = 'ru') => 
    trackEvent('Resume', 'created', `Resume Created (${language})`, 1),
  
  RESUME_DOWNLOADED: (format, language = 'ru') => 
    trackEvent('Resume', 'downloaded', `${format.toUpperCase()} (${language})`, 1, { format, language }),
  
  TEMPLATE_SELECTED: (template, language = 'ru') => 
    trackEvent('Resume', 'template_selected', template, 0, { template, language }),

  // AI FEATURES
  AI_RECOMMENDATION_REQUESTED: (section = 'general') => 
    trackEvent('AI', 'recommendation_requested', section),
  
  AI_TRANSLATION_USED: (fromLang, toLang, wordCount) => 
    trackEvent('AI', 'translation_used', `${fromLang}_to_${toLang}`, wordCount, { 
      fromLang, 
      toLang, 
      wordCount 
    }),

  // LANGUAGE
  LANGUAGE_CHANGED: (fromLang, toLang) => 
    trackEvent('Settings', 'language_changed', `${fromLang}_to_${toLang}`, 0, { 
      fromLang, 
      toLang 
    }),

  // ERRORS
  ERROR_OCCURRED: (errorType, errorMessage) => 
    trackError(new Error(errorMessage), { errorType }),
  
  API_ERROR: (endpoint, statusCode, message) => 
    trackEvent('Error', 'api_error', endpoint, statusCode, { message }),
};

// ═══════════════════════════════════════════════════════════
// ⏱️ TIMING & PERFORMANCE
// ═══════════════════════════════════════════════════════════

export function trackTiming(category, variable, time, label = '') {
  if (!CONFIG.enabled && !CONFIG.debug) return;

  const data = {
    name: variable,
    value: Math.round(time),
    event_category: category,
    event_label: label,
  };

  if (window.gtag) {
    window.gtag('event', 'timing_complete', data);
  }

  if (window.ym) {
    window.ym(CONFIG.ym.counterId, 'params', {
      timing: { [category]: { [variable]: time } }
    });
  }

  log('Timing', data);
}

// ═══════════════════════════════════════════════════════════
// 📈 WEB VITALS
// ═══════════════════════════════════════════════════════════

function initWebVitalsTracking() {
  if (!('PerformanceObserver' in window)) return;

  observeLCP();
  observeFID();
  observeCLS();

  log('Web Vitals tracking initialized');
}

function observeLCP() {
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      const lcp = lastEntry.renderTime || lastEntry.loadTime;

      trackTiming('Web Vitals', 'LCP', lcp);

      const rating = lcp < 2500 ? 'good' : lcp < 4000 ? 'needs-improvement' : 'poor';
      trackEvent('Web Vitals', 'LCP', rating, Math.round(lcp));
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (error) {
    console.error('LCP observation failed:', error);
  }
}

function observeFID() {
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const fid = entry.processingStart - entry.startTime;
        trackTiming('Web Vitals', 'FID', fid);

        const rating = fid < 100 ? 'good' : fid < 300 ? 'needs-improvement' : 'poor';
        trackEvent('Web Vitals', 'FID', rating, Math.round(fid));
      });
    });

    observer.observe({ entryTypes: ['first-input'] });
  } catch (error) {
    console.error('FID observation failed:', error);
  }
}

function observeCLS() {
  try {
    let clsValue = 0;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
    });

    observer.observe({ entryTypes: ['layout-shift'] });

    window.addEventListener('pagehide', () => {
      trackTiming('Web Vitals', 'CLS', clsValue * 1000);

      const rating = clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor';
      trackEvent('Web Vitals', 'CLS', rating, Math.round(clsValue * 1000));
    }, { once: true });
  } catch (error) {
    console.error('CLS observation failed:', error);
  }
}

// ═══════════════════════════════════════════════════════════
// 🎭 SESSION TRACKING
// ═══════════════════════════════════════════════════════════

let sessionStart = Date.now();
let lastActivityTime = Date.now();

function initSessionTracking() {
  const sessionId = getSessionId();

  trackEvent('Session', 'started', sessionId);

  const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  
  activityEvents.forEach((eventType) => {
    document.addEventListener(eventType, () => {
      lastActivityTime = Date.now();
    }, { passive: true });
  });

  window.addEventListener('beforeunload', () => {
    const sessionDuration = Math.round((lastActivityTime - sessionStart) / 1000);
    trackEvent('Session', 'ended', sessionId, sessionDuration);
  });

  log('Session tracking initialized', { sessionId });
}

function getSessionId() {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  
  if (!sessionId) {
    sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  
  return sessionId;
}

// ═══════════════════════════════════════════════════════════
// ⚠️ ERROR TRACKING
// ═══════════════════════════════════════════════════════════

export function trackError(error, errorInfo = {}) {
  const errorData = {
    description: error.message || String(error),
    fatal: errorInfo.fatal || false,
    stack: error.stack,
    ...errorInfo,
  };

  if (window.gtag) {
    window.gtag('event', 'exception', {
      description: errorData.description,
      fatal: errorData.fatal,
    });
  }

  if (window.ym) {
    window.ym(CONFIG.ym.counterId, 'params', {
      error: errorData
    });
  }

  // ✅ ИСПРАВЛЕНО: Проверка существования Sentry
  if (window.Sentry) {
    if (errorData.fatal) {
      window.Sentry.captureException(error, {
        extra: errorInfo
      });
    } else {
      window.Sentry.captureMessage(errorData.description, {
        level: 'error',
        extra: errorInfo
      });
    }
  }

  console.error('[Analytics] Error tracked:', errorData);
}

function initErrorTracking() {
  window.addEventListener('error', (event) => {
    trackError(event.error || new Error(event.message), {
      fatal: true,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    trackError(event.reason || new Error('Unhandled Promise Rejection'), {
      fatal: false,
      type: 'unhandledrejection',
    });
  });

  log('Error tracking initialized');
}

// ═══════════════════════════════════════════════════════════
// 🚀 PERFORMANCE MONITORING
// ═══════════════════════════════════════════════════════════

function initPerformanceTracking() {
  if (!window.performance || !window.performance.timing) return;

  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = window.performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      const domReadyTime = perfData.domContentLoadedEventEnd - perfData.navigationStart;

      trackTiming('Performance', 'Page Load Time', pageLoadTime);
      trackTiming('Performance', 'DOM Ready Time', domReadyTime);

      log('Performance metrics tracked', {
        pageLoadTime,
        domReadyTime,
      });
    }, 0);
  });
}

// ═══════════════════════════════════════════════════════════
// 🛠️ UTILITIES
// ═══════════════════════════════════════════════════════════

function log(message, data = null) {
  if (CONFIG.debug) {
    console.log(`[Analytics] ${message}`, data || '');
  }
}

export function isAnalyticsReady() {
  return analyticsReady;
}

// ═══════════════════════════════════════════════════════════
// 📤 EXPORT
// ═══════════════════════════════════════════════════════════

export default {
  initAnalytics,
  isAnalyticsReady,
  trackPageView,
  trackEvent,
  trackTiming,
  trackError,
  AnalyticsEvents,
};