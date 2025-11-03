import { useTranslation as useI18n } from 'react-i18next';

export default function useTranslation() {
  const { t, i18n } = useI18n();
  const lang = i18n.resolvedLanguage || i18n.language;

  const setLang = (code) => {
    i18n.changeLanguage(code);               // <-- переключаем i18next
    localStorage.setItem('lang', code);
    document.documentElement.lang = code;
  };

  return { t, lang, setLang };
}
