import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

const ResumeLanguageSelector = ({ resumeLanguage, onLanguageChange, disabled = false }) => {
  const { t } = useTranslation();

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'kk', name: 'Қазақша', flag: '🇰🇿' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold mb-2">{t('builder.resumeLanguage.title')}</h3>
      <p className="text-sm text-gray-600 mb-4">{t('builder.resumeLanguage.description')}</p>
      
      <div className="grid grid-cols-3 gap-3">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => onLanguageChange(lang.code)}
            disabled={disabled}
            className={`
              px-4 py-3 rounded-lg border-2 transition-all
              ${resumeLanguage === lang.code 
                ? 'border-blue-600 bg-blue-50 text-blue-700' 
                : 'border-gray-200 hover:border-gray-300'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="text-2xl mb-1">{lang.flag}</div>
            <div className="font-medium text-sm">{lang.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ResumeLanguageSelector;