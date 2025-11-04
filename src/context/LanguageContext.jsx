import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { translations as ALL } from '../locales/translations';

// Доступные языки
const AVAILABLE = ['ru', 'kk', 'en'];

// Алиасы ключей (помогает, когда код запрашивает position, а в словаре — title)
const KEY_ALIASES = {
  'builder.personal.position': 'builder.personal.title',
  'builder.buttons.back': 'common.back',
  'builder.template.select': 'builder.template.select',       // оставлено для явности
  'builder.template.description': 'builder.template.description',
  'builder.template.selected': 'builder.template.selected',
};

function getByPath(obj, path) {
  return path.split('.').reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), obj);
}

function resolveT(lang, key, vars) {
  // 1) основной язык
  let value = getByPath(ALL?.[lang] || {}, key);

  // 2) алиас ключа
  if (value == null && KEY_ALIASES[key]) {
    value = getByPath(ALL?.[lang] || {}, KEY_ALIASES[key]);
  }

  // 3) fallback: RU → EN
  if (value == null) value = getByPath(ALL?.ru || {}, key);
  if (value == null && KEY_ALIASES[key]) value = getByPath(ALL?.ru || {}, KEY_ALIASES[key]);
  if (value == null) value = getByPath(ALL?.en || {}, key);
  if (value == null && KEY_ALIASES[key]) value = getByPath(ALL?.en || {}, KEY_ALIASES[key]);

  // 4) если всё ещё пусто — вернуть сам ключ (видно, что словаря нет)
  if (value == null) value = key;

  // 5) простая интерполяция {name}
  if (value && typeof value === 'string' && vars) {
    Object.entries(vars).forEach(([k, v]) => {
      value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }
  return value;
}

export const LanguageContext = createContext({
  lang: 'ru',
  setLang: () => {},
  t: (k) => k,
  available: AVAILABLE,
});

export function LanguageProvider({ children }) {
  const detect = () => {
    const saved = localStorage.getItem('app:lang');
    if (saved && AVAILABLE.includes(saved)) return saved;
    const nav = (navigator.language || 'ru').slice(0, 2).toLowerCase();
    return AVAILABLE.includes(nav) ? nav : 'ru';
  };

  const [lang, setLangState] = useState(detect);

  const setLang = useCallback((next) => {
    const safe = AVAILABLE.includes(next) ? next : 'ru';
    setLangState(safe);
    try {
      localStorage.setItem('app:lang', safe);
    } catch {}
  }, []);

  useEffect(() => {
    // обновляем <html lang="..">
    try {
      document.documentElement.setAttribute('lang', lang);
    } catch {}
  }, [lang]);

  const t = useCallback((key, vars) => resolveT(lang, key, vars), [lang]);

  const value = useMemo(
    () => ({ lang, setLang, t, available: AVAILABLE }),
    [lang, setLang, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// Доп. хук (если где-то нужен)
export const useLanguage = () => React.useContext(LanguageContext);

// На всякий случай экспорт по умолчанию — но в коде используем именованный
export default LanguageProvider;
