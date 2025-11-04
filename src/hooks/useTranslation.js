import { useContext } from 'react';
import LanguageProvider, { LanguageContext } from '../context/LanguageContext';
import { translations } from '../locales/translations';

function getByPath(obj, path) {
  return path.split('.').reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), obj);
}

function format(str, params) {
  if (!params) return str;
  return String(str).replace(/\{(\w+)\}/g, (_, k) => (k in params ? params[k] : `{${k}}`));
}

export function useTranslation() {
  const { lang, setLang } = useContext(LanguageContext);
  const dict = translations[lang] || translations.ru;

  const t = (key, params) => {
    let val = getByPath(dict, key);
    if (val == null) val = getByPath(translations.ru, key);
    if (val == null) return key;
    if (typeof val === 'string') return format(val, params);
    return key; // если в словаре объект — вернём ключ
  };

  return { t, lang, setLang };
}

// Экспортируем провайдер, чтобы было удобно подключать
export { LanguageProvider };
export default useTranslation;
