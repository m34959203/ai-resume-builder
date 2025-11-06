/**
 * ═══════════════════════════════════════════════════════════
 * 📊 PRODUCTION ANALYTICS & TRACKING SYSTEM
 * ═══════════════════════════════════════════════════════════
 * 
 * Поддержка:
 * - Google Analytics 4 (GA4)
 * - Yandex Metrika (для СНГ)
 * - Sentry (мониторинг ошибок)
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
  
  // Sentry
  sentry: {
    dsn: import.meta.env.VITE_SENTRY_DSN,
    enabled: !!import.meta.env.VITE_SENTRY_DSN,
  },
};

// Внутренний стор для отложенных событий
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
    console.log('[Analytics] Disabled in current environment');
    return;
  }

  try {
    // Параллельная инициализация всех сервисов
    await Promise.all([
      CONFIG.ga.enabled && initGoogleAnalytics(),
      CONFIG.ym.enabled && initYandexMetrika(),
      CONFIG.sentry.enabled && initSentry(),
    ].filter(Boolean));

    analyticsReady = true;

    // Отправка отложенных событий
    flushEventQueue();

    // Инициализация дополнительных треккеров
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
          send_page_view: false, // Manual tracking
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
 * Yandex Metrika (критично для СНГ рынка)
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
      resolve(); // Не блокируем другие сервисы
    }
  });
}

/**
 * Sentry для мониторинга ошибок
 */
async function initSentry() {
  try {
    const Sentry = await import('@sentry/react');
    const { BrowserTracing } = await import('@sentry/tracing');

    Sentry.init({
      dsn: CONFIG.sentry.dsn,
      environment: import.meta.env.MODE,
      integrations: [new BrowserTracing()],
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      beforeSend(event, hint) {
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
    console.error('[Analytics] Sentry init failed:', error);
  }
}

// ═══════════════════════════════════════════════════════════
// 📄 PAGE TRACKING
// ═══════════════════════════════════════════════════════════

/**
 * Трекинг просмотра страницы
 */
export function trackPageView(path, title = document.title, language = 'ru') {
  const data = {
    page_path: path,
    page_title: title,
    page_language: language,
    page_location: window.location.href,
  };

  // Google Analytics
  if (window.gtag) {
    window.gtag('event', 'page_view', data);
  }

  // Yandex Metrika
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

/**
 * Универсальный трекинг событий
 */
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
    // Добавить в очередь если аналитика еще не готова
    eventQueue.push({ action, data: eventData });
  }
}

/**
 * Отправка события во все системы
 */
function sendEvent(action, data) {
  // Google Analytics
  if (window.gtag) {
    window.gtag('event', action, data);
  }

  // Yandex Metrika
  if (window.ym) {
    window.ym(CONFIG.ym.counterId, 'reachGoal', action, data);
  }

  log('Event', { action, ...data });
}

/**
 * Отправка отложенных событий
 */
function flushEventQueue() {
  while (eventQueue.length > 0) {
    const { action, data } = eventQueue.shift();
    sendEvent(action, data);
  }
}

// ═══════════════════════════════════════════════════════════
// 📊 PREDEFINED EVENTS (Специфичные для резюме-билдера)
// ═══════════════════════════════════════════════════════════

export const AnalyticsEvents = {
  // ──────────────────────────────────────────────────────────
  // 📝 RESUME BUILDER
  // ──────────────────────────────────────────────────────────
  
  RESUME_CREATED: (language = 'ru') => 
    trackEvent('Resume', 'created', `Resume Created (${language})`, 1),
  
  RESUME_EDITED: (step, language = 'ru') => 
    trackEvent('Resume', 'edited', `Step ${step}`, 0, { language }),
  
  RESUME_SAVED: (isAutoSave = false) => 
    trackEvent('Resume', 'saved', isAutoSave ? 'Auto Save' : 'Manual Save'),
  
  RESUME_DOWNLOADED: (format, language = 'ru') => 
    trackEvent('Resume', 'downloaded', `${format.toUpperCase()} (${language})`, 1, { format, language }),
  
  RESUME_SHARED: (method) => 
    trackEvent('Resume', 'shared', method, 1),
  
  RESUME_DELETED: () => 
    trackEvent('Resume', 'deleted', 'Resume Deleted'),
  
  TEMPLATE_SELECTED: (template, language = 'ru') => 
    trackEvent('Resume', 'template_selected', template, 0, { template, language }),
  
  TEMPLATE_CUSTOMIZED: (template, customizations) => 
    trackEvent('Resume', 'template_customized', template, 0, { customizations }),
  
  SECTION_ADDED: (sectionType) => 
    trackEvent('Resume', 'section_added', sectionType),
  
  SECTION_REMOVED: (sectionType) => 
    trackEvent('Resume', 'section_removed', sectionType),
  
  SECTION_REORDERED: () => 
    trackEvent('Resume', 'section_reordered', 'Sections Reordered'),

  // ──────────────────────────────────────────────────────────
  // 🤖 AI FEATURES
  // ──────────────────────────────────────────────────────────
  
  AI_RECOMMENDATION_REQUESTED: (section = 'general') => 
    trackEvent('AI', 'recommendation_requested', section),
  
  AI_RECOMMENDATION_RECEIVED: (section, responseTime) => 
    trackEvent('AI', 'recommendation_received', section, responseTime, { responseTime }),
  
  AI_RECOMMENDATION_APPLIED: (section, type) => 
    trackEvent('AI', 'recommendation_applied', `${section}_${type}`, 1),
  
  AI_RECOMMENDATION_DISMISSED: (section) => 
    trackEvent('AI', 'recommendation_dismissed', section),
  
  AI_SUGGESTION_ACCEPTED: (type, field) => 
    trackEvent('AI', 'suggestion_accepted', `${type}_${field}`, 1),
  
  AI_SUGGESTION_REJECTED: (type) => 
    trackEvent('AI', 'suggestion_rejected', type),
  
  AI_CONTENT_GENERATED: (section, wordCount) => 
    trackEvent('AI', 'content_generated', section, wordCount, { wordCount }),
  
  AI_TRANSLATION_USED: (fromLang, toLang, wordCount) => 
    trackEvent('AI', 'translation_used', `${fromLang}_to_${toLang}`, wordCount, { 
      fromLang, 
      toLang, 
      wordCount 
    }),
  
  AI_ERROR: (errorType, context) => 
    trackEvent('AI', 'error', errorType, 0, { context }),

  // ──────────────────────────────────────────────────────────
  // 💼 JOB SEARCH & HH INTEGRATION
  // ──────────────────────────────────────────────────────────
  
  JOB_SEARCHED: (query, resultsCount) => 
    trackEvent('Jobs', 'searched', query, resultsCount),
  
  JOB_VIEWED: (jobId, source = 'hh') => 
    trackEvent('Jobs', 'viewed', jobId, 0, { source }),
  
  JOB_APPLIED: (jobId, source = 'hh') => 
    trackEvent('Jobs', 'applied', jobId, 1, { source }),
  
  JOB_SAVED: (jobId) => 
    trackEvent('Jobs', 'saved', jobId),
  
  FILTER_APPLIED: (filterType, filterValue) => 
    trackEvent('Jobs', 'filter_applied', filterType, 0, { filterValue }),
  
  VACANCY_LIST_VIEWED: (count, language = 'ru') => 
    trackEvent('Jobs', 'vacancy_list_viewed', `${count} vacancies`, count, { language }),

  // ──────────────────────────────────────────────────────────
  // 🔗 HEADHUNTER IMPORT
  // ──────────────────────────────────────────────────────────
  
  HH_AUTH_STARTED: () => 
    trackEvent('Import', 'hh_auth_started', 'HH Authorization Started'),
  
  HH_AUTH_COMPLETED: () => 
    trackEvent('Import', 'hh_auth_completed', 'HH Authorization Completed', 1),
  
  HH_AUTH_FAILED: (reason) => 
    trackEvent('Import', 'hh_auth_failed', reason),
  
  HH_IMPORT_STARTED: () => 
    trackEvent('Import', 'hh_import_started', 'HH Import Started'),
  
  HH_IMPORT_COMPLETED: (itemsImported) => 
    trackEvent('Import', 'hh_import_completed', 'HH Import Completed', itemsImported),
  
  HH_IMPORT_FAILED: (reason) => 
    trackEvent('Import', 'hh_import_failed', reason),
  
  HH_DATA_MERGED: (mergeType) => 
    trackEvent('Import', 'hh_data_merged', mergeType),

  // ──────────────────────────────────────────────────────────
  // 🎓 COURSES & RECOMMENDATIONS
  // ──────────────────────────────────────────────────────────
  
  COURSE_VIEWED: (courseId, courseName) => 
    trackEvent('Courses', 'viewed', courseId, 0, { courseName }),
  
  COURSE_CLICKED: (courseId, courseName, provider) => 
    trackEvent('Courses', 'clicked', courseId, 1, { courseName, provider }),
  
  COURSE_RECOMMENDATION_REQUESTED: (skillGap) => 
    trackEvent('Courses', 'recommendation_requested', skillGap),
  
  COURSE_ADDED_TO_RESUME: (courseId) => 
    trackEvent('Courses', 'added_to_resume', courseId, 1),

  // ──────────────────────────────────────────────────────────
  // 🌍 LANGUAGE & LOCALIZATION
  // ──────────────────────────────────────────────────────────
  
  LANGUAGE_CHANGED: (fromLang, toLang) => 
    trackEvent('Settings', 'language_changed', `${fromLang}_to_${toLang}`, 0, { 
      fromLang, 
      toLang 
    }),
  
  RESUME_LANGUAGE_CHANGED: (language) => 
    trackEvent('Settings', 'resume_language_changed', language),
  
  MULTI_LANGUAGE_RESUME_CREATED: (languages) => 
    trackEvent('Settings', 'multi_language_resume', languages.join(','), languages.length),

  // ──────────────────────────────────────────────────────────
  // 🧭 NAVIGATION
  // ──────────────────────────────────────────────────────────
  
  NAV_TO_BUILDER: () => 
    trackEvent('Navigation', 'to_builder', 'Navigate to Builder'),
  
  NAV_TO_VACANCIES: () => 
    trackEvent('Navigation', 'to_vacancies', 'Navigate to Vacancies'),
  
  NAV_TO_RECOMMENDATIONS: () => 
    trackEvent('Navigation', 'to_recommendations', 'Navigate to Recommendations'),
  
  NAV_TO_COURSES: () => 
    trackEvent('Navigation', 'to_courses', 'Navigate to Courses'),
  
  EXTERNAL_LINK_CLICKED: (url, label) => 
    trackOutboundLink(url, label),

  // ──────────────────────────────────────────────────────────
  // ⚠️ ERRORS
  // ──────────────────────────────────────────────────────────
  
  ERROR_OCCURRED: (errorType, errorMessage) => 
    trackError(new Error(errorMessage), { errorType }),
  
  ERROR_BOUNDARY_TRIGGERED: (component, errorInfo) => 
    trackError(new Error(`Error Boundary: ${component}`), { 
      component, 
      fatal: true,
      ...errorInfo 
    }),
  
  API_ERROR: (endpoint, statusCode, message) => 
    trackEvent('Error', 'api_error', endpoint, statusCode, { message }),
  
  VALIDATION_ERROR: (field, errorType) => 
    trackEvent('Error', 'validation_error', `${field}_${errorType}`),

  // ──────────────────────────────────────────────────────────
  // 👤 USER ENGAGEMENT
  // ──────────────────────────────────────────────────────────
  
  USER_REGISTERED: (method = 'email') => 
    trackConversion('registration', method),
  
  USER_LOGGED_IN: (method = 'email') => 
    trackEvent('User', 'logged_in', method, 1),
  
  USER_LOGGED_OUT: () => 
    trackEvent('User', 'logged_out'),
  
  FEATURE_DISCOVERED: (featureName) => 
    trackEvent('Engagement', 'feature_discovered', featureName),
  
  HELP_VIEWED: (topic) => 
    trackEvent('Engagement', 'help_viewed', topic),
  
  FEEDBACK_SUBMITTED: (rating, category) => 
    trackEvent('Engagement', 'feedback_submitted', category, rating),
  
  SHARE_BUTTON_CLICKED: (platform) => 
    trackEvent('Engagement', 'share_clicked', platform),
};

// ═══════════════════════════════════════════════════════════
// ⏱️ TIMING & PERFORMANCE
// ═══════════════════════════════════════════════════════════

/**
 * Трекинг времени выполнения операций
 */
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

/**
 * Измерение синхронной операции
 */
export function measureOperation(name, operation) {
  const startTime = performance.now();
  
  try {
    const result = operation();
    const duration = performance.now() - startTime;
    
    trackTiming('Performance', name, duration);
    
    return result;
  } catch (error) {
    trackError(error, { operation: name });
    throw error;
  }
}

/**
 * Измерение асинхронной операции
 */
export async function measureAsyncOperation(name, operation) {
  const startTime = performance.now();
  
  try {
    const result = await operation();
    const duration = performance.now() - startTime;
    
    trackTiming('Performance', name, duration);
    
    return result;
  } catch (error) {
    trackError(error, { operation: name });
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════
// 📈 WEB VITALS
// ═══════════════════════════════════════════════════════════

/**
 * Инициализация трекинга Web Vitals
 */
function initWebVitalsTracking() {
  if (!('PerformanceObserver' in window)) return;

  // Largest Contentful Paint (LCP)
  observeLCP();
  
  // First Input Delay (FID)
  observeFID();
  
  // Cumulative Layout Shift (CLS)
  observeCLS();
  
  // First Contentful Paint (FCP)
  observeFCP();
  
  // Time to First Byte (TTFB)
  observeTTFB();

  log('Web Vitals tracking initialized');
}

function observeLCP() {
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      const lcp = lastEntry.renderTime || lastEntry.loadTime;

      trackTiming('Web Vitals', 'LCP', lcp);

      // Рейтинг: good < 2500, needs improvement < 4000, poor >= 4000
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

        // Рейтинг: good < 100, needs improvement < 300, poor >= 300
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
    let clsEntries = [];

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          clsEntries.push(entry);
        }
      }
    });

    observer.observe({ entryTypes: ['layout-shift'] });

    // Отправка при выгрузке страницы
    window.addEventListener('pagehide', () => {
      trackTiming('Web Vitals', 'CLS', clsValue * 1000);

      // Рейтинг: good < 0.1, needs improvement < 0.25, poor >= 0.25
      const rating = clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor';
      trackEvent('Web Vitals', 'CLS', rating, Math.round(clsValue * 1000));
    }, { once: true });
  } catch (error) {
    console.error('CLS observation failed:', error);
  }
}

function observeFCP() {
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          trackTiming('Web Vitals', 'FCP', entry.startTime);
        }
      });
    });

    observer.observe({ entryTypes: ['paint'] });
  } catch (error) {
    console.error('FCP observation failed:', error);
  }
}

function observeTTFB() {
  try {
    const navigationEntry = performance.getEntriesByType('navigation')[0];
    if (navigationEntry) {
      const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
      trackTiming('Web Vitals', 'TTFB', ttfb);

      // Рейтинг: good < 800, needs improvement < 1800, poor >= 1800
      const rating = ttfb < 800 ? 'good' : ttfb < 1800 ? 'needs-improvement' : 'poor';
      trackEvent('Web Vitals', 'TTFB', rating, Math.round(ttfb));
    }
  } catch (error) {
    console.error('TTFB observation failed:', error);
  }
}

// ═══════════════════════════════════════════════════════════
// 🎭 SESSION TRACKING
// ═══════════════════════════════════════════════════════════

let sessionStart = Date.now();
let lastActivityTime = Date.now();
let pageViewCount = 0;
let eventCount = 0;

/**
 * Инициализация трекинга сессии
 */
function initSessionTracking() {
  // ID сессии
  const sessionId = getSessionId();
  setUserProperty('session_id', sessionId);

  // Начало сессии
  trackEvent('Session', 'started', sessionId);

  // Отслеживание активности
  const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
  
  const updateActivity = () => {
    lastActivityTime = Date.now();
  };

  activityEvents.forEach((eventType) => {
    document.addEventListener(eventType, updateActivity, { passive: true });
  });

  // Периодическое сохранение состояния сессии
  setInterval(() => {
    const sessionDuration = Math.round((lastActivityTime - sessionStart) / 1000);
    const isActive = (Date.now() - lastActivityTime) < 30000; // Активен если был клик < 30 сек назад

    if (isActive) {
      setUserProperty('session_duration', sessionDuration);
      setUserProperty('page_views', pageViewCount);
      setUserProperty('events_count', eventCount);
    }
  }, 30000); // Каждые 30 секунд

  // Окончание сессии
  window.addEventListener('beforeunload', () => {
    const sessionDuration = Math.round((lastActivityTime - sessionStart) / 1000);
    
    trackEngagement('session_end', sessionDuration);
    trackEvent('Session', 'ended', sessionId, sessionDuration, {
      duration: sessionDuration,
      pageViews: pageViewCount,
      events: eventCount,
    });

    // Beacon API для гарантированной отправки
    sendBeacon('session_end', {
      session_id: sessionId,
      duration: sessionDuration,
      page_views: pageViewCount,
      events: eventCount,
    });
  });

  log('Session tracking initialized', { sessionId });
}

/**
 * Получение ID сессии
 */
function getSessionId() {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  
  if (!sessionId) {
    sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  
  return sessionId;
}

/**
 * Трекинг вовлеченности
 */
export function trackEngagement(action, duration = 0) {
  if (!CONFIG.enabled && !CONFIG.debug) return;

  const data = {
    engagement_time_msec: duration,
    action: action,
  };

  if (window.gtag) {
    window.gtag('event', 'user_engagement', data);
  }

  if (window.ym) {
    window.ym(CONFIG.ym.counterId, 'params', {
      engagement: { [action]: duration }
    });
  }

  log('Engagement', data);
}

/**
 * Отправка через Beacon API (гарантированная доставка при закрытии вкладки)
 */
function sendBeacon(event, data) {
  if (!navigator.sendBeacon) return;

  const payload = JSON.stringify({
    event,
    data,
    timestamp: Date.now(),
  });

  // Google Analytics endpoint
  if (window.gtag && CONFIG.ga.enabled) {
    const gaUrl = `https://www.google-analytics.com/collect?v=1&tid=${CONFIG.ga.measurementId}&cid=${getSessionId()}&t=event&ec=Session&ea=${event}`;
    navigator.sendBeacon(gaUrl);
  }

  // Custom endpoint (если есть)
  const customEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
  if (customEndpoint) {
    navigator.sendBeacon(customEndpoint, payload);
  }
}

// ═══════════════════════════════════════════════════════════
// 🔄 CONVERSIONS
// ═══════════════════════════════════════════════════════════

/**
 * Трекинг конверсий
 */
export function trackConversion(conversionType, value = 0, currency = 'USD') {
  if (!CONFIG.enabled && !CONFIG.debug) return;

  const data = {
    conversion_type: conversionType,
    value: value,
    currency: currency,
    timestamp: Date.now(),
  };

  if (window.gtag) {
    window.gtag('event', 'conversion', data);
  }

  if (window.ym) {
    window.ym(CONFIG.ym.counterId, 'reachGoal', `conversion_${conversionType}`, {
      order_price: value,
      currency: currency,
    });
  }

  log('Conversion', data);
}

// ═══════════════════════════════════════════════════════════
// 🔗 OUTBOUND LINKS
// ═══════════════════════════════════════════════════════════

/**
 * Трекинг внешних ссылок
 */
export function trackOutboundLink(url, label = '') {
  if (!CONFIG.enabled && !CONFIG.debug) return;

  const data = {
    event_category: 'Outbound Link',
    event_label: label || url,
    transport_type: 'beacon',
    link_url: url,
  };

  if (window.gtag) {
    window.gtag('event', 'click', data);
  }

  if (window.ym) {
    window.ym(CONFIG.ym.counterId, 'extLink', url);
  }

  log('Outbound link', data);
}

/**
 * Автоматический трекинг внешних ссылок
 */
export function initOutboundLinkTracking() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    
    if (!link) return;
    
    const href = link.getAttribute('href');
    
    if (!href) return;
    
    // Проверка на внешнюю ссылку
    if (href.startsWith('http') && !href.includes(window.location.hostname)) {
      trackOutboundLink(href, link.textContent.trim());
    }
  });
}

// ═══════════════════════════════════════════════════════════
// ⚠️ ERROR TRACKING
// ═══════════════════════════════════════════════════════════

/**
 * Трекинг ошибок
 */
export function trackError(error, errorInfo = {}) {
  const errorData = {
    description: error.message || String(error),
    fatal: errorInfo.fatal || false,
    stack: error.stack,
    ...errorInfo,
  };

  // Google Analytics
  if (window.gtag) {
    window.gtag('event', 'exception', {
      description: errorData.description,
      fatal: errorData.fatal,
    });
  }

  // Yandex Metrika
  if (window.ym) {
    window.ym(CONFIG.ym.counterId, 'params', {
      error: errorData
    });
  }

  // Sentry
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

/**
 * Глобальный обработчик ошибок
 */
function initErrorTracking() {
  // Необработанные исключения
  window.addEventListener('error', (event) => {
    trackError(event.error || new Error(event.message), {
      fatal: true,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // Необработанные Promise rejection
  window.addEventListener('unhandledrejection', (event) => {
    trackError(event.reason || new Error('Unhandled Promise Rejection'), {
      fatal: false,
      type: 'unhandledrejection',
    });
  });

  log('Error tracking initialized');
}

// ═══════════════════════════════════════════════════════════
// 👤 USER PROPERTIES
// ═══════════════════════════════════════════════════════════

/**
 * Установка свойств пользователя
 */
export function setUserProperty(property, value) {
  if (!CONFIG.enabled && !CONFIG.debug) return;

  // Google Analytics
  if (window.gtag) {
    window.gtag('set', 'user_properties', {
      [property]: value,
    });
  }

  // Yandex Metrika
  if (window.ym) {
    window.ym(CONFIG.ym.counterId, 'userParams', {
      [property]: value,
    });
  }

  log('User property set', { property, value });
}

/**
 * Установка ID пользователя
 */
export function setUserId(userId) {
  if (!CONFIG.enabled && !CONFIG.debug) return;

  // Google Analytics
  if (window.gtag) {
    window.gtag('config', CONFIG.ga.measurementId, {
      user_id: userId,
    });
  }

  // Yandex Metrika
  if (window.ym) {
    window.ym(CONFIG.ym.counterId, 'setUserID', userId);
  }

  // Sentry
  if (window.Sentry) {
    window.Sentry.setUser({ id: userId });
  }

  log('User ID set', userId);
}

// ═══════════════════════════════════════════════════════════
// 🚀 PERFORMANCE MONITORING
// ═══════════════════════════════════════════════════════════

/**
 * Трекинг производительности страницы
 */
function initPerformanceTracking() {
  if (!window.performance || !window.performance.timing) return;

  window.addEventListener('load', () => {
    // Небольшая задержка для точности измерений
    setTimeout(() => {
      const perfData = window.performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      const domReadyTime = perfData.domContentLoadedEventEnd - perfData.navigationStart;
      const connectTime = perfData.responseEnd - perfData.requestStart;
      const renderTime = perfData.domComplete - perfData.domLoading;
      const dnsTime = perfData.domainLookupEnd - perfData.domainLookupStart;

      // Отправка метрик
      trackTiming('Performance', 'Page Load Time', pageLoadTime);
      trackTiming('Performance', 'DOM Ready Time', domReadyTime);
      trackTiming('Performance', 'Server Response Time', connectTime);
      trackTiming('Performance', 'DOM Render Time', renderTime);
      trackTiming('Performance', 'DNS Lookup Time', dnsTime);

      // Resource Timing
      const resources = window.performance.getEntriesByType('resource');
      const slowResources = resources.filter(r => r.duration > 1000);
      
      if (slowResources.length > 0) {
        slowResources.forEach(resource => {
          trackEvent('Performance', 'slow_resource', resource.name, Math.round(resource.duration));
        });
      }

      log('Performance metrics tracked', {
        pageLoadTime,
        domReadyTime,
        connectTime,
        renderTime,
        dnsTime,
      });
    }, 0);
  });
}

// ═══════════════════════════════════════════════════════════
// 🛠️ UTILITIES
// ═══════════════════════════════════════════════════════════

/**
 * Логирование (только в dev)
 */
function log(message, data = null) {
  if (CONFIG.debug) {
    console.log(`[Analytics] ${message}`, data || '');
  }
}

/**
 * Проверка готовности аналитики
 */
export function isAnalyticsReady() {
  return analyticsReady;
}

/**
 * Получение конфигурации
 */
export function getAnalyticsConfig() {
  return { ...CONFIG };
}

// ═══════════════════════════════════════════════════════════
// 📤 EXPORT
// ═══════════════════════════════════════════════════════════

export default {
  // Initialization
  initAnalytics,
  isAnalyticsReady,
  getAnalyticsConfig,
  
  // Core tracking
  trackPageView,
  trackEvent,
  trackTiming,
  trackEngagement,
  trackConversion,
  trackOutboundLink,
  trackError,
  
  // Measurements
  measureOperation,
  measureAsyncOperation,
  
  // User
  setUserProperty,
  setUserId,
  
  // Predefined events
  AnalyticsEvents,
  
  // Utilities
  initOutboundLinkTracking,
};