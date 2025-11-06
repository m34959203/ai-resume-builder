import React from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n/config';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="flex gap-2">
      {Object.entries(LANGUAGES).map(([code, { name, flag }]) => (
        <button
          key={code}
          onClick={() => i18n.changeLanguage(code)}
          className={`
            px-3 py-2 rounded-lg transition-all
            ${i18n.language === code 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
        >
          <span className="mr-1">{flag}</span>
          {name}
        </button>
      ))}
    </div>
  );
}