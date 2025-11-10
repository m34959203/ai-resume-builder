// src/pdf/templates/index.js
import Minimal from './minimal';
import Modern from './modern';
import Creative from './creative';
import Professional from './professional';

/**
 * Реестр шаблонов PDF.
 * Каждый шаблон — React-компонент с пропсами:
 *   { profile, theme, labels, t, lang, studentMode, flags, hints, pageInsets }
 */
export const TEMPLATES = {
  minimal: Minimal,
  modern: Modern,
  creative: Creative,
  professional: Professional,
};

/**
 * Каталог для выбора в UI (используйте ключи i18n из translations):
 *   t('builder.templates.minimal') и т.д.
 */
export const TEMPLATE_CATALOG = [
  { id: 'minimal',       nameI18nKey: 'builder.templates.minimal' },
  { id: 'modern',        nameI18nKey: 'builder.templates.modern' },
  { id: 'creative',      nameI18nKey: 'builder.templates.creative' },
  { id: 'professional',  nameI18nKey: 'builder.templates.professional' },
];

/** Безопасный геттер с фолбэком на 'minimal' */
export function getTemplate(id) {
  const key = (id && String(id).toLowerCase()) || 'minimal';
  return TEMPLATES[key] || Minimal;
}

export default TEMPLATES;
