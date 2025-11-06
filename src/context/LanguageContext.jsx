// src/context/LanguageContext.jsx
import React, { createContext, useCallback, useMemo, useState } from 'react';
import { useInRouterContext, useLocation, useNavigate } from 'react-router-dom';

export const LanguageContext = createContext({ lang: 'ru', setLang: () => {} });

// ВНИМАНИЕ: у тебя папка locales/kz → язык "kz"
const SUPPORTED = ['ru', 'kz', 'en'];

function normalizeLang(input) {
  const s = String(input || '').toLowerCase();
  if (SUPPORTED.includes(s)) return s;
  const base = s.split('-')[0]; // ru-RU -> ru
  return SUPPORTED.includes(base) ? base : 'ru';
}

export default function LanguageProvider({ children }) {
  const inRouter = useInRouterContext();
  const location = inRouter ? useLocation() : null;
  const navigate = inRouter ? useNavigate() : null;

  const initial = useMemo(() => {
    if (inRouter && location) {
      const byUrl = new URLSearchParams(location.search).get('lang');
      if (byUrl) return normalizeLang(byUrl);
    }
    try {
      const saved = localStorage.getItem('lang');
      if (saved) return normalizeLang(saved);
    } catch {}
    const nav = typeof navigator !== 'undefined' ? navigator.language : 'ru';
    return normalizeLang(nav);
  }, [inRouter, location]);

  const [lang, setLangState] = useState(initial);

  const setLang = useCallback((next) => {
    const l = normalizeLang(next);
    setLangState(l);
    try { localStorage.setItem('lang', l); } catch {}
    if (inRouter && navigate && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', l);
      navigate(url.pathname + url.search + url.hash, { replace: true });
    }
  }, [inRouter, navigate]);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
