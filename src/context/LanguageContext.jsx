// src/context/LanguageContext.jsx
import React, {
  createContext, useCallback, useEffect, useMemo, useState
} from 'react';
import { useInRouterContext, useLocation, useNavigate } from 'react-router-dom';
import i18n from '../i18n/config';

export const LanguageContext = createContext({ lang: 'ru', setLang: () => {} });

// у тебя папка locales/kz → язык "kz"
const SUPPORTED = ['ru', 'kz', 'en'];

function normalizeLang(input) {
  const s = String(input || '').toLowerCase();
  if (SUPPORTED.includes(s)) return s;
  const base = s.split('-')[0]; // ru-RU → ru
  return SUPPORTED.includes(base) ? base : 'ru';
}

export default function LanguageProvider({ children }) {
  const inRouter = useInRouterContext();
  const location = inRouter ? useLocation() : null;
  const navigate = inRouter ? useNavigate() : null;

  const initial = useMemo(() => {
    // 1) ?lang=...
    if (inRouter && location) {
      const byUrl = new URLSearchParams(location.search).get('lang');
      if (byUrl) return normalizeLang(byUrl);
    }
    // 2) localStorage (i18next стандартный ключ)
    try {
      const saved = localStorage.getItem('i18nextLng') || localStorage.getItem('lang');
      if (saved) return normalizeLang(saved);
    } catch {}
    // 3) язык браузера
    return normalizeLang(typeof navigator !== 'undefined' ? navigator.language : 'ru');
  }, [inRouter, location]);

  const [lang, setLangState] = useState(initial);

  // 💡 КЛЮЧЕВОЕ: реально переключаем i18n при любом изменении lang
  useEffect(() => {
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang).catch(() => {});
    }
    try {
      localStorage.setItem('i18nextLng', lang);
      document.documentElement.lang = lang;
      document.documentElement.dir = 'ltr';
    } catch {}
  }, [lang]);

  const setLang = useCallback((next) => {
    const l = normalizeLang(next);
    setLangState(l);
    // синхронизируем URL, если есть Router
    if (inRouter && navigate && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', l);
      navigate(url.pathname + url.search + url.hash, { replace: true });
    }
  }, [inRouter, navigate]);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
