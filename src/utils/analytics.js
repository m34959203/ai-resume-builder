/**
 * ═══════════════════════════════════════════════════════════
 * 📊 ANALYTICS & TRACKING SYSTEM
 * ═══════════════════════════════════════════════════════════
 * 
 * Google Analytics 4 + Yandex Metrika + Web Vitals
 */

const CONFIG = {
  enabled: import.meta.env.PROD && import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  debug: import.meta.env.DEV,
  
  ga: {
    measurementId: import.meta.env.VITE_GA_ID,
    enabled: !!import.meta.env.VITE_GA_ID,
  },
  
  ym: {
    counterId: import.meta.env.VITE_YM_ID,
    enabled: !!import.meta.env.VITE_YM_ID,
  },
};

const eventQueue = [];
let analyticsReady = false;

// ═══════════════════════════════════════════════════════════
// 🎬 INITIALIZATION
// ═══════════════════════════════════════════════════════════

export async function initAnalytics() {
  if (!CONFIG.enabled) {
    log('Analytics disabled');
    return;
  }

  try {
    await Promise.all([
      CONFIG.ga.enabled && initGoogleAnalytics(),
      CONFIG.ym.enabled && initYandexMetrika(),
    ].filter(Boolean));

    analyticsReady = true;
    flushEventQueue();

    initSessionTracking();
    initPerformanceTracking();
    initWebVitalsTracking();
    initErrorTracking();

    log('Analytics initialized', {
      ga: CONFIG.ga.enabled,
      ym: CONFIG.ym.enabled,
    });
  } catch (error) {
    console.error('[Analytics] Init failed:', error);
  }
}

function initGoogleAnalytics() {
  return new Promise((resolve, reject) => {
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
      });

      log('Google Analytics ready');
      resolve();
    };
    document.head.appendChild(script);
  });
}

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
      });

      log('Yandex Metrika ready');
      resolve();
    } catch (error) {
      console.error('[Analytics] YM init failed:', error);
      resolve();
    }
  });
}

// ═══════════════════════════════════════════════════════════
// 📄 TRACKING
// ═══════════════════════════════════════════════════════════

export function trackPageView(path, title = document.title, language = 'ru') {
  const data = {
    page_path: path,
    page_title: title,
    page_language: language,
  };

  if (window.gtag) {
    window.gtag('event', 'page_view', data);
  }

  if (window.ym) {
    window.ym(CONFIG.ym.counterId, 'hit', path, { title, params: { language } });
  }

  log('Page view', data);
}

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

  log('Timing', data);
}

export function trackError(error, errorInfo = {}) {
  const errorData = {
    description: error.message || String(error),
    fatal: errorInfo.fatal || false,
  };

  if (window.gtag) {
    window.gtag('event', 'exception', errorData);
  }

  if (window.ym) {
    window.ym(CONFIG.ym.counterId, 'params', { error: errorData });
  }

  console.error('[Analytics] Error tracked:', errorData);
}

// ═══════════════════════════════════════════════════════════
// 📊 EVENTS
// ═══════════════════════════════════════════════════════════

export const AnalyticsEvents = {
  RESUME_CREATED: (language = 'ru') => 
    trackEvent('Resume', 'created', `Created (${language})`, 1),
  
  RESUME_DOWNLOADED: (format, language = 'ru') => 
    trackEvent('Resume', 'downloaded', `${format} (${language})`, 1, { format, language }),
  
  AI_TRANSLATION_USED: (fromLang, toLang, wordCount) => 
    trackEvent('AI', 'translation_used', `${fromLang}_to_${toLang}`, wordCount, { fromLang, toLang }),

  LANGUAGE_CHANGED: (fromLang, toLang) => 
    trackEvent('Settings', 'language_changed', `${fromLang}_to_${toLang}`, 0, { fromLang, toLang }),

  ERROR_OCCURRED: (errorType, errorMessage) => 
    trackError(new Error(errorMessage), { errorType }),
};

// ═══════════════════════════════════════════════════════════
// 📈 WEB VITALS
// ═══════════════════════════════════════════════════════════

function initWebVitalsTracking() {
  if (!('PerformanceObserver' in window)) return;

  try {
    // LCP
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      const lcp = lastEntry.renderTime || lastEntry.loadTime;
      trackTiming('Web Vitals', 'LCP', lcp);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // FID
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const fid = entry.processingStart - entry.startTime;
        trackTiming('Web Vitals', 'FID', fid);
      });
    }).observe({ entryTypes: ['first-input'] });

    log('Web Vitals initialized');
  } catch (error) {
    console.error('[Analytics] Web Vitals failed:', error);
  }
}

// ═══════════════════════════════════════════════════════════
// 🎭 SESSION
// ═══════════════════════════════════════════════════════════

let sessionStart = Date.now();

function initSessionTracking() {
  const sessionId = getSessionId();
  trackEvent('Session', 'started', sessionId);

  window.addEventListener('beforeunload', () => {
    const duration = Math.round((Date.now() - sessionStart) / 1000);
    trackEvent('Session', 'ended', sessionId, duration);
  });

  log('Session tracking initialized');
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

function initErrorTracking() {
  window.addEventListener('error', (event) => {
    trackError(event.error || new Error(event.message), { fatal: true });
  });

  window.addEventListener('unhandledrejection', (event) => {
    trackError(event.reason || new Error('Unhandled Promise'), { fatal: false });
  });

  log('Error tracking initialized');
}

// ═══════════════════════════════════════════════════════════
// 🚀 PERFORMANCE
// ═══════════════════════════════════════════════════════════

function initPerformanceTracking() {
  if (!window.performance?.timing) return;

  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = window.performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      trackTiming('Performance', 'Page Load', pageLoadTime);
      log('Performance tracked');
    }, 0);
  });
}

// ═══════════════════════════════════════════════════════════
// 🛠️ UTILS
// ═══════════════════════════════════════════════════════════

function log(message, data = null) {
  if (CONFIG.debug) {
    console.log(`[Analytics] ${message}`, data || '');
  }
}

export function isAnalyticsReady() {
  return analyticsReady;
}

export default {
  initAnalytics,
  isAnalyticsReady,
  trackPageView,
  trackEvent,
  trackTiming,
  trackError,
  AnalyticsEvents,
};