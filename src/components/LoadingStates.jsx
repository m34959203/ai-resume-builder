// src/components/LoadingStates.jsx — Production Loading & Skeleton Components
import React from 'react';
import { Loader2, FileText, Sparkles, Search } from 'lucide-react';
// Если у вас есть хук i18n — используем его, иначе падать не будем.
let useTranslationSafe = null;
try {
  // Подправьте путь при необходимости (../hooks/useTranslation)
  // Хук должен возвращать { t } с сигнатурой t(key, params?)
  // eslint-disable-next-line global-require, import/no-unresolved
  useTranslationSafe = require('../hooks/useTranslation')?.useTranslation ?? null;
} catch (_) {
  useTranslationSafe = null;
}

const tOr = (key, fallback) => {
  try {
    if (useTranslationSafe) {
      const { t } = useTranslationSafe();
      const v = t?.(key);
      return typeof v === 'string' && v.trim() ? v : fallback;
    }
  } catch (_) {}
  return fallback;
};

/* ============================== Loaders =============================== */

// Полноэкранный лоадер (оверлей)
export function PageLoader({
  message,
  tip = '',
  className = '',
  backdrop = true,
  icon = <Loader2 className="w-12 h-12 animate-spin" aria-hidden="true" />,
}) {
  const msg =
    message ??
    tOr('loading.page', 'Загрузка приложения…');

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-6 ${
        backdrop ? 'bg-white/95 dark:bg-gray-900/95' : ''
      } ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="text-center">
        <div className="mx-auto mb-4 text-blue-600 dark:text-blue-400">
          {icon}
        </div>
        <p className="text-gray-700 dark:text-gray-200 font-medium">{msg}</p>
        {tip ? (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{tip}</p>
        ) : null}
        {/* Поддержка reduced motion */}
        <span className="sr-only">Loading…</span>
      </div>
    </div>
  );
}

// Встроенный лоадер (в пределах блока)
export function InlineLoader({
  size = 'md',
  message = '',
  className = '',
  pulse = false,
  'aria-label': ariaLabel,
}) {
  const sizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div
      className={`flex items-center justify-center gap-3 py-6 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel || (message || tOr('loading.inline', 'Идёт загрузка…'))}
      aria-busy="true"
    >
      <Loader2
        className={`${sizes[size] ?? sizes.md} text-blue-600 dark:text-blue-400 ${
          pulse ? 'animate-pulse' : 'animate-spin'
        } motion-reduce:animate-none`}
        aria-hidden="true"
      />
      {message ? (
        <span className="text-gray-600 dark:text-gray-300">{message}</span>
      ) : null}
    </div>
  );
}

// Лоадер «AI обрабатывает»
export function AILoader({
  message,
  dots = true,
  className = '',
}) {
  const msg =
    message ??
    tOr('loading.ai', 'Анализируем ваш профиль…');

  return (
    <div
      className={`text-center py-12 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative inline-block mb-6">
        <div className="absolute inset-0 rounded-full blur-lg opacity-50 animate-pulse bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 motion-reduce:animate-none" />
        <div className="relative w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500">
          <Sparkles className="w-8 h-8 text-white animate-pulse motion-reduce:animate-none" aria-hidden="true" />
        </div>
      </div>
      <p className="text-gray-700 dark:text-gray-200 font-medium mb-2">{msg}</p>

      {dots && (
        <div className="flex justify-center gap-1" aria-hidden="true">
          <div
            className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-bounce motion-reduce:animate-none"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-bounce motion-reduce:animate-none"
            style={{ animationDelay: '150ms' }}
          />
          <div
            className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-bounce motion-reduce:animate-none"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      )}
    </div>
  );
}

// Лоадер поиска вакансий
export function SearchLoader({ query = '', city = '', className = '' }) {
  const base = tOr('loading.search', 'Ищем вакансии…');
  const details =
    [query && `«${query}»`, city && `(${city})`].filter(Boolean).join(' ');
  const label = [base, details].filter(Boolean).join(' ');

  return (
    <div
      className={`flex items-center justify-center gap-3 py-8 text-gray-600 dark:text-gray-300 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <Search className="w-6 h-6 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

// Лоадер генерации PDF
export function PDFLoader({ stage = 'render', className = '' }) {
  const stageMap = {
    render: tOr('loading.pdf.render', 'Генерируем PDF…'),
    compile: tOr('loading.pdf.compile', 'Собираем документ…'),
    ready: tOr('loading.pdf.ready', 'Подготавливаем к скачиванию…'),
  };
  const text = stageMap[stage] || stageMap.render;

  return (
    <div
      className={`flex items-center justify-center gap-3 py-4 text-green-600 dark:text-green-400 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <FileText className="w-6 h-6 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
      <span className="font-medium">{text}</span>
    </div>
  );
}

/* ============================== Skeletons =============================== */

const skeletonBase = 'bg-gray-200 dark:bg-gray-800';
const cardBase = 'border rounded-lg p-6 bg-white dark:bg-gray-900 dark:border-gray-800';

// Карточка вакансии (скелетон)
export function VacancySkeleton({ className = '' }) {
  return (
    <div className={`${cardBase} animate-pulse ${className}`} aria-hidden="true">
      <div className="flex justify-between mb-3">
        <div className="space-y-2 flex-1">
          <div className={`h-6 ${skeletonBase} rounded w-3/4`} />
          <div className={`h-4 ${skeletonBase} rounded w-1/2`} />
        </div>
        <div className={`h-6 ${skeletonBase} rounded w-24`} />
      </div>
      <div className="space-y-2 mb-4">
        <div className={`h-4 ${skeletonBase} rounded w-full`} />
        <div className={`h-4 ${skeletonBase} rounded w-5/6`} />
      </div>
      <div className="flex gap-2">
        <div className={`h-6 ${skeletonBase} rounded w-16`} />
        <div className={`h-6 ${skeletonBase} rounded w-16`} />
        <div className={`h-6 ${skeletonBase} rounded w-16`} />
      </div>
    </div>
  );
}

// Карточка резюме (скелетон)
export function ResumeSkeleton({ className = '' }) {
  return (
    <div className={`rounded-lg p-6 border bg-white dark:bg-gray-900 dark:border-gray-800 animate-pulse ${className}`} aria-hidden="true">
      <div className="mb-4">
        <div className={`h-8 ${skeletonBase} rounded w-1/3 mb-2`} />
        <div className="flex gap-3">
          <div className={`h-4 ${skeletonBase} rounded w-32`} />
          <div className={`h-4 ${skeletonBase} rounded w-32`} />
        </div>
      </div>
      <div className="space-y-3">
        <div className={`h-4 ${skeletonBase} rounded w-full`} />
        <div className={`h-4 ${skeletonBase} rounded w-5/6`} />
        <div className={`h-4 ${skeletonBase} rounded w-4/6`} />
      </div>
    </div>
  );
}

/* ============================== Buttons =============================== */

// Кнопка с состоянием загрузки
export function LoadingButton({
  loading,
  children,
  disabled,
  className = '',
  spinnerClassName = 'w-5 h-5',
  ...props
}) {
  return (
    <button
      disabled={loading || disabled}
      className={`relative inline-flex items-center justify-center ${loading ? 'opacity-75 cursor-wait' : ''} ${className}`}
      aria-busy={loading ? 'true' : 'false'}
      {...props}
    >
      {loading && (
        <Loader2
          className={`absolute left-3 top-1/2 -translate-y-1/2 animate-spin motion-reduce:animate-none ${spinnerClassName}`}
          aria-hidden="true"
        />
      )}
      <span className={loading ? 'opacity-0' : ''}>{children}</span>
    </button>
  );
}

/* ============================== Named Export Bundle =============================== */

export default {
  PageLoader,
  InlineLoader,
  AILoader,
  VacancySkeleton,
  ResumeSkeleton,
  LoadingButton,
  SearchLoader,
  PDFLoader,
};
