// src/components/LanguageSwitcher.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { Globe } from 'lucide-react';

const LABELS = { ru: 'Русский', kk: 'Қазақша', en: 'English' };
const FLAGS  = { ru: '🇷🇺',   kk: '🇰🇿',    en: '🇬🇧' };

// на всякий случай нормализуем входящее значение (если где-то просочился 'kz')
const norm = (s) => {
  const v = String(s || '').toLowerCase();
  if (v === 'kz') return 'kk';
  return v.split(/[-_]/)[0] || 'ru';
};

const LanguageSwitcher = ({ className = '' }) => {
  const { language, changeLanguage, supportedLanguages } = useTranslation();
  const lang = norm(language);

  const [isOpen, setIsOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  // финальный список опций — ровно ru/kk/en, в нужном порядке
  const options = useMemo(() => {
    const allowed = ['ru', 'kk', 'en'];
    const set = new Set((supportedLanguages || []).map(norm));
    return allowed.filter((l) => set.has(l)).map((value) => ({
      value,
      label: LABELS[value] || value.toUpperCase(),
      flag: FLAGS[value] || '🌐',
    }));
  }, [supportedLanguages]);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  const handleLanguageChange = (code) => {
    changeLanguage(norm(code)); // в контексте тоже нормализуется, но подстрахуемся
    handleClose();
    // Вернём фокус на кнопку после выбора для доступности
    if (btnRef.current) btnRef.current.focus();
  };

  // Закрытие по Esc и клику вне меню
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
      // простая навигация по пунктам ↑/↓
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = menuRef.current?.querySelectorAll('button[data-lang]') || [];
        if (!items.length) return;
        const current = document.activeElement;
        const idx = Array.from(items).findIndex((el) => el === current);
        const nextIdx =
          e.key === 'ArrowDown'
            ? (idx + 1 + items.length) % items.length
            : (idx - 1 + items.length) % items.length;
        items[nextIdx]?.focus();
      }
    };

    const onClick = (e) => {
      // если клик вне меню и не по кнопке — закрыть
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        handleClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClick);
    };
  }, [isOpen]);

  // Открытие по Enter/Space и фокус на первый элемент
  const onToggleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((v) => !v);
      // фокус на первый пункт после открытия
      setTimeout(() => {
        const first = menuRef.current?.querySelector('button[data-lang]');
        first?.focus();
      }, 0);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      setTimeout(() => {
        const first = menuRef.current?.querySelector('button[data-lang]');
        first?.focus();
      }, 0);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        onClick={() => (isOpen ? handleClose() : handleOpen())}
        onKeyDown={onToggleKeyDown}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        aria-label="Change language"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        type="button"
        title={LABELS[lang] || lang.toUpperCase()}
      >
        <Globe className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {(FLAGS[lang] || '🌐') + ' ' + (LABELS[lang] || lang.toUpperCase())}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Language menu"
          className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 overflow-hidden"
        >
          {options.map(({ value, label, flag }) => (
            <button
              key={value}
              data-lang={value}
              onClick={() => handleLanguageChange(value)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                lang === value
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
              }`}
              type="button"
            >
              <span className="text-xl">{flag}</span>
              <span className="text-sm font-medium">{label}</span>
              {lang === value && (
                <svg
                  className="ml-auto w-5 h-5 text-indigo-600 dark:text-indigo-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
