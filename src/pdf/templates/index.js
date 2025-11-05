/**
 * PDF Resume Templates
 * 
 * Коллекция профессиональных шаблонов для генерации PDF-резюме
 * с поддержкой мультиязычности (EN, KK, RU)
 * 
 * @module pdf/templates
 */

import Minimal from './minimal';
import Modern from './modern';

/**
 * Метаданные шаблонов
 * @typedef {Object} TemplateMetadata
 * @property {string} id - Уникальный идентификатор шаблона
 * @property {string} name - Название шаблона
 * @property {string} description - Описание шаблона
 * @property {React.Component} component - Компонент шаблона
 * @property {string} preview - URL превью шаблона
 * @property {string[]} features - Особенности шаблона
 * @property {Object} defaultTheme - Тема по умолчанию
 */

/**
 * Конфигурация доступных шаблонов
 */
export const TEMPLATE_CONFIG = {
  minimal: {
    id: 'minimal',
    name: {
      en: 'Minimal',
      kk: 'Минималды',
      ru: 'Минималистичный',
    },
    description: {
      en: 'Clean and simple design with two-column layout',
      kk: 'Екі бағанды таза және қарапайым дизайн',
      ru: 'Чистый и простой дизайн с двухколоночной компоновкой',
    },
    component: Minimal,
    preview: '/templates/minimal-preview.png',
    features: [
      'two-column-layout',
      'sidebar-contacts',
      'bullet-points',
      'clean-typography',
    ],
    defaultTheme: {
      accent: '#16a34a', // Green
      primary: '#1F2937',
      secondary: '#6B7280',
    },
    recommended: {
      industries: ['tech', 'finance', 'consulting'],
      experience: ['entry', 'mid', 'senior'],
    },
  },
  
  modern: {
    id: 'modern',
    name: {
      en: 'Modern',
      kk: 'Заманауи',
      ru: 'Современный',
    },
    description: {
      en: 'Professional design with dark sidebar and accent colors',
      kk: 'Қараңғы бүйір панелі мен екпінді түстері бар кәсіби дизайн',
      ru: 'Профессиональный дизайн с темным сайдбаром и акцентными цветами',
    },
    component: Modern,
    preview: '/templates/modern-preview.png',
    features: [
      'dark-sidebar',
      'photo-support',
      'accent-colors',
      'section-dividers',
    ],
    defaultTheme: {
      accent: '#3B82F6', // Blue
      primary: '#243447',
      secondary: '#E5E7EB',
    },
    recommended: {
      industries: ['creative', 'tech', 'marketing'],
      experience: ['entry', 'mid', 'senior', 'executive'],
    },
  },
};

/**
 * Маппинг ID шаблонов на компоненты
 */
const TEMPLATES = {
  minimal: Minimal,
  modern: Modern,
};

/**
 * Получить компонент шаблона по ID
 * @param {string} templateId - ID шаблона
 * @returns {React.Component|null} Компонент шаблона или null
 */
export const getTemplate = (templateId) => {
  if (!templateId || typeof templateId !== 'string') {
    console.warn('Invalid template ID provided:', templateId);
    return TEMPLATES.modern; // Возвращаем modern по умолчанию
  }
  
  const template = TEMPLATES[templateId.toLowerCase()];
  
  if (!template) {
    console.warn(`Template "${templateId}" not found, using "modern" as fallback`);
    return TEMPLATES.modern;
  }
  
  return template;
};

/**
 * Получить метаданные шаблона
 * @param {string} templateId - ID шаблона
 * @returns {TemplateMetadata|null} Метаданные шаблона
 */
export const getTemplateMetadata = (templateId) => {
  return TEMPLATE_CONFIG[templateId] || null;
};

/**
 * Получить все доступные шаблоны
 * @returns {Object} Объект с шаблонами
 */
export const getAllTemplates = () => {
  return { ...TEMPLATES };
};

/**
 * Получить список ID всех шаблонов
 * @returns {string[]} Массив ID шаблонов
 */
export const getTemplateIds = () => {
  return Object.keys(TEMPLATES);
};

/**
 * Проверить существование шаблона
 * @param {string} templateId - ID шаблона
 * @returns {boolean} true если шаблон существует
 */
export const hasTemplate = (templateId) => {
  return templateId in TEMPLATES;
};

/**
 * Получить название шаблона на нужном языке
 * @param {string} templateId - ID шаблона
 * @param {string} language - Код языка ('en', 'kk', 'ru')
 * @returns {string} Название шаблона
 */
export const getTemplateName = (templateId, language = 'ru') => {
  const metadata = getTemplateMetadata(templateId);
  if (!metadata) return templateId;
  
  return metadata.name[language] || metadata.name.en || templateId;
};

/**
 * Получить описание шаблона на нужном языке
 * @param {string} templateId - ID шаблона
 * @param {string} language - Код языка ('en', 'kk', 'ru')
 * @returns {string} Описание шаблона
 */
export const getTemplateDescription = (templateId, language = 'ru') => {
  const metadata = getTemplateMetadata(templateId);
  if (!metadata) return '';
  
  return metadata.description[language] || metadata.description.en || '';
};

/**
 * Получить тему по умолчанию для шаблона
 * @param {string} templateId - ID шаблона
 * @returns {Object} Объект темы
 */
export const getDefaultTheme = (templateId) => {
  const metadata = getTemplateMetadata(templateId);
  return metadata?.defaultTheme || { accent: '#3B82F6' };
};

/**
 * Валидация данных профиля
 * @param {Object} profile - Объект профиля
 * @returns {Object} Результат валидации { isValid, errors, warnings }
 */
export const validateProfile = (profile) => {
  const errors = [];
  const warnings = [];
  
  // Обязательные поля
  if (!profile?.fullName?.trim()) {
    errors.push('Full name is required');
  }
  
  if (!profile?.email?.trim()) {
    errors.push('Email is required');
  }
  
  if (!profile?.phone?.trim()) {
    errors.push('Phone is required');
  }
  
  // Рекомендованные поля
  if (!profile?.summary?.trim()) {
    warnings.push('Professional summary is recommended');
  }
  
  if (!Array.isArray(profile?.experience) || profile.experience.length === 0) {
    warnings.push('Work experience is highly recommended');
  }
  
  if (!Array.isArray(profile?.skills) || profile.skills.length < 3) {
    warnings.push('At least 3 skills are recommended');
  }
  
  if (!Array.isArray(profile?.education) || profile.education.length === 0) {
    warnings.push('Education information is recommended');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Подготовка данных профиля для рендеринга
 * @param {Object} profile - Сырые данные профиля
 * @returns {Object} Подготовленные данные
 */
export const prepareProfileData = (profile) => {
  if (!profile) {
    return {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      summary: '',
      experience: [],
      education: [],
      skills: [],
      languages: [],
    };
  }
  
  return {
    ...profile,
    // Обеспечиваем что массивы всегда массивы
    experience: Array.isArray(profile.experience) ? profile.experience : [],
    education: Array.isArray(profile.education) ? profile.education : [],
    skills: Array.isArray(profile.skills) ? profile.skills : [],
    languages: Array.isArray(profile.languages) ? profile.languages : [],
    certifications: Array.isArray(profile.certifications) ? profile.certifications : [],
    projects: Array.isArray(profile.projects) ? profile.projects : [],
    
    // Очистка строк
    fullName: String(profile.fullName || '').trim(),
    email: String(profile.email || '').trim(),
    phone: String(profile.phone || '').trim(),
    location: String(profile.location || '').trim(),
    summary: String(profile.summary || '').trim(),
    position: String(profile.position || '').trim(),
  };
};

/**
 * Создание props для компонента шаблона
 * @param {Object} options - Опции
 * @param {Object} options.profile - Данные профиля
 * @param {string} options.templateId - ID шаблона
 * @param {string} options.language - Язык документа
 * @param {Object} options.theme - Кастомная тема (опционально)
 * @returns {Object} Props для компонента
 */
export const createTemplateProps = ({ 
  profile, 
  templateId = 'modern', 
  language = 'ru',
  theme = null 
}) => {
  const preparedProfile = prepareProfileData(profile);
  const defaultTheme = getDefaultTheme(templateId);
  const finalTheme = theme ? { ...defaultTheme, ...theme } : defaultTheme;
  
  return {
    profile: preparedProfile,
    theme: finalTheme,
    language,
  };
};

/**
 * Получить рекомендуемый шаблон на основе профиля
 * @param {Object} profile - Данные профиля
 * @returns {string} ID рекомендуемого шаблона
 */
export const getRecommendedTemplate = (profile) => {
  // Если есть фото - рекомендуем Modern
  if (profile?.photo || profile?.photoUrl) {
    return 'modern';
  }
  
  // Если много опыта - Modern более подходит
  if (Array.isArray(profile?.experience) && profile.experience.length >= 3) {
    return 'modern';
  }
  
  // Для начинающих специалистов - Minimal
  if (!profile?.experience || profile.experience.length === 0) {
    return 'minimal';
  }
  
  // По умолчанию Modern
  return 'modern';
};

// Экспорты
export { Minimal, Modern };
export default TEMPLATES;

/**
 * Дополнительные утилиты
 */
export const utils = {
  getTemplate,
  getTemplateMetadata,
  getAllTemplates,
  getTemplateIds,
  hasTemplate,
  getTemplateName,
  getTemplateDescription,
  getDefaultTheme,
  validateProfile,
  prepareProfileData,
  createTemplateProps,
  getRecommendedTemplate,
};