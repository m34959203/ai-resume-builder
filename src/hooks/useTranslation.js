// src/hooks/useTranslation.js
import { useContext, useMemo, useCallback } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { translations } from '../locales/translations';

/** Нормализация кода языка: 'kz' → 'kk', 'kk-KZ' → 'kk', 'ru-RU' → 'ru', 'en-US' → 'en' */
const SUPPORTED = ['ru', 'kk', 'en'];
const NORM_MAP = {
  kz: 'kk',
  'kk-kz': 'kk',
  'ru-ru': 'ru',
  'en-us': 'en',
  'en-gb': 'en',
};

function normLang(input) {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return 'ru';
  
  // Проверяем прямое совпадение в карте
  if (NORM_MAP[raw]) return NORM_MAP[raw];
  
  // Отсекаем региональную часть (xx-YY → xx)
  const base = raw.split(/[-_]/)[0];
  
  // Проверяем, входит ли базовая часть в список поддерживаемых
  return SUPPORTED.includes(base) ? base : 'ru';
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

  // Нормализуем входящий язык из контекста (подстраховка)
  const lang = useMemo(() => normLang(ctxLanguage), [ctxLanguage]);

  // Выбираем словарь с fallback-цепочкой: текущий → ru → en
  const dict = useMemo(() => {
    return translations?.[lang] || translations?.ru || {};
  }, [lang]);

  /** Перевод с fallback-логикой и форматированием плейсхолдеров */
  const t = useCallback((key, params) => {
    if (!key) return '';
    
    // 1) Текущий словарь
    let val = getByPath(dict, key);
    
    // 2) Fallback на русский
    if (val == null && lang !== 'ru' && translations?.ru) {
      val = getByPath(translations.ru, key);
    }
    
    // 3) Последний fallback на английский
    if (val == null && lang !== 'en' && translations?.en) {
      val = getByPath(translations.en, key);
    }
    
    // Если нашли строку — форматируем, иначе возвращаем ключ
    if (typeof val === 'string') return format(val, params);
    return key;
  }, [dict, lang]);

  /** Нормализуем всё, что летит в смену языка */
  const setLang = useCallback((code) => {
    changeLanguage(normLang(code));
  }, [changeLanguage]);

  // Возвращаем единое API с алиасами для совместимости
  return {
    t,
    language: lang,      // ✅ нормализованный язык
    changeLanguage: setLang,
    supportedLanguages,
    // Алиасы для обратной совместимости
    lang,                // ✅ алиас для language
    setLang,            // ✅ алиас для changeLanguage
  };
}