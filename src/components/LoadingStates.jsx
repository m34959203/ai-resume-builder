// src/components/LoadingStates.jsx - Production Loading Components
import React from 'react';
import { Loader2, FileText, Sparkles, Search } from 'lucide-react';
import useTranslation from '../hooks/useTranslation';

/** Full page loader */
export function PageLoader({ message }) {
  const { t } = useTranslation();
  const text = message || t('messages.loading');

  return (
    <div
      className="fixed inset-0 bg-white z-50 flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-600 motion-safe:animate-spin mx-auto mb-4" aria-hidden="true" />
        <p className="text-gray-600 font-medium">{text}</p>
      </div>
    </div>
  );
}

/** Inline loader */
export function InlineLoader({ size = 'md', message = '', className = '' }) {
  const { t } = useTranslation();
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };
  const text = message || t('messages.loading');

  return (
    <div
      className={`flex items-center justify-center gap-3 py-8 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className={`${sizes[size] ?? sizes.md} text-blue-600 motion-safe:animate-spin`} aria-hidden="true" />
      {text && <span className="text-gray-600">{text}</span>}
    </div>
  );
}

/** AI Processing loader with animation */
export function AILoader({ message }) {
  const { t } = useTranslation();
  const text = message || t('messages.loading');

  return (
    <div className="text-center py-12" role="status" aria-live="polite" aria-busy="true">
      <div className="relative inline-block mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-lg opacity-50 motion-safe:animate-pulse" aria-hidden="true"></div>
        <div className="relative w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-white motion-safe:animate-pulse" aria-hidden="true" />
        </div>
      </div>
      <p className="text-gray-700 font-medium mb-2">{text}</p>
      <div className="flex justify-center gap-1" aria-hidden="true">
        <div className="w-2 h-2 bg-blue-600 rounded-full motion-safe:animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-blue-600 rounded-full motion-safe:animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-blue-600 rounded-full motion-safe:animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
}

/** Skeleton for vacancy card */
export function VacancySkeleton() {
  return (
    <div className="border rounded-lg p-6 animate-pulse" aria-hidden="true">
      <div className="flex justify-between mb-3">
        <div className="space-y-2 flex-1">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="h-6 bg-gray-200 rounded w-24"></div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
      <div className="flex gap-2">
        <div className="h-6 bg-gray-200 rounded w-16"></div>
        <div className="h-6 bg-gray-200 rounded w-16"></div>
        <div className="h-6 bg-gray-200 rounded w-16"></div>
      </div>
    </div>
  );
}

/** Skeleton for resume preview */
export function ResumeSkeleton() {
  return (
    <div className="bg-white rounded-lg p-6 border animate-pulse" aria-hidden="true">
      <div className="mb-4">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="flex gap-3">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
      </div>
    </div>
  );
}

/** Button with loading state */
export function LoadingButton({ loading, children, disabled, className = '', ...props }) {
  const { t } = useTranslation();
  const ariaLabel = props['aria-label'] || (loading ? t('messages.loading') : undefined);

  return (
    <button
      disabled={loading || disabled}
      className={`relative inline-flex items-center justify-center ${loading ? 'opacity-75 cursor-wait' : ''} ${className}`}
      aria-busy={loading ? 'true' : 'false'}
      aria-live="polite"
      aria-label={ariaLabel}
      {...props}
    >
      {loading && (
        <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 motion-safe:animate-spin" aria-hidden="true" />
      )}
      <span className={loading ? 'opacity-0' : ''}>{children}</span>
    </button>
  );
}

/** Search loading state */
export function SearchLoader({ message }) {
  const { t } = useTranslation();
  const text = message || t('messages.loading');

  return (
    <div className="flex items-center justify-center gap-3 py-8 text-gray-600" role="status" aria-live="polite" aria-busy="true">
      <Search className="w-6 h-6 motion-safe:animate-pulse" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

/** PDF Generation loader */
export function PDFLoader({ message }) {
  const { t } = useTranslation();
  const text = message || t('messages.loading');

  return (
    <div className="flex items-center justify-center gap-3 py-4 text-green-600" role="status" aria-live="polite" aria-busy="true">
      <FileText className="w-6 h-6 motion-safe:animate-pulse" aria-hidden="true" />
      <span className="font-medium">{text}</span>
    </div>
  );
}

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
