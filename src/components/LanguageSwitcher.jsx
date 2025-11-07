import React, { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { Globe } from 'lucide-react';

const LanguageSwitcher = ({ className = '' }) => {
  const { language, changeLanguage, supportedLanguages } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const names = { ru: 'Русский', en: 'English', kk: 'Қазақша' };
  const flags = { ru: '🇷🇺', en: '🇬🇧', kk: '🇰🇿' };

  const onPick = (lng) => {
    changeLanguage(lng);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50"
        aria-label="Change language"
      >
        <Globe className="w-5 h-5 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">
          {flags[language]} {names[language]}
        </span>
        <svg className={`w-4 h-4 text-gray-500 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24">
          <path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-44 z-20 bg-white rounded-lg border shadow">
            {supportedLanguages.map((lng) => (
              <button
                key={lng}
                type="button"
                onClick={() => onPick(lng)}
                className={`w-full text-left px-4 py-2 flex items-center gap-2 ${
                  language === lng ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'
                }`}
              >
                <span className="text-lg">{flags[lng]}</span>
                <span className="text-sm">{names[lng]}</span>
                {language === lng && <span className="ml-auto">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;
