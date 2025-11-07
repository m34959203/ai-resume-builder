import { useContext, useMemo } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { translations } from '../locales/translations';

function get(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj);
}

function format(str, params) {
  if (!params) return str;
  return String(str).replace(/\{(\w+)\}/g, (_, k) => (k in params ? params[k] : `{${k}}`));
}

export function useTranslation() {
  const { language, changeLanguage, supportedLanguages } = useContext(LanguageContext);

  const dict = useMemo(() => translations[language] || translations.ru, [language]);

  const t = (key, params) => {
    let val = get(dict, key);
    if (val == null) val = get(translations.ru, key); // fallback → ru
    if (val == null) return key;
    if (typeof val === 'string') return format(val, params);
    return key;
  };

  return { t, language, changeLanguage, supportedLanguages };
}
