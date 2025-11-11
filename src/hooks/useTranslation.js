import { useContext, useMemo } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { translations } from '../locales/translations'; // оставляем твой словарь

export function useTranslation() {
  const { language, changeLanguage, supportedLanguages } = useContext(LanguageContext);
  const dict = translations?.[language] || translations?.ru || {};

  const t = useMemo(() => {
    return (key) => {
      if (!key) return '';
      const val = String(key)
        .split('.')
        .reduce((acc, k) => (acc && Object.prototype.hasOwnProperty.call(acc, k) ? acc[k] : undefined), dict);
      return val == null ? key : val;
    };
  }, [dict]);

  return { t, language, changeLanguage, supportedLanguages, lang: language, setLang: changeLanguage };
}
