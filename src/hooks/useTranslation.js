// src/hooks/useTranslation.js
import { useContext, useCallback } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { translations as ALL } from '../locales/translations';

// На всякий случай — дефолтный список языков
const AVAILABLE = ['ru', 'kk', 'en'];

// Алиасы ключей: если в словаре одно имя поля, а в коде другое
const KEY_ALIASES = {
  'builder.personal.position': 'builder.personal.title', // позиция → title
  'builder.buttons.back': 'common.back',
  'builder.template.select': 'builder.template.select',
  'builder.template.description': 'builder.template.description',
  'builder.template.selected': 'builder.template.selected',
};

function getByPath(obj, path) {
  return path.split('.').reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), obj);
}

function format(str, params) {
  if (!params || typeof str !== 'string') return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`));
}

/**
 * Локальный fallback-резолвер: сначала lang, затем RU, затем EN.
 * Учитывает KEY_ALIASES и подставляет параметры {name}.
 */
function resolveFallback(lang, key, params) {
  const tryLang = (lng, k) => getByPath(ALL?.[lng] || {}, k);

  let val = tryLang(lang, key);
  if (val == null && KEY_ALIASES[key]) val = tryLang(lang, KEY_ALIASES[key]);

  if (val == null) val = tryLang('ru', key);
  if (val == null && KEY_ALIASES[key]) val = tryLang('ru', KEY_ALIASES[key]);

  if (val == null) val = tryLang('en', key);
  if (val == null && KEY_ALIASES[key]) val = tryLang('en', KEY_ALIASES[key]);

  if (val == null) return key; // последний рубеж — показываем ключ (видно, чего нет в словаре)
  return typeof val === 'string' ? format(val, params) : key;
}

export function useTranslation() {
  // Если провайдер не смонтирован, контекст будет пустым — предусмотрен fallback.
  const ctx = useContext(LanguageContext) || {};
  const lang = ctx.lang || 'ru';
  const available = ctx.available || AVAILABLE;

  const setLang = useCallback((next) => {
    if (typeof ctx.setLang === 'function') ctx.setLang(next);
  }, [ctx]);

  const t = useCallback(
    (key, params) => {
      // Нормальный путь: используем t из провайдера (он уже умный и быстрый)
      if (typeof ctx.t === 'function') return ctx.t(key, params);
      // Резерв: локально резолвим строку из словарей
      return resolveFallback(lang, key, params);
    },
    [ctx, lang]
  );

  return { t, lang, setLang, available };
}

// Удобный реэкспорт провайдера (чтобы можно было импортировать из одного места)
export { LanguageProvider } from '../context/LanguageContext';
export default useTranslation;
