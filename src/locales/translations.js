export const translations = {
  ru: {
    // Навигация
    nav: {
      home: 'Главная',
      builder: 'Резюме',
      vacancies: 'Вакансии',
      recommendations: 'Рекомендации'
    },

    // Главная страница
    home: {
      badge: 'AI-powered Resume Builder',
      // для синего акцента
      titlePrefix: 'Создайте идеальное резюме',
      titleAccent: 'за минуты',
      // оставляем старый ключ на случай, если где-то ещё используется
      title: 'Создайте идеальное резюме за минуты',
      subtitle: 'ИИ поможет быстро подготовить сильное резюме и найти подходящие вакансии',
      createButton: 'Создать резюме',
      findJobsButton: 'Найти вакансии',
      features: {
        ai: {
          title: 'Умное резюме',
          description: 'Подсказки по улучшению каждого раздела'
        },
        vacancies: {
          title: 'Поиск вакансий',
          description: 'Интеграция с HeadHunter для релевантных предложений'
        },
        recommendations: {
          title: 'Рекомендации',
          description: 'Навыки, роли и курсы для роста'
        }
      }
    },

    // Рекомендации
    recommendations: {
      title: 'AI Рекомендации',
      subtitle: 'Советы на основе вашего резюме',
      fillPrompt: 'Рекомендации появятся после анализа резюме',
      fillDescription: 'Заполните основные разделы — и мы подберём профессии, навыки и курсы. Начните с:',
      fillButton: 'Заполнить резюме',
      viewVacancies: 'Посмотреть вакансии',
      analyzing: 'Анализируем ваш профиль…',
      marketScore: 'Оценка соответствия рынку',
      professions: 'Рекомендуемые профессии',
      findVacancies: 'Найти вакансии',
      skillsToLearn: 'Навыки для развития',
      courses: 'Рекомендуемые курсы',
      duration: 'Длительность',
      details: 'Подробнее',
      findVacanciesButton: 'Найти вакансии',
      improveResume: 'Улучшить резюме',

      // 🔹 новые ключи, которые использует интерфейс
      needMoreData: 'Нужно немного больше данных',
      missingSections: 'Отсутствуют разделы',
      hint: 'Ниже — подборка направлений, навыков и курсов. Нажмите на профессию, чтобы сразу искать вакансии.',
      generate: 'Сгенерировать рекомендации',
      generating: 'Генерируем рекомендации…',
      openCourse: 'Открыть курс',
      searchVacancies: 'Искать вакансии по этой профессии'
    },

    // Вакансии
    vacancies: {
      title: 'Поиск вакансий',
      searchPlaceholder: 'Поиск по должности или компании...',
      useProfileData: 'Использовать данные резюме',
      filters: 'Фильтры',
      cityLabel: 'Город (только Казахстан)',
      cityPlaceholder: 'Начните вводить город…',
      noCitiesFound: 'Ничего не найдено',
      experienceLabel: 'Опыт',
      salaryLabel: 'Зарплата от',
      salaryPlaceholder: '150 000 ₸',
      found: 'Найдено в HH',
      page: 'Страница',
      of: 'из',
      loading: 'Загружаем вакансии…',
      previous: 'Назад',
      next: 'Вперёд',
      noVacancies: 'Вакансии не найдены',
      changeParams: 'Измените параметры поиска',
      applyOnHH: 'Откликнуться на HH',
      aiSuggestion: 'Подсказка ИИ из вашего резюме',
      aiAnalyzing: 'Анализируем профиль…',
      aiSuggestSearch: 'Предлагаем искать:',
      aiConfidence: 'уверенность',
      aiApply: 'Применить',
      aiHide: 'Скрыть',
      aiRefresh: 'Обновить подсказку',
      rateLimited: 'HeadHunter временно ограничил частоту запросов. Подождите',
      sec: 'сек.',
      experience: {
        any: 'Любой',
        noExperience: 'Без опыта',
        between1And3: '1–3 года',
        between3And6: '3–6 лет',
        moreThan6: '6+ лет'
      },
      cities: {
        almaty: 'Алматы',
        astana: 'Астана',
        shymkent: 'Шымкент'
      },
      mockDescription1: 'Разработка современных веб-приложений на React',
      mockDescription2: 'Создание интуитивных интерфейсов',
      mockDescription3: 'Анализ данных и отчётность',
      salaryNegotiable: 'по договорённости',
      vacancyTitle: 'Вакансия',
      suitableRole: 'подходящую роль',
      in: 'в',
      addToSearch: 'Добавить в запрос',
      aiError: 'Не удалось получить подсказку ИИ.',
      searchError: 'Поиск недоступен',
      loadError: 'Ошибка загрузки вакансий.'
    },

    // Страница конструктора
    builder: {
      title: 'Конструктор резюме',
      steps: {
        personal: 'Личные данные',
        experience: 'Опыт работы',
        education: 'Образование',
        skills: 'Навыки',
        preview: 'Предварительный просмотр'
      },

      // Личные данные
      personal: {
        fullName: 'Полное имя',
        fullNamePlaceholder: 'Иванов Иван Иванович',
        email: 'Email',
        emailPlaceholder: 'example@email.com',
        phone: 'Телефон',
        phonePlaceholder: '+7 (777) 123-45-67',
        location: 'Город',
        locationPlaceholder: 'Алматы, Казахстан',
        title: 'Должность',
        titlePlaceholder: 'Frontend разработчик',
        summary: 'О себе',
        summaryPlaceholder: 'Опишите ваш опыт и цели...'
      },

      // Опыт работы
      experience: {
        label: 'Опыт', // 🔹 добавлено
        addExperience: 'Добавить опыт',
        company: 'Компания',
        companyPlaceholder: 'ТОО "Компания"',
        position: 'Должность',
        positionPlaceholder: 'Senior Developer',
        startDate: 'Начало',
        endDate: 'Окончание',
        current: 'По настоящее время',
        description: 'Описание обязанностей',
        descriptionPlaceholder: 'Опишите ваши достижения и обязанности...',
        remove: 'Удалить'
      },

      // Образование
      education: {
        addEducation: 'Добавить образование',
        institution: 'Учебное заведение',
        institutionPlaceholder: 'КазНУ им. аль-Фараби',
        degree: 'Степень',
        degreePlaceholder: 'Бакалавр',
        fieldOfStudy: 'Специальность',
        fieldOfStudyPlaceholder: 'Информационные системы',
        startDate: 'Начало',
        endDate: 'Окончание',
        remove: 'Удалить'
      },

      // Навыки
      skills: {
        title: 'Навыки',
        addSkill: 'Добавить навык',
        skillPlaceholder: 'JavaScript, React, Node.js...',
        remove: 'Удалить'
      },

      // Кнопки
      buttons: {
        previous: 'Назад',
        next: 'Далее',
        generateWithAI: 'Генерировать с ИИ',
        downloadPDF: 'Скачать PDF',
        save: 'Сохранить',
        cancel: 'Отмена'
      },

      // Сообщения
      messages: {
        saving: 'Сохранение...',
        saved: 'Сохранено',
        generating: 'Генерация с помощью ИИ...',
        error: 'Произошла ошибка',
        fillRequired: 'Заполните обязательные поля'
      }
    },

    // Футер
    footer: {
      description: 'Создавайте профессиональные резюме с помощью ИИ',
      product: 'Продукт',
      createResume: 'Создать резюме',
      templates: 'Шаблоны',
      vacancies: 'Вакансии',
      recommendations: 'Рекомендации',
      company: 'Компания',
      about: 'О нас',
      blog: 'Блог',
      careers: 'Карьера',
      contact: 'Контакты',
      support: 'Поддержка',
      help: 'Помощь',
      terms: 'Условия использования',
      privacy: 'Политика конфиденциальности',
      copyright: '© 2025 AI Resume Builder. Все права защищены.',
      integration: 'Интеграция с HeadHunter: поиск вакансий и переход на HH для отклика'
    },

    // Общие
    common: {
      loading: 'Загрузка...',
      error: 'Ошибка',
      success: 'Успешно',
      confirm: 'Подтвердить',
      cancel: 'Отмена',
      close: 'Закрыть',
      delete: 'Удалить',
      edit: 'Редактировать',
      save: 'Сохранить',
      back: 'Назад'
    }
  },

  kk: {
    // Навигация
    nav: {
      home: 'Басты бет',
      builder: 'Түйіндеме',
      vacancies: 'Вакансиялар',
      recommendations: 'Ұсыныстар'
    },

    // Главная страница
    home: {
      badge: 'AI-қолдаумен Түйіндеме Құрастырушы',
      // для синего акцента
      titlePrefix: 'Керемет түйіндеме жасаңыз',
      titleAccent: 'бірнеше минутта',
      // совместимость
      title: 'Бірнеше минутта керемет түйіндеме жасаңыз',
      subtitle: 'AI қуатты түйіндеме дайындауға және қолайлы вакансияларды табуға көмектеседі',
      createButton: 'Түйіндеме жасау',
      findJobsButton: 'Вакансия іздеу',
      features: {
        ai: {
          title: 'Ақылды түйіндеме',
          description: 'Әр бөлімді жақсарту бойынша кеңестер'
        },
        vacancies: {
          title: 'Вакансия іздеу',
          description: 'HeadHunter-мен интеграция арқылы қолайлы ұсыныстар'
        },
        recommendations: {
          title: 'Ұсыныстар',
          description: 'Өсу үшін дағдылар, рөлдер және курстар'
        }
      }
    },

    // Рекомендации
    recommendations: {
      title: 'AI Ұсыныстары',
      subtitle: 'Түйіндемеңізге негізделген кеңестер',
      fillPrompt: 'Ұсыныстар түйіндемені талдағаннан кейін пайда болады',
      fillDescription: 'Негізгі бөлімдерді толтырыңыз — біз мамандықтарды, дағдыларды және курстарды таңдаймыз. Бастаңыз:',
      fillButton: 'Түйіндемені толтыру',
      viewVacancies: 'Вакансияларды қарау',
      analyzing: 'Профиліңізді талдап жатырмыз…',
      marketScore: 'Нарыққа сәйкестік бағасы',
      professions: 'Ұсынылатын мамандықтар',
      findVacancies: 'Вакансия табу',
      skillsToLearn: 'Үйренуге арналған дағдылар',
      courses: 'Ұсынылатын курстар',
      duration: 'Ұзақтығы',
      details: 'Толығырақ',
      findVacanciesButton: 'Вакансия табу',
      improveResume: 'Түйіндемені жақсарту',

      // 🔹 новые ключи
      needMoreData: 'Қосымша бірнеше дерек қажет',
      missingSections: 'Жетіспейтін бөлімдер',
      hint: 'Төменде бағыттар, дағдылар және курстар іріктелді. Вакансияларды бірден іздеу үшін мамандықты басыңыз.',
      generate: 'Ұсыныстарды генерациялау',
      generating: 'Ұсыныстар жасалуда…',
      openCourse: 'Курсты ашу',
      searchVacancies: 'Осы мамандық бойынша іздеу'
    },

    // Вакансии
    vacancies: {
      title: 'Вакансия іздеу',
      searchPlaceholder: 'Лауазым немесе компания бойынша іздеу...',
      useProfileData: 'Түйіндеме деректерін пайдалану',
      filters: 'Сүзгілер',
      cityLabel: 'Қала (тек Қазақстан)',
      cityPlaceholder: 'Қаланы енгізуді бастаңыз…',
      noCitiesFound: 'Ештеңе табылмады',
      experienceLabel: 'Тәжірибе',
      salaryLabel: 'Жалақы бастап',
      salaryPlaceholder: '150 000 ₸',
      found: 'HH-де табылды',
      page: 'Бет',
      of: 'дан',
      loading: 'Вакансияларды жүктеп жатырмыз…',
      previous: 'Артқа',
      next: 'Алға',
      noVacancies: 'Вакансиялар табылмады',
      changeParams: 'Іздеу параметрлерін өзгертіңіз',
      applyOnHH: 'HH-де жауап беру',
      aiSuggestion: 'Түйіндемеңізден AI кеңесі',
      aiAnalyzing: 'Профильді талдап жатырмыз…',
      aiSuggestSearch: 'Іздеуді ұсынамыз:',
      aiConfidence: 'сенімділік',
      aiApply: 'Қолдану',
      aiHide: 'Жасыру',
      aiRefresh: 'Кеңесті жаңарту',
      rateLimited: 'HeadHunter сұраныстар жиілігін уақытша шектеді. Күтіңіз',
      sec: 'сек.',
      experience: {
        any: 'Кез келген',
        noExperience: 'Тәжірибесіз',
        between1And3: '1–3 жыл',
        between3And6: '3–6 жыл',
        moreThan6: '6+ жыл'
      },
      cities: {
        almaty: 'Алматы',
        astana: 'Астана',
        shymkent: 'Шымкент'
      },
      mockDescription1: 'React-те заманауи веб-қосымшаларды әзірлеу',
      mockDescription2: 'Интуитивті интерфейстерді жасау',
      mockDescription3: 'Деректерді талдау және есеп беру',
      salaryNegotiable: 'келісім бойынша',
      vacancyTitle: 'Вакансия',
      suitableRole: 'қолайлы рөл',
      in: 'қаласында',
      addToSearch: 'Іздеуге қосу',
      aiError: 'AI кеңесін алу мүмкін болмады.',
      searchError: 'Іздеу қолжетімсіз',
      loadError: 'Вакансияларды жүктеу қатесі.'
    },

    // Страница конструктора
    builder: {
      title: 'Түйіндеме құрастырушысы',
      steps: {
        personal: 'Жеке деректер',
        experience: 'Жұмыс тәжірибесі',
        education: 'Білім',
        skills: 'Дағдылар',
        preview: 'Алдын ала қарау'
      },

      // Личные данные
      personal: {
        fullName: 'Толық аты-жөні',
        fullNamePlaceholder: 'Иванов Иван Иванович',
        email: 'Email',
        emailPlaceholder: 'example@email.com',
        phone: 'Телефон',
        phonePlaceholder: '+7 (777) 123-45-67',
        location: 'Қала',
        locationPlaceholder: 'Алматы, Қазақстан',
        title: 'Лауазымы',
        titlePlaceholder: 'Frontend әзірлеуші',
        summary: 'Өзім туралы',
        summaryPlaceholder: 'Тәжірибеңіз бен мақсаттарыңызды сипаттаңыз...'
      },

      // Опыт работы
      experience: {
        label: 'Тәжірибе', // 🔹 қосылды
        addExperience: 'Тәжірибе қосу',
        company: 'Компания',
        companyPlaceholder: 'ЖШС "Компания"',
        position: 'Лауазымы',
        positionPlaceholder: 'Senior Developer',
        startDate: 'Басталуы',
        endDate: 'Аяқталуы',
        current: 'Қазіргі уақытта',
        description: 'Міндеттер сипаттамасы',
        descriptionPlaceholder: 'Жетістіктеріңіз бен міндеттеріңізді сипаттаңыз...',
        remove: 'Жою'
      },

      // Образование
      education: {
        addEducation: 'Білім қосу',
        institution: 'Оқу орны',
        institutionPlaceholder: 'Әл-Фараби атындағы ҚазҰУ',
        degree: 'Дәреже',
        degreePlaceholder: 'Бакалавр',
        fieldOfStudy: 'Мамандық',
        fieldOfStudyPlaceholder: 'Ақпараттық жүйелер',
        startDate: 'Басталуы',
        endDate: 'Аяқталуы',
        remove: 'Жою'
      },

      // Навыки
      skills: {
        title: 'Дағдылар',
        addSkill: 'Дағды қосу',
        skillPlaceholder: 'JavaScript, React, Node.js...',
        remove: 'Жою'
      },

      // Кнопки
      buttons: {
        previous: 'Артқа',
        next: 'Алға',
        generateWithAI: 'AI көмегімен жасау',
        downloadPDF: 'PDF жүктеу',
        save: 'Сақтау',
        cancel: 'Болдырмау'
      },

      // Сообщения
      messages: {
        saving: 'Сақталуда...',
        saved: 'Сақталды',
        generating: 'AI көмегімен жасалуда...',
        error: 'Қате орын алды',
        fillRequired: 'Міндетті өрістерді толтырыңыз'
      }
    },

    // Футер
    footer: {
      description: 'AI көмегімен кәсіби түйіндемелер жасаңыз',
      product: 'Өнім',
      createResume: 'Түйіндеме жасау',
      templates: 'Үлгілер',
      vacancies: 'Вакансиялар',
      recommendations: 'Ұсыныстар',
      company: 'Компания',
      about: 'Біз туралы',
      blog: 'Блог',
      careers: 'Мансап',
      contact: 'Байланыс',
      support: 'Қолдау',
      help: 'Көмек',
      terms: 'Пайдалану шарттары',
      privacy: 'Құпиялылық саясаты',
      copyright: '© 2025 AI Resume Builder. Барлық құқықтар қорғалған.',
      integration: 'HeadHunter-мен интеграция: вакансияларды іздеу және жауап беру үшін HH-ге өту'
    },

    // Общие
    common: {
      loading: 'Жүктелуде...',
      error: 'Қате',
      success: 'Сәтті',
      confirm: 'Растау',
      cancel: 'Болдырмау',
      close: 'Жабу',
      delete: 'Жою',
      edit: 'Өңдеу',
      save: 'Сақтау',
      back: 'Артқа'
    }
  },

  en: {
    // Navigation
    nav: {
      home: 'Home',
      builder: 'Resume',
      vacancies: 'Jobs',
      recommendations: 'Recommendations'
    },

    // Home page
    home: {
      badge: 'AI-powered Resume Builder',
      // for blue accent
      titlePrefix: 'Create the perfect resume',
      titleAccent: 'in minutes',
      // compatibility
      title: 'Create the perfect resume in minutes',
      subtitle: 'AI helps you quickly prepare a strong resume and find suitable vacancies',
      createButton: 'Create Resume',
      findJobsButton: 'Find Jobs',
      features: {
        ai: {
          title: 'Smart Resume',
          description: 'Tips to improve each section'
        },
        vacancies: {
          title: 'Job Search',
          description: 'Integration with HeadHunter for relevant offers'
        },
        recommendations: {
          title: 'Recommendations',
          description: 'Skills, roles and courses for growth'
        }
      }
    },

    // Recommendations
    recommendations: {
      title: 'AI Recommendations',
      subtitle: 'Tips based on your resume',
      fillPrompt: 'Recommendations will appear after resume analysis',
      fillDescription: 'Fill in the main sections — and we will select professions, skills and courses. Start with:',
      fillButton: 'Fill Resume',
      viewVacancies: 'View Jobs',
      analyzing: 'Analyzing your profile…',
      marketScore: 'Market Fit Score',
      professions: 'Recommended Professions',
      findVacancies: 'Find Jobs',
      skillsToLearn: 'Skills to Learn',
      courses: 'Recommended Courses',
      duration: 'Duration',
      details: 'Details',
      findVacanciesButton: 'Find Jobs',
      improveResume: 'Improve Resume',

      // 🔹 new keys
      needMoreData: 'We need a bit more data',
      missingSections: 'Missing sections',
      hint: 'Below are suggested roles, skills and courses. Click a profession to search jobs instantly.',
      generate: 'Generate recommendations',
      generating: 'Generating recommendations…',
      openCourse: 'Open course',
      searchVacancies: 'Search jobs for this profession'
    },

    // Vacancies
    vacancies: {
      title: 'Job Search',
      searchPlaceholder: 'Search by position or company...',
      useProfileData: 'Use resume data',
      filters: 'Filters',
      cityLabel: 'City (Kazakhstan only)',
      cityPlaceholder: 'Start typing city name…',
      noCitiesFound: 'Nothing found',
      experienceLabel: 'Experience',
      salaryLabel: 'Salary from',
      salaryPlaceholder: '150,000 ₸',
      found: 'Found on HH',
      page: 'Page',
      of: 'of',
      loading: 'Loading vacancies…',
      previous: 'Previous',
      next: 'Next',
      noVacancies: 'No vacancies found',
      changeParams: 'Change search parameters',
      applyOnHH: 'Apply on HH',
      aiSuggestion: 'AI suggestion from your resume',
      aiAnalyzing: 'Analyzing profile…',
      aiSuggestSearch: 'We suggest searching:',
      aiConfidence: 'confidence',
      aiApply: 'Apply',
      aiHide: 'Hide',
      aiRefresh: 'Refresh suggestion',
      rateLimited: 'HeadHunter temporarily limited request rate. Please wait',
      sec: 'sec.',
      experience: {
        any: 'Any',
        noExperience: 'No experience',
        between1And3: '1–3 years',
        between3And6: '3–6 years',
        moreThan6: '6+ years'
      },
      cities: {
        almaty: 'Almaty',
        astana: 'Astana',
        shymkent: 'Shymkent'
      },
      mockDescription1: 'Development of modern web applications with React',
      mockDescription2: 'Creating intuitive interfaces',
      mockDescription3: 'Data analysis and reporting',
      salaryNegotiable: 'negotiable',
      vacancyTitle: 'Vacancy',
      suitableRole: 'suitable role',
      in: 'in',
      addToSearch: 'Add to search',
      aiError: 'Could not get AI suggestion.',
      searchError: 'Search unavailable',
      loadError: 'Error loading vacancies.'
    },

    // Builder page
    builder: {
      title: 'Resume Builder',
      steps: {
        personal: 'Personal Info',
        experience: 'Work Experience',
        education: 'Education',
        skills: 'Skills',
        preview: 'Preview'
      },

      // Personal info
      personal: {
        fullName: 'Full Name',
        fullNamePlaceholder: 'John Smith',
        email: 'Email',
        emailPlaceholder: 'example@email.com',
        phone: 'Phone',
        phonePlaceholder: '+1 (555) 123-4567',
        location: 'Location',
        locationPlaceholder: 'New York, USA',
        title: 'Job Title',
        titlePlaceholder: 'Frontend Developer',
        summary: 'About',
        summaryPlaceholder: 'Describe your experience and goals...'
      },

      // Work experience
      experience: {
        label: 'Experience', // 🔹 added
        addExperience: 'Add Experience',
        company: 'Company',
        companyPlaceholder: 'Company LLC',
        position: 'Position',
        positionPlaceholder: 'Senior Developer',
        startDate: 'Start Date',
        endDate: 'End Date',
        current: 'Present',
        description: 'Job Description',
        descriptionPlaceholder: 'Describe your achievements and responsibilities...',
        remove: 'Remove'
      },

      // Education
      education: {
        addEducation: 'Add Education',
        institution: 'Institution',
        institutionPlaceholder: 'University Name',
        degree: 'Degree',
        degreePlaceholder: 'Bachelor',
        fieldOfStudy: 'Field of Study',
        fieldOfStudyPlaceholder: 'Computer Science',
        startDate: 'Start Date',
        endDate: 'End Date',
        remove: 'Remove'
      },

      // Skills
      skills: {
        title: 'Skills',
        addSkill: 'Add Skill',
        skillPlaceholder: 'JavaScript, React, Node.js...',
        remove: 'Remove'
      },

      // Buttons
      buttons: {
        previous: 'Previous',
        next: 'Next',
        generateWithAI: 'Generate with AI',
        downloadPDF: 'Download PDF',
        save: 'Save',
        cancel: 'Cancel'
      },

      // Messages
      messages: {
        saving: 'Saving...',
        saved: 'Saved',
        generating: 'Generating with AI...',
        error: 'An error occurred',
        fillRequired: 'Fill in required fields'
      }
    },

    // Footer
    footer: {
      description: 'Create professional resumes with AI',
      product: 'Product',
      createResume: 'Create Resume',
      templates: 'Templates',
      vacancies: 'Jobs',
      recommendations: 'Recommendations',
      company: 'Company',
      about: 'About',
      blog: 'Blog',
      careers: 'Careers',
      contact: 'Contact',
      support: 'Support',
      help: 'Help',
      terms: 'Terms of Service',
      privacy: 'Privacy Policy',
      copyright: '© 2025 AI Resume Builder. All rights reserved.',
      integration: 'HeadHunter integration: job search and transition to HH for application'
    },

    // Common
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      confirm: 'Confirm',
      cancel: 'Cancel',
      close: 'Close',
      delete: 'Delete',
      edit: 'Edit',
      save: 'Save',
      back: 'Back'
    }
  }
};
