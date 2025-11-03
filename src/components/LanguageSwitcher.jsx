// src/components/LanguageSwitcher.jsx
// Переключатель языка с флагами 🇷🇺/🇰🇿/🇬🇧. Использует контекст i18n.

import React from 'react';
import useTranslation from '../hooks/useTranslation';

const LANGS = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'kk', label: 'Қазақ тілі', flag: '🇰🇿' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export default function LanguageSwitcher({ className = '' }) {
  const { lang, setLang } = useTranslation();

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-md bg-white/70 p-1 shadow-sm ring-1 ring-gray-200 backdrop-blur ${className}`}
      role="group"
      aria-label="Language switcher"
    >
      {LANGS.map(({ code, label, flag }) => {
        const active = lang === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={active}
            title={label}
            className={[
              'px-2.5 py-1.5 rounded text-sm font-medium transition outline-none',
              'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0',
              active
                ? 'bg-gray-900 text-white'
                : 'text-gray-700 hover:bg-gray-100',
            ].join(' ')}
          >
            <span className="mr-1" aria-hidden>
              {flag}
            </span>
            {code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
