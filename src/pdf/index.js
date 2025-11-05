/**
 * PDF Generation Module
 * 
 * Централизованный экспорт всех PDF-связанных модулей
 * @module pdf
 */

// Шаблоны
export {
  default as TEMPLATES,
  Minimal,
  Modern,
  TEMPLATE_CONFIG,
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
  utils as templateUtils,
} from './templates';

// Метки локализации
export {
  pdfLabels,
  getLabels,
  getLabel,
} from './pdfLabels';

// Утилиты (если будут добавлены)
// export * from './utils';

/**
 * Генерация PDF-документа
 * @param {Object} options - Опции генерации
 * @param {Object} options.profile - Данные профиля
 * @param {string} options.templateId - ID шаблона
 * @param {string} options.language - Язык документа
 * @param {Object} options.theme - Кастомная тема
 * @returns {Promise<Blob>} Promise с PDF blob
 */
export async function generatePDF({ 
  profile, 
  templateId = 'modern', 
  language = 'ru',
  theme = null 
}) {
  // Динамический импорт @react-pdf/renderer
  const { pdf } = await import('@react-pdf/renderer');
  const { getTemplate, createTemplateProps } = await import('./templates');
  
  // Получаем компонент шаблона
  const Template = getTemplate(templateId);
  
  // Создаем props
  const templateProps = createTemplateProps({
    profile,
    templateId,
    language,
    theme,
  });
  
  // Генерируем PDF
  const blob = await pdf(
    React.createElement(Template, templateProps)
  ).toBlob();
  
  return blob;
}

/**
 * Скачивание PDF-файла
 * @param {Blob} blob - PDF blob
 * @param {string} filename - Имя файла
 */
export function downloadPDF(blob, filename = 'resume.pdf') {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Генерация имени файла на основе профиля
 * @param {Object} profile - Данные профиля
 * @param {string} language - Язык
 * @returns {string} Имя файла
 */
export function generateFilename(profile, language = 'ru') {
  const name = profile?.fullName || 'resume';
  const sanitized = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_\-]/gi, '');
  
  const timestamp = new Date().toISOString().split('T')[0];
  
  return `${sanitized}_${language}_${timestamp}.pdf`;
}

/**
 * Полный процесс генерации и скачивания PDF
 * @param {Object} options - Опции
 * @returns {Promise<void>}
 */
export async function generateAndDownload(options) {
  const { profile, templateId, language, theme } = options;
  
  try {
    // Генерируем PDF
    const blob = await generatePDF({
      profile,
      templateId,
      language,
      theme,
    });
    
    // Создаем имя файла
    const filename = generateFilename(profile, language);
    
    // Скачиваем
    downloadPDF(blob, filename);
    
    return { success: true, filename };
  } catch (error) {
    console.error('PDF generation error:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error' 
    };
  }
}

/**
 * Предпросмотр PDF в новом окне
 * @param {Blob} blob - PDF blob
 */
export function previewPDF(blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  
  // Освобождаем URL после небольшой задержки
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}