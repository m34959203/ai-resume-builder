import { useContext, useMemo } from 'react';
import { LanguageContext } from '../context/LanguageContext';

// Хук возвращает { t, lang, setLang }
export function useTranslation() {
  const ctx = useContext(LanguageContext);

  // Оборачиваем t, чтобы всегда был стабилен по ссылке для мемо-хуков компонентов
  const t = ctx?.t || ((k) => k);

  return useMemo(
    () => ({
      t,
      lang: ctx?.lang || 'ru',
      setLang: ctx?.setLang || (() => {}),
    }),
    [t, ctx?.lang, ctx?.setLang],
  );
}

export default useTranslation;
