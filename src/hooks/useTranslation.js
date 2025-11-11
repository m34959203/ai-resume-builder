// src/hooks/useTranslation.js
import { useContext, useMemo, useCallback } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { translations } from '../locales/translations';

/** Нормализация кода языка: 'kz' → 'kk', 'kk-KZ' → 'kk', 'ru-RU' → 'ru', 'en-US' → 'en' */
const NORM_MAP = {
  kz: 'kk',
  'kk-kz': 'kk',
  'ru-ru': 'ru',
  'en-us': 'en',
};
function normLang(input) {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return 'ru';
  if (NORM_MAP[raw]) return NORM_MAP[raw];
  // отсечь региональную часть (xx-YY → xx)
  const base = raw.split('-')[0];
  return base || 'ru';
}

/** Безопасное получение вложенного ключа: "resume.section.title" */
function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  return String(path)
    .split('.')
    .reduce((acc, k) =>
      acc && Object.prototype.hasOwnProperty.call(acc, k) ? acc[k] : undefined,
    obj);
}

/** Простое форматирование: "Hello, {name}!" + { name: "Dmitriy" } */
function format(str, params) {
  if (!params || typeof str !== 'string') return str;
  return str.replace(/\{(\w+)\}/g, (_, k) =>
    Object.prototype.hasOwnProperty.call(params, k) ? String(params[k]) : `{${k}}`
  );
}

export function useTranslation() {
  const { language: ctxLanguage, changeLanguage, supportedLanguages } = useContext(LanguageContext);

  // Нормализуем входящий язык из контекста (если туда попал 'kz' или 'ru-RU')
  const lang = useMemo(() => normLang(ctxLanguage), [ctxLanguage]);

  // Выбираем словарь: сначала по нормализованному языку, затем ru как базовый
  const dict = useMemo(() => {
    return translations?.[lang] || translations?.ru || {};
  }, [lang]);

  /** Перевод с fallback-логикой и форматированием плейсхолдеров */
  const t = useCallback((key, params) => {
    if (!key) return '';
    // 1) текущий словарь
    let val = getByPath(dict, key);
    // 2) запасной — русский
    if (val == null && translations?.ru) val = getByPath(translations.ru, key);
    // 3) последний шанс — английский (если есть)
    if (val == null && translations?.en) val = getByPath(translations.en, key);
    // если нашли строку — форматируем, иначе возвращаем ключ
    if (typeof val === 'string') return format(val, params);
    return key;
  }, [dict]);

  /** Нормализуем всё, что летит в смену языка */
  const setLang = useCallback((code) => changeLanguage(normLang(code)), [changeLanguage]);

  // Возвращаем новое API + алиасы для старого кода
  return {
    t,
    language: lang,
    changeLanguage: setLang,
    supportedLanguages,
    // алиасы для обратной совместимости
    lang,
    setLang,
  };
}
