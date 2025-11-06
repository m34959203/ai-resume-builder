// src/components/LoadingStates.jsx
import React from 'react';
import { FileText, Loader } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

/**
 * Загрузка страницы (полноэкранная)
 */
export const PageLoader = ({ message }) => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl animate-pulse">
          <FileText className="text-white" size={32} />
        </div>
        
        <div className="flex items-center justify-center gap-2 mb-4">
          <Loader className="animate-spin text-blue-600" size={24} />
          <p className="text-lg font-medium text-gray-700">
            {message || t('loading.page')}
          </p>
        </div>
        
        <p className="text-sm text-gray-500">
          {t('loading.pleaseWait')}
        </p>
      </div>
    </div>
  );
};

/**
 * Загрузка компонента (inline)
 */
export const ComponentLoader = ({ message, size = 'md' }) => {
  const { t } = useTranslation();
  
  const sizeClasses = {
    sm: 'py-4',
    md: 'py-8',
    lg: 'py-12'
  };
  
  const spinnerSizes = {
    sm: 16,
    md: 24,
    lg: 32
  };
  
  return (
    <div className={`flex items-center justify-center ${sizeClasses[size]}`}>
      <div className="text-center">
        <Loader 
          className="animate-spin text-blue-600 mx-auto mb-3" 
          size={spinnerSizes[size]} 
        />
        <p className="text-sm text-gray-600">
          {message || t('loading.component')}
        </p>
      </div>
    </div>
  );
};

/**
 * Скелетон для карточки резюме
 */
export const ResumeSkeleton = () => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/6" />
      </div>
      
      <div className="mt-6 space-y-3">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>
      
      <div className="mt-6 flex gap-2">
        <div className="h-10 bg-gray-200 rounded-lg w-24" />
        <div className="h-10 bg-gray-200 rounded-lg w-24" />
        <div className="h-10 bg-gray-200 rounded-lg w-24" />
      </div>
    </div>
  );
};

/**
 * Скелетон для списка вакансий
 */
export const VacanciesSkeleton = ({ count = 3 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="border rounded-lg p-6 animate-pulse">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <div className="h-6 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
            </div>
            <div className="h-6 bg-gray-200 rounded-full w-24" />
          </div>
          
          <div className="flex gap-4 mb-3">
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="h-4 bg-gray-200 rounded w-20" />
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-4/5" />
          </div>
          
          <div className="flex gap-2 mb-4">
            <div className="h-6 bg-gray-200 rounded-full w-16" />
            <div className="h-6 bg-gray-200 rounded-full w-20" />
            <div className="h-6 bg-gray-200 rounded-full w-24" />
          </div>
          
          <div className="h-10 bg-gray-200 rounded-lg w-40" />
        </div>
      ))}
    </div>
  );
};

/**
 * Индикатор загрузки с прогрессом
 */
export const ProgressLoader = ({ progress, message }) => {
  const { t } = useTranslation();
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-6">
        <Loader className="animate-spin text-blue-600 mx-auto mb-3" size={32} />
        <p className="text-lg font-medium text-gray-700">
          {message || t('loading.processing')}
        </p>
      </div>
      
      {typeof progress === 'number' && (
        <div className="w-full">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{t('loading.progress')}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Скелетон для генерации AI
 */
export const AIGeneratingSkeleton = () => {
  const { t } = useTranslation();
  
  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8 border border-blue-200">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center animate-pulse">
          <FileText className="text-white" size={24} />
        </div>
        <div className="flex-1">
          <div className="h-6 bg-white/60 rounded w-3/4 mb-2" />
          <div className="h-4 bg-white/40 rounded w-1/2" />
        </div>
      </div>
      
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-200 rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-white/60 rounded w-full" />
              <div className="h-4 bg-white/40 rounded w-4/5" />
            </div>
          </div>
        ))}
      </div>
      
      <p className="mt-6 text-center text-sm text-gray-600">
        {t('loading.aiGenerating')}
      </p>
    </div>
  );
};

/**
 * Простой спиннер
 */
export const Spinner = ({ size = 20, className = '' }) => {
  return (
    <Loader 
      className={`animate-spin ${className}`} 
      size={size} 
    />
  );
};

/**
 * Кнопка с загрузкой
 */
export const LoadingButton = ({ 
  loading, 
  children, 
  disabled, 
  onClick,
  className = '',
  ...props 
}) => {
  const { t } = useTranslation();
  
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`
        relative inline-flex items-center justify-center gap-2
        px-6 py-3 rounded-lg font-semibold
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    >
      {loading && (
        <Spinner size={16} className="text-current" />
      )}
      {loading ? t('loading.processing') : children}
    </button>
  );
};