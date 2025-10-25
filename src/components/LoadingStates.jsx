// src/components/LoadingStates.jsx - Production Loading Components
import React from 'react';
import { Loader2, FileText, Sparkles, Search } from 'lucide-react';

// Full page loader
export function PageLoader({ message = 'Загрузка...' }) {
  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
}

// Inline loader
export function InlineLoader({ size = 'md', message = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex items-center justify-center gap-3 py-8">
      <Loader2 className={`${sizes[size]} text-blue-600 animate-spin`} />
      {message && <span className="text-gray-600">{message}</span>}
    </div>
  );
}

// AI Processing loader with animation
export function AILoader({ message = 'Анализируем ваш профиль...' }) {
  return (
    <div className="text-center py-12">
      <div className="relative inline-block mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-lg opacity-50 animate-pulse"></div>
        <div className="relative w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-white animate-pulse" />
        </div>
      </div>
      <p className="text-gray-700 font-medium mb-2">{message}</p>
      <div className="flex justify-center gap-1">
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
}

// Skeleton loaders
export function VacancySkeleton() {
  return (
    <div className="border rounded-lg p-6 animate-pulse">
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

export function ResumeSkeleton() {
  return (
    <div className="bg-white rounded-lg p-6 border animate-pulse">
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

// Button loading state
export function LoadingButton({ loading, children, disabled, ...props }) {
  return (
    <button
      disabled={loading || disabled}
      className={`relative ${loading ? 'opacity-75 cursor-wait' : ''}`}
      {...props}
    >
      {loading && (
        <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin" />
      )}
      <span className={loading ? 'opacity-0' : ''}>{children}</span>
    </button>
  );
}

// Search loading state
export function SearchLoader() {
  return (
    <div className="flex items-center justify-center gap-3 py-8 text-gray-600">
      <Search className="w-6 h-6 animate-pulse" />
      <span>Ищем вакансии...</span>
    </div>
  );
}

// PDF Generation loader
export function PDFLoader() {
  return (
    <div className="flex items-center justify-center gap-3 py-4 text-green-600">
      <FileText className="w-6 h-6 animate-pulse" />
      <span className="font-medium">Генерируем PDF...</span>
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