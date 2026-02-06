// src/main.jsx 
import React, { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext.jsx';
import App from './App.jsx';
import './index.css';

// ====== Версия/бэкенд для bff.js (опционально) ======
try {
  // Дадим bff.js возможность прочитать явный URL
  if (import.meta.env.VITE_API_URL) {
    // не перезаписываем, если уже подставлен снаружи
    if (typeof window !== 'undefined' && !window.__API_URL__) {
      window.__API_URL__ = String(import.meta.env.VITE_API_URL).trim();
    }
  }
  // Немного диагностик версии сборки
  if (typeof window !== 'undefined') {
    window.__APP_VERSION__ = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
    window.__BUILD_TIME__  = typeof __BUILD_TIME__  !== 'undefined' ? __BUILD_TIME__  : '';
    // console.debug('[build]', window.__APP_VERSION__, window.__BUILD_TIME__);
  }
} catch { /* noop */ }

// ====== Роутер (hash — дружит с GitHub Pages/подкаталогами) ======
const router = createHashRouter(
  [
    { path: '/*', element: <App /> },
    // Примеры на будущее:
    // { path: '/', element: <AIResumeBuilder /> },
    // { path: '/oauth/hh/callback', element: <HHCallback /> },
  ],
  {
    // включаем поведение v7 уже сейчас
    future: { v7_startTransition: true, v7_relativeSplatPath: true },
  }
);

// ====== PWA: автообновление, если включено ======
const enablePWA = String(import.meta.env.VITE_ENABLE_PWA ?? (import.meta.env.PROD ? '1' : '0')) === '1';
/*
if (enablePWA && import.meta.env.PROD) {
  // не падаем, если плагин не установлен
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          // лаконичный UX: спросим и применим новый бандл
          const ok = window.confirm('Доступно обновление приложения. Обновить сейчас?');
          if (ok) updateSW();
        },
        onOfflineReady() {
          // можно показать тост «Доступно офлайн»
          // console.info('PWA offline ready');
        },
      });
    })
    .catch(() => {});
}
*/

// ====== Глобальные ловушки ошибок, чтобы видеть сбои API/рендера ======
window.addEventListener('error', (e) => {
  // eslint-disable-next-line no-console
  console.error('[window:error]', e?.error || e?.message || e);
});
window.addEventListener('unhandledrejection', (e) => {
  // eslint-disable-next-line no-console
  console.error('[unhandledrejection]', e?.reason || e);
});

// ====== Рендер ======
const container = document.getElementById('root');
const root = createRoot(container);

// Сплэш на время lazy-компонентов и инициализации
const AppTree = (
  <LanguageProvider>
    <Suspense fallback={<div className="app-splash">Загрузка…</div>}>
      <RouterProvider router={router} />
    </Suspense>
  </LanguageProvider>
);

// StrictMode — только в DEV, чтобы в продакшене эффекты/запросы не срабатывали дважды
if (import.meta.env.DEV) {
  root.render(<StrictMode>{AppTree}</StrictMode>);
} else {
  root.render(AppTree);
}
