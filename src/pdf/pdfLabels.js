/**
 * Мультиязычные метки для PDF-резюме
 * Используется в шаблонах для корректного отображения на разных языках
 */

export const pdfLabels = {
  en: {
    // Основные секции
    summary: 'Professional Summary',
    experience: 'Work Experience',
    education: 'Education',
    educationDetails: 'Education Details',
    skills: 'Skills',
    languages: 'Languages',
    certifications: 'Certifications',
    projects: 'Projects',
    references: 'References',
    profile: 'Profile',
    
    // Контакты
    contact: 'Contact',
    email: 'Email',
    phone: 'Phone',
    location: 'Location',
    website: 'Website',
    linkedin: 'LinkedIn',
    github: 'GitHub',
    
    // Личная информация
    personalInfo: 'Personal Information',
    age: 'Age',
    maritalStatus: 'Marital Status',
    children: 'Children',
    license: 'Driver\'s License',
    nationality: 'Nationality',
    
    // Опыт работы
    position: 'Position',
    company: 'Company',
    present: 'Present',
    responsibilities: 'Responsibilities & Achievements',
    duties: 'Key Duties',
    achievements: 'Achievements',
    
    // Образование
    degree: 'Degree',
    institution: 'Institution',
    field: 'Field of Study',
    major: 'Major',
    gpa: 'GPA',
    
    // Навыки и языки
    skillLevel: 'Level',
    proficiency: 'Proficiency',
    
    // Уровни владения языком
    languageLevels: {
      basic: 'Basic',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      fluent: 'Fluent',
      native: 'Native',
    },
    
    // Дефолтные значения
    defaultName: 'FULL NAME',
    noData: 'No data provided',
  },
  
  kk: {
    // Основные секции
    summary: 'Кәсіби түйіндеме',
    experience: 'Жұмыс тәжірибесі',
    education: 'Білім',
    educationDetails: 'Білім туралы толық ақпарат',
    skills: 'Дағдылар',
    languages: 'Тілдер',
    certifications: 'Сертификаттар',
    projects: 'Жобалар',
    references: 'Ұсынымдар',
    profile: 'Профиль',
    
    // Контакты
    contact: 'Байланыс',
    email: 'Email',
    phone: 'Телефон',
    location: 'Орналасқан жері',
    website: 'Веб-сайт',
    linkedin: 'LinkedIn',
    github: 'GitHub',
    
    // Личная информация
    personalInfo: 'Жеке ақпарат',
    age: 'Жасы',
    maritalStatus: 'Отбасылық жағдайы',
    children: 'Балалар',
    license: 'Жүргізуші куәлігі',
    nationality: 'Ұлты',
    
    // Опыт работы
    position: 'Лауазым',
    company: 'Компания',
    present: 'Қазіргі уақыт',
    responsibilities: 'Міндеттер мен жетістіктер',
    duties: 'Негізгі міндеттер',
    achievements: 'Жетістіктер',
    
    // Образование
    degree: 'Дәреже',
    institution: 'Оқу орны',
    field: 'Мамандық',
    major: 'Бағыт',
    gpa: 'Орташа балл',
    
    // Навыки и языки
    skillLevel: 'Деңгей',
    proficiency: 'Меңгеру деңгейі',
    
    // Уровни владения языком
    languageLevels: {
      basic: 'Базалық',
      intermediate: 'Орташа',
      advanced: 'Жоғары',
      fluent: 'Еркін',
      native: 'Ана тілі',
    },
    
    // Дефолтные значения
    defaultName: 'ТОЛЫҚ АТЫ-ЖӨНІ',
    noData: 'Деректер жоқ',
  },
  
  ru: {
    // Основные секции
    summary: 'Профессиональное резюме',
    experience: 'Опыт работы',
    education: 'Образование',
    educationDetails: 'Подробная информация об образовании',
    skills: 'Навыки',
    languages: 'Языки',
    certifications: 'Сертификаты',
    projects: 'Проекты',
    references: 'Рекомендации',
    profile: 'Профиль',
    
    // Контакты
    contact: 'Контакты',
    email: 'Email',
    phone: 'Телефон',
    location: 'Местоположение',
    website: 'Веб-сайт',
    linkedin: 'LinkedIn',
    github: 'GitHub',
    
    // Личная информация
    personalInfo: 'Личная информация',
    age: 'Возраст',
    maritalStatus: 'Семейное положение',
    children: 'Дети',
    license: 'Водительские права',
    nationality: 'Национальность',
    
    // Опыт работы
    position: 'Должность',
    company: 'Компания',
    present: 'Настоящее время',
    responsibilities: 'Обязанности и достижения',
    duties: 'Ключевые обязанности',
    achievements: 'Достижения',
    
    // Образование
    degree: 'Степень',
    institution: 'Учебное заведение',
    field: 'Специальность',
    major: 'Направление',
    gpa: 'Средний балл',
    
    // Навыки и языки
    skillLevel: 'Уровень',
    proficiency: 'Уровень владения',
    
    // Уровни владения языком
    languageLevels: {
      basic: 'Базовый',
      intermediate: 'Средний',
      advanced: 'Продвинутый',
      fluent: 'Свободный',
      native: 'Родной',
    },
    
    // Дефолтные значения
    defaultName: 'ПОЛНОЕ ИМЯ',
    noData: 'Нет данных',
  },
};

/**
 * Получить метки для указанного языка
 * @param {string} language - Код языка ('en', 'kk', 'ru')
 * @returns {Object} Объект с метками
 */
export const getLabels = (language = 'ru') => {
  return pdfLabels[language] || pdfLabels.ru;
};

/**
 * Получить конкретную метку
 * @param {string} key - Ключ метки
 * @param {string} language - Код языка
 * @returns {string} Значение метки
 */
export const getLabel = (key, language = 'ru') => {
  const labels = getLabels(language);
  return labels[key] || key;
};