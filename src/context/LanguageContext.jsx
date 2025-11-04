import React, { createContext, useCallback, useEffect, useMemo, useState, useContext } from 'react';
import { translations } from '../locales/translations';

const SUPPORTED = ['ru', 'kk', 'en'];
const DEFAULT_LANG = 'ru';

function detectInitialLang() {
  // 1) localStorage → 2) navigator → 3) дефолт
  const fromLs = typeof window !== 'undefined' ? localStorage.getItem('lang') : null;
  if (fromLs && SUPPORTED.includes(fromLs)) return fromLs;

  const nav = typeof navigator !== 'undefined' ? (navigator.language || navigator.userLanguage || '') : '';
  const short = nav.toLowerCase().slice(0, 2);
  if (SUPPORTED.includes(short)) return short;

  return DEFAULT_LANG;
}

// Достаём строку по пути вида "a.b.c" из словаря
function getByPath(dict, path) {
  if (!dict || !path) return undefined;
  return path.split('.').reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), dict);
}

export const LanguageContext = createContext({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key) => key,
  dict: translations[DEFAULT_LANG],
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectInitialLang);

  const setLang = useCallback((next) => {
    const safe = SUPPORTED.includes(next) ? next : DEFAULT_LANG;
    setLangState(safe);
    try {
      localStorage.setItem('lang', safe);
    } catch {}
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('lang', safe);
      }
    } catch {}
  }, []);

  useEffect(() => {
    // На монт выставим html[lang] и восстановим из LS (если нужно)
    setLang(lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dict = useMemo(() => translations[lang] || translations[DEFAULT_LANG] || translations.en || {}, [lang]);

  const t = useCallback(
    (key) => {
      // Точное значение в текущем языке
      let v = getByPath(dict, key);
      if (v == null) v = getByPath(translations[DEFAULT_LANG], key);
      if (v == null) v = getByPath(translations.en || {}, key);
      return v == null ? key : v;
    },
    [dict],
  );

  const value = useMemo(() => ({ lang, setLang, t, dict }), [lang, setLang, t, dict]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// Удобный хук (если где-то используется напрямую)
export function useLanguage() {
  return useContext(LanguageContext);
}

// На всякий пожарный — дефолтный экспорт тем же именем
export default LanguageProvider;
