/**
 * ═══════════════════════════════════════════════════════════
 * ⚡ PERFORMANCE UTILITIES
 * ═══════════════════════════════════════════════════════════
 */

import { trackTiming, trackEvent } from './analytics';

/**
 * Декоратор для измерения времени выполнения функции
 */
export function timed(name) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      const startTime = performance.now();
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - startTime;
        
        trackTiming('Function', name || propertyKey, duration);
        
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        trackTiming('Function', `${name || propertyKey} (failed)`, duration);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Измерение производительности компонента React
 */
export function measureComponentRender(componentName) {
  return {
    onRender(id, phase, actualDuration) {
      trackTiming('React', `${componentName} ${phase}`, actualDuration);
    }
  };
}

/**
 * Получение информации о памяти
 */
export function getMemoryInfo() {
  if (!performance.memory) return null;

  return {
    usedJSHeapSize: performance.memory.usedJSHeapSize,
    totalJSHeapSize: performance.memory.totalJSHeapSize,
    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
    usedPercent: Math.round(
      (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
    ),
  };
}

/**
 * Мониторинг памяти с интервалом
 */
export function startMemoryMonitoring(interval = 60000) {
  if (!performance.memory) return null;

  return setInterval(() => {
    const memInfo = getMemoryInfo();
    
    if (memInfo.usedPercent > 90) {
      trackEvent('Performance', 'high_memory_usage', `${memInfo.usedPercent}%`, memInfo.usedPercent);
    }
    
    console.log('[Memory]', memInfo);
  }, interval);
}

/**
 * FPS мониторинг
 */
export function initFPSMonitoring() {
  let lastTime = performance.now();
  let frames = 0;

  function tick() {
    frames++;
    const currentTime = performance.now();
    
    if (currentTime >= lastTime + 1000) {
      const fps = Math.round((frames * 1000) / (currentTime - lastTime));
      
      if (fps < 30) {
        trackEvent('Performance', 'low_fps', `${fps} FPS`, fps);
      }
      
      frames = 0;
      lastTime = currentTime;
    }
    
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

/**
 * Long Task мониторинг
 */
export function initLongTaskMonitoring() {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        trackEvent(
          'Performance',
          'long_task',
          entry.name,
          Math.round(entry.duration)
        );
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
  } catch (error) {
    console.error('Long task monitoring failed:', error);
  }
}

export default {
  timed,
  measureComponentRender,
  getMemoryInfo,
  startMemoryMonitoring,
  initFPSMonitoring,
  initLongTaskMonitoring,
};