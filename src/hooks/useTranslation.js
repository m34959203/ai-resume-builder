// src/hooks/useTranslation.js
// Хук-обёртка над контекстом языка: возвращает { t, lang, setLang, has }

import { useLanguage } from '../context/LanguageContext';

/**
 * useTranslation — удобный доступ к переводам и языковым настройкам.
 * @returns {{ t: (key: string, vars?: Record<string, string|number>) => string, lang: 'ru'|'kk'|'en', setLang: (code: 'ru'|'kk'|'en') => void, has: (key: string) => boolean }}
 */
export default function useTranslation() {
  const { t, lang, setLang, has } = useLanguage();
  return { t, lang, setLang, has };
}
