// src/pdf/i18n.js
// Словари переводов для PDF-шаблонов. Ключи: experience, education, skills, contacts, about.

export const PDF_I18N = {
  ru: {
    experience: 'Опыт',
    education: 'Образование',
    skills: 'Навыки',
    contacts: 'Контакты',
    about: 'О себе',
  },
  kk: {
    experience: 'Тәжірибе',
    education: 'Білім',
    skills: 'Дағдылар',
    contacts: 'Байланыс',
    about: 'Өзім туралы',
  },
  en: {
    experience: 'Experience',
    education: 'Education',
    skills: 'Skills',
    contacts: 'Contacts',
    about: 'Summary',
  },
};

/**
 * Возвращает словарь для выбранного языка с fallback на ru.
 * @param {'ru'|'kk'|'en'} lang
 */
export function getPdfDict(lang = 'ru') {
  const code = typeof lang === 'string' ? lang.toLowerCase() : 'ru';
  return PDF_I18N[code] || PDF_I18N.ru;
}
