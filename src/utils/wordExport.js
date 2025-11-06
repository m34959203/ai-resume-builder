import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel,
  AlignmentType,
  UnderlineType,
  convertInchesToTwip
} from 'docx';
import { saveAs } from 'file-saver';
import { formatDate } from '../i18n/languages';

// ============================================
// 📚 ПЕРЕВОДЫ ДЛЯ WORD
// ============================================

const wordTranslations = {
  ru: {
    // Секции
    personalInfo: 'Личная информация',
    summary: 'О себе',
    experience: 'Опыт работы',
    education: 'Образование',
    skills: 'Навыки',
    languages: 'Языки',
    projects: 'Проекты',
    certifications: 'Сертификаты',
    
    // Поля
    email: 'Email',
    phone: 'Телефон',
    location: 'Местоположение',
    current: 'По настоящее время',
    achievements: 'Достижения',
    degree: 'Степень',
    field: 'Специальность',
    institution: 'Учебное заведение',
    proficiency: 'Уровень',
  },
  kz: {
    personalInfo: 'Жеке ақпарат',
    summary: 'Өзім туралы',
    experience: 'Жұмыс тәжірибесі',
    education: 'Білім',
    skills: 'Дағдылар',
    languages: 'Тілдер',
    projects: 'Жобалар',
    certifications: 'Сертификаттар',
    
    email: 'Email',
    phone: 'Телефон',
    location: 'Орналасқан жері',
    current: 'Қазіргі уақытта',
    achievements: 'Жетістіктер',
    degree: 'Дәреже',
    field: 'Мамандығы',
    institution: 'Оқу орны',
    proficiency: 'Деңгейі',
  },
  en: {
    personalInfo: 'Personal Information',
    summary: 'Summary',
    experience: 'Work Experience',
    education: 'Education',
    skills: 'Skills',
    languages: 'Languages',
    projects: 'Projects',
    certifications: 'Certifications',
    
    email: 'Email',
    phone: 'Phone',
    location: 'Location',
    current: 'Present',
    achievements: 'Achievements',
    degree: 'Degree',
    field: 'Field of Study',
    institution: 'Institution',
    proficiency: 'Proficiency',
  }
};

// ============================================
// 🎨 СТИЛИ
// ============================================

const styles = {
  margins: {
    top: convertInchesToTwip(0.75),
    bottom: convertInchesToTwip(0.75),
    left: convertInchesToTwip(0.75),
    right: convertInchesToTwip(0.75),
  }
};

// ============================================
// 📝 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

/**
 * Создать параграф с секцией
 */
function createSectionHeading(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: {
      before: 300,
      after: 150,
    },
  });
}

/**
 * Создать подзаголовок
 */
function createSubHeading(text) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 24, // 12pt
      }),
    ],
    spacing: {
      before: 150,
      after: 100,
    },
  });
}

/**
 * Создать обычный параграф
 */
function createTextParagraph(text) {
  if (!text || text.trim().length === 0) {
    return null;
  }
  
  return new Paragraph({
    text,
    spacing: {
      after: 100,
    },
  });
}

/**
 * Создать список (bullet points)
 */
function createBulletList(items) {
  if (!items || items.length === 0) {
    return [];
  }
  
  return items.map(item => 
    new Paragraph({
      text: item,
      bullet: {
        level: 0,
      },
      spacing: {
        after: 50,
      },
    })
  );
}

/**
 * Форматировать дату
 */
function formatDateRange(startDate, endDate, current, language) {
  const t = wordTranslations[language];
  const start = startDate ? formatDate(startDate, { year: 'numeric', month: 'short' }) : '';
  const end = current 
    ? t.current 
    : endDate 
      ? formatDate(endDate, { year: 'numeric', month: 'short' }) 
      : '';
  
  if (!start && !end) return '';
  
  return `${start} - ${end}`;
}

// ============================================
// 📄 ОСНОВНАЯ ФУНКЦИЯ ЭКСПОРТА
// ============================================

/**
 * Экспорт резюме в Word
 * @param {Object} resumeData - Данные резюме
 * @param {string} language - Язык (ru, kz, en)
 */
export async function exportToWord(resumeData, language = 'ru') {
  const t = wordTranslations[language] || wordTranslations.ru;
  const children = [];

  try {
    // ============================================
    // HEADER: Имя и должность
    // ============================================
    
    if (resumeData.fullName) {
      children.push(
        new Paragraph({
          text: resumeData.fullName,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 150,
          },
        })
      );
    }

    if (resumeData.position) {
      children.push(
        new Paragraph({
          text: resumeData.position,
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 300,
          },
        })
      );
    }

    // ============================================
    // КОНТАКТНАЯ ИНФОРМАЦИЯ
    // ============================================
    
    const contactInfo = [];
    
    if (resumeData.email) {
      contactInfo.push(`${t.email}: ${resumeData.email}`);
    }
    
    if (resumeData.phone) {
      contactInfo.push(`${t.phone}: ${resumeData.phone}`);
    }
    
    if (resumeData.location || resumeData.city) {
      const location = resumeData.location || resumeData.city;
      contactInfo.push(`${t.location}: ${location}`);
    }

    if (contactInfo.length > 0) {
      children.push(
        new Paragraph({
          text: contactInfo.join(' | '),
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 300,
          },
        })
      );
    }

    // ============================================
    // SUMMARY / О СЕБЕ
    // ============================================
    
    if (resumeData.summary) {
      children.push(createSectionHeading(t.summary));
      
      const summaryParagraph = createTextParagraph(resumeData.summary);
      if (summaryParagraph) {
        children.push(summaryParagraph);
      }
    }

    // ============================================
    // ОПЫТ РАБОТЫ
    // ============================================
    
    if (resumeData.experience && resumeData.experience.length > 0) {
      children.push(createSectionHeading(t.experience));

      resumeData.experience.forEach(exp => {
        // Должность и компания
        children.push(
          new Paragraph({
            children: [
              new TextRun({ 
                text: exp.position, 
                bold: true,
                size: 24,
              }),
              new TextRun(` - ${exp.company}`),
            ],
            spacing: {
              before: 150,
              after: 50,
            },
          })
        );

        // Даты
        const dateRange = formatDateRange(
          exp.startDate, 
          exp.endDate, 
          exp.current, 
          language
        );
        
        if (dateRange) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: dateRange,
                  italics: true,
                }),
              ],
              spacing: {
                after: 100,
              },
            })
          );
        }

        // Описание
        const descParagraph = createTextParagraph(exp.description);
        if (descParagraph) {
          children.push(descParagraph);
        }

        // Достижения
        if (exp.achievements && exp.achievements.length > 0) {
          children.push(
            new Paragraph({
              text: t.achievements + ':',
              spacing: {
                before: 50,
                after: 50,
              },
            })
          );
          
          children.push(...createBulletList(exp.achievements));
        }
      });
    }

    // ============================================
    // ОБРАЗОВАНИЕ
    // ============================================
    
    if (resumeData.education && resumeData.education.length > 0) {
      children.push(createSectionHeading(t.education));

      resumeData.education.forEach(edu => {
        // Степень и специальность
        const degreeText = [
          edu.degree,
          edu.field ? `- ${edu.field}` : '',
        ].filter(Boolean).join(' ');

        if (degreeText) {
          children.push(createSubHeading(degreeText));
        }

        // Учебное заведение
        if (edu.institution) {
          children.push(
            new Paragraph({
              text: edu.institution,
              spacing: {
                after: 50,
              },
            })
          );
        }

        // Даты
        const dateRange = formatDateRange(
          edu.startDate, 
          edu.endDate, 
          false, 
          language
        );
        
        if (dateRange) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: dateRange,
                  italics: true,
                }),
              ],
              spacing: {
                after: 100,
              },
            })
          );
        }

        // GPA (если есть)
        if (edu.gpa) {
          children.push(
            new Paragraph({
              text: `GPA: ${edu.gpa}`,
              spacing: {
                after: 100,
              },
            })
          );
        }
      });
    }

    // ============================================
    // НАВЫКИ
    // ============================================
    
    if (resumeData.skills && resumeData.skills.length > 0) {
      children.push(createSectionHeading(t.skills));
      
      // Группируем навыки по 5 в строку для компактности
      const skillsText = resumeData.skills.join(' • ');
      
      children.push(
        new Paragraph({
          text: skillsText,
          spacing: {
            after: 100,
          },
        })
      );
    }

    // ============================================
    // ЯЗЫКИ
    // ============================================
    
    if (resumeData.languages && resumeData.languages.length > 0) {
      children.push(createSectionHeading(t.languages));

      resumeData.languages.forEach(lang => {
        const langText = [
          lang.name || lang.language,
          lang.proficiency ? `(${lang.proficiency})` : '',
        ].filter(Boolean).join(' ');

        children.push(
          new Paragraph({
            text: `• ${langText}`,
            spacing: {
              after: 50,
            },
          })
        );
      });
    }

    // ============================================
    // ПРОЕКТЫ (если есть)
    // ============================================
    
    if (resumeData.projects && resumeData.projects.length > 0) {
      children.push(createSectionHeading(t.projects));

      resumeData.projects.forEach(project => {
        // Название проекта
        if (project.name) {
          children.push(createSubHeading(project.name));
        }

        // Описание
        const descParagraph = createTextParagraph(project.description);
        if (descParagraph) {
          children.push(descParagraph);
        }

        // Технологии
        if (project.technologies && project.technologies.length > 0) {
          children.push(
            new Paragraph({
              text: `Technologies: ${project.technologies.join(', ')}`,
              spacing: {
                after: 100,
              },
            })
          );
        }

        // URL
        if (project.url) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: project.url,
                  style: 'Hyperlink',
                }),
              ],
              spacing: {
                after: 100,
              },
            })
          );
        }
      });
    }

    // ============================================
    // СЕРТИФИКАТЫ (если есть)
    // ============================================
    
    if (resumeData.certifications && resumeData.certifications.length > 0) {
      children.push(createSectionHeading(t.certifications));

      resumeData.certifications.forEach(cert => {
        const certText = [
          cert.name,
          cert.issuer ? `- ${cert.issuer}` : '',
          cert.issueDate ? `(${formatDate(cert.issueDate, { year: 'numeric', month: 'short' })})` : '',
        ].filter(Boolean).join(' ');

        children.push(
          new Paragraph({
            text: `• ${certText}`,
            spacing: {
              after: 50,
            },
          })
        );
      });
    }

    // ============================================
    // СОЗДАНИЕ ДОКУМЕНТА
    // ============================================
    
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: styles.margins,
          },
        },
        children,
      }],
    });

    // ============================================
    // ЭКСПОРТ
    // ============================================
    
    const blob = await Packer.toBlob(doc);
    const fileName = `${resumeData.fullName || 'resume'}_${language}.docx`;
    saveAs(blob, fileName);
    
    console.log(`✅ Resume exported to ${fileName}`);
    
    return { success: true, fileName };

  } catch (error) {
    console.error('❌ Word export failed:', error);
    throw new Error(`Failed to export resume: ${error.message}`);
  }
}

/**
 * Экспорт с AI переводом
 * @param {Object} resumeData - Данные резюме
 * @param {string} language - Язык
 * @param {Function} translateFn - Функция перевода из useAITranslation
 */
export async function exportToWordWithTranslation(resumeData, language, translateFn) {
  if (language === 'ru') {
    // Если русский - экспортируем как есть
    return exportToWord(resumeData, language);
  }

  console.log(`🌐 Translating resume to ${language}...`);
  
  try {
    // Переводим резюме через AI
    const translatedData = await translateFn(resumeData);
    
    // Экспортируем переведенное резюме
    return exportToWord(translatedData, language);
    
  } catch (error) {
    console.error('❌ Translation failed, exporting original:', error);
    // Fallback: экспортируем оригинал
    return exportToWord(resumeData, language);
  }
}