// src/utils/analytics.js - Production Analytics & Tracking
const ANALYTICS_ENABLED = process.env.NODE_ENV === 'production' && 
                          process.env.ENABLE_ANALYTICS === 'true';

// Initialize Google Analytics
export function initGA() {
  if (!ANALYTICS_ENABLED || !process.env.GA_MEASUREMENT_ID) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', process.env.GA_MEASUREMENT_ID, {
    send_page_view: false, // Manual page view tracking
    anonymize_ip: true,
  });

  console.log('[Analytics] Google Analytics initialized');
}

// Track page views
export function trackPageView(path, title) {
  if (!ANALYTICS_ENABLED || !window.gtag) return;

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title,
  });

  console.log('[Analytics] Page view:', path);
}

// Track custom events
export function trackEvent(category, action, label = '', value = 0) {
  if (!ANALYTICS_ENABLED || !window.gtag) return;

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });

  console.log('[Analytics] Event:', { category, action, label, value });
}

// Track user actions
export const AnalyticsEvents = {
  // Resume builder events
  RESUME_CREATED: () => trackEvent('Resume', 'created', 'Resume Created'),
  RESUME_EDITED: (step) => trackEvent('Resume', 'edited', `Step ${step}`),
  RESUME_DOWNLOADED: (format) => trackEvent('Resume', 'downloaded', format),
  TEMPLATE_SELECTED: (template) => trackEvent('Resume', 'template_selected', template),

  // AI events
  AI_RECOMMENDATION_REQUESTED: () => trackEvent('AI', 'recommendation_requested'),
  AI_RECOMMENDATION_RECEIVED: (time) => trackEvent('AI', 'recommendation_received', '', time),
  AI_SUGGESTION_ACCEPTED: (type) => trackEvent('AI', 'suggestion_accepted', type),

  // Job search events
  JOB_SEARCHED: (query) => trackEvent('Jobs', 'searched', query),
  JOB_VIEWED: (jobId) => trackEvent('Jobs', 'viewed', jobId),
  JOB_APPLIED: (jobId) => trackEvent('Jobs', 'applied', jobId),
  FILTER_APPLIED: (filterType) => trackEvent('Jobs', 'filter_applied', filterType),

  // Import events
  HH_IMPORT_STARTED: () => trackEvent('Import', 'hh_started'),
  HH_IMPORT_COMPLETED: () => trackEvent('Import', 'hh_completed'),
  HH_IMPORT_FAILED: (reason) => trackEvent('Import', 'hh_failed', reason),

  // Navigation events
  NAV_TO_BUILDER: () => trackEvent('Navigation', 'to_builder'),
  NAV_TO_VACANCIES: () => trackEvent('Navigation', 'to_vacancies'),
  NAV_TO_RECOMMENDATIONS: () => trackEvent('Navigation', 'to_recommendations'),

  // Error events
  ERROR_OCCURRED: (errorType) => trackEvent('Error', 'occurred', errorType),
  ERROR_BOUNDARY_TRIGGERED: (component) => trackEvent('Error', 'boundary_triggered', component),
};

// Track timing (performance)
export function trackTiming(category, variable, time, label = '') {
  if (!ANALYTICS_ENABLED || !window.gtag) return;

  window.gtag('event', 'timing_complete', {
    name: variable,
    value: time,
    event_category: category,
    event_label: label,
  });

  console.log('[Analytics] Timing:', { category, variable, time, label });
}

// Track user engagement
export function trackEngagement(action, duration = 0) {
  if (!ANALYTICS_ENABLED || !window.gtag) return;

  window.gtag('event', 'user_engagement', {
    engagement_time_msec: duration,
    action: action,
  });
}

// Track conversions
export function trackConversion(conversionType, value = 0) {
  if (!ANALYTICS_ENABLED || !window.gtag) return;

  window.gtag('event', 'conversion', {
    conversion_type: conversionType,
    value: value,
    currency: 'USD',
  });

  console.log('[Analytics] Conversion:', conversionType);
}

// Track outbound links
export function trackOutboundLink(url, label) {
  if (!ANALYTICS_ENABLED || !window.gtag) return;

  window.gtag('event', 'click', {
    event_category: 'Outbound Link',
    event_label: label || url,
    transport_type: 'beacon',
  });
}

// Performance monitoring
export function trackPerformance() {
  if (!ANALYTICS_ENABLED || !window.performance) return;

  const perfData = window.performance.timing;
  const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
  const connectTime = perfData.responseEnd - perfData.requestStart;
  const renderTime = perfData.domComplete - perfData.domLoading;

  trackTiming('Performance', 'Page Load Time', pageLoadTime);
  trackTiming('Performance', 'Server Response Time', connectTime);
  trackTiming('Performance', 'DOM Render Time', renderTime);

  // Core Web Vitals
  if ('PerformanceObserver' in window) {
    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      trackTiming('Web Vitals', 'LCP', Math.round(lastEntry.renderTime || lastEntry.loadTime));
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry) => {
        trackTiming('Web Vitals', 'FID', Math.round(entry.processingStart - entry.startTime));
      });
    });
    fidObserver.observe({ entryTypes: ['first-input'] });
  }
}

// Session tracking
let sessionStart = Date.now();
let lastActivityTime = Date.now();

export function initSessionTracking() {
  if (!ANALYTICS_ENABLED) return;

  // Track session start
  trackEvent('Session', 'started');

  // Track user activity
  const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  activityEvents.forEach((event) => {
    document.addEventListener(event, () => {
      lastActivityTime = Date.now();
    }, { passive: true });
  });

  // Track session end on page unload
  window.addEventListener('beforeunload', () => {
    const sessionDuration = Math.round((lastActivityTime - sessionStart) / 1000);
    trackEngagement('session_end', sessionDuration);
    trackEvent('Session', 'ended', '', sessionDuration);
  });
}

// User properties
export function setUserProperty(property, value) {
  if (!ANALYTICS_ENABLED || !window.gtag) return;

  window.gtag('set', 'user_properties', {
    [property]: value,
  });
}

export default {
  initGA,
  trackPageView,
  trackEvent,
  trackTiming,
  trackEngagement,
  trackConversion,
  trackOutboundLink,
  trackPerformance,
  initSessionTracking,
  setUserProperty,
  AnalyticsEvents,
};