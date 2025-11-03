// src/context/LanguageContext.jsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { translations } from "../locales/translations";

/** -------------------- Константы -------------------- */
export const SUPPORTED_LANGS = ["ru", "kk", "en"];
const LS_KEY = "app.lang";
const isBrowser = typeof window !== "undefined";

/** -------------------- Safe localStorage -------------------- */
function readLS(key) {
  try {
    return isBrowser ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}
function writeLS(key, value) {
  try {
    if (isBrowser) window.localStorage.setItem(key, value);
  } catch {
    /* no-op */
  }
}

/** -------------------- Определение стартового языка -------------------- */
function resolveInitialLang(initial) {
  if (initial && SUPPORTED_LANGS.includes(initial)) return initial;

  const saved = readLS(LS_KEY);
  if (saved && SUPPORTED_LANGS.includes(saved)) return saved;

  try {
    const nav =
      (isBrowser && (navigator?.language || navigator?.languages?.[0])) || "ru";
    const cand = String(nav).slice(0, 2).toLowerCase();
    if (SUPPORTED_LANGS.includes(cand)) return cand;
  } catch {
    /* ignore */
  }
  return "ru";
}

/** -------------------- Хелперы i18n -------------------- */
// Достаёт значение из объекта по ключу вида "a.b.c"
function getByPath(obj, path, fallback) {
  if (!obj || typeof path !== "string") return fallback;
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
      cur = cur[p];
    } else {
      return fallback;
    }
  }
  return cur;
}

// Примитивная подстановка переменных: "Привет, {name}"
function interpolate(str, vars = {}) {
  if (typeof str !== "string") return str;
  return str.replace(/\{(\w+)\}/g, (_, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : `{${k}}`
  );
}

/** -------------------- Контекст языка -------------------- */
export const LanguageContext = createContext({
  lang: "ru",
  setLang: /** @type {(lang: 'ru'|'kk'|'en') => void} */ (() => {}),
  t: /** @type {(key: string, vars?: Record<string,string|number>) => string} */ (
    (key) => key
  ),
  has: /** @type {(key: string) => boolean} */ (() => false),
  SUPPORTED: SUPPORTED_LANGS,
});

/** -------------------- Провайдер -------------------- */
export function LanguageProvider({ children, initial }) {
  const [lang, setLangState] = useState(() => resolveInitialLang(initial));

  // Проставляем <html lang>, <html dir>, <body data-lang>
  useEffect(() => {
    if (!isBrowser) return;
    try {
      document.documentElement.setAttribute("lang", lang);
      // Все поддерживаемые языки — LTR
      document.documentElement.setAttribute("dir", "ltr");
      document.body?.setAttribute("data-lang", lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  // Смена языка (с записью в LS)
  const setLang = useCallback((next) => {
    const safe = SUPPORTED_LANGS.includes(next) ? next : "ru";
    setLangState(safe);
    writeLS(LS_KEY, safe);
    if (isBrowser) {
      try {
        document.documentElement.setAttribute("lang", safe);
        document.body?.setAttribute("data-lang", safe);
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Синхронизация языка между вкладками/окнами
  useEffect(() => {
    if (!isBrowser) return;
    const onStorage = (e) => {
      if (e.key === LS_KEY && e.newValue && SUPPORTED_LANGS.includes(e.newValue)) {
        setLangState(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Функция перевода
  const t = useCallback(
    (key, vars) => {
      const pack = translations?.[lang] ?? translations?.ru ?? {};
      const fallbackPack = translations?.ru ?? {};
      const raw =
        getByPath(pack, key, undefined) ??
        getByPath(fallbackPack, key, undefined) ??
        key;
      return interpolate(raw, vars);
    },
    [lang]
  );

  // Проверка наличия ключа
  const has = useCallback(
    (key) => {
      const pack = translations?.[lang] ?? translations?.ru ?? {};
      return getByPath(pack, key, undefined) !== undefined;
    },
    [lang]
  );

  const value = useMemo(
    () => ({ lang, setLang, t, has, SUPPORTED: SUPPORTED_LANGS }),
    [lang, setLang, t, has]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

/** -------------------- Хук доступа -------------------- */
export function useLanguage() {
  return useContext(LanguageContext);
}

/** Дефолтный экспорт — для обратной совместимости */
export default LanguageContext;
