import React, { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';

const LanguageSwitcher = () => {
  const { language, changeLanguage } = useContext(LanguageContext);

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'kk', name: 'Қазақша', flag: '🇰🇿' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' }
  ];

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm p-1">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => changeLanguage(lang.code)}
          className={`
            px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
            flex items-center gap-2
            ${language === lang.code 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'text-gray-700 hover:bg-gray-100'
            }
          `}
          aria-label={`Switch to ${lang.name}`}
        >
          <span className="text-lg">{lang.flag}</span>
          <span className="hidden sm:inline">{lang.code.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;