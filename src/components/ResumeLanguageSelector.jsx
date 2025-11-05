import React, { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../context/LanguageContext';
import { translateResumeData } from '../services/translation';

const ResumeLanguageSelector = ({ resumeData, onDataChange }) => {
  const { t } = useTranslation();
  const { language: interfaceLanguage } = useLanguage();
  const [documentLanguage, setDocumentLanguage] = useState(interfaceLanguage);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(null);

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'kk', name: 'Қазақша', flag: '🇰🇿' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
  ];

  const handleLanguageChange = async (newLanguage) => {
    if (newLanguage === documentLanguage) return;

    setIsTranslating(true);
    setTranslationError(null);

    try {
      // Переводим данные резюме
      const translatedData = await translateResumeData(
        resumeData,
        documentLanguage,
        newLanguage
      );

      setDocumentLanguage(newLanguage);
      onDataChange(translatedData);
    } catch (error) {
      console.error('Translation error:', error);
      setTranslationError(t('errors.translationFailed'));
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {t('builder.resumeLanguage.title')}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {t('builder.resumeLanguage.description')}
          </p>
        </div>
        {isTranslating && (
          <div className="flex items-center space-x-2 text-blue-600">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-sm">{t('builder.translating')}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Язык интерфейса (только для отображения) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('builder.resumeLanguage.interfaceLanguage')}
          </label>
          <div className="px-4 py-3 bg-gray-100 rounded-lg border border-gray-300">
            <span className="text-2xl mr-2">
              {languages.find(l => l.code === interfaceLanguage)?.flag}
            </span>
            <span className="font-medium">
              {languages.find(l => l.code === interfaceLanguage)?.name}
            </span>
          </div>
        </div>

        {/* Язык документа (можно изменить) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('builder.resumeLanguage.documentLanguage')}
          </label>
          <select
            value={documentLanguage}
            onChange={(e) => handleLanguageChange(e.target.value)}
            disabled={isTranslating}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {translationError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{translationError}</p>
        </div>
      )}

      {/* Информационное сообщение */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <span className="text-2xl mr-3">💡</span>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">{t('builder.resumeLanguage.tips.title')}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t('builder.resumeLanguage.tips.tip1')}</li>
              <li>{t('builder.resumeLanguage.tips.tip2')}</li>
              <li>{t('builder.resumeLanguage.tips.tip3')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeLanguageSelector;