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
      // совместимость со старым ключом
      title: 'Создайте идеальное резюме за минуты',
      subtitle: 'ИИ поможет быстро подготовить сильное резюме и найти подходящие вакансии',
      createButton: 'Создать резюме',
      findJobsButton: 'Найти вакансии',
      features: {
        ai: { title: 'Умное резюме', description: 'Подсказки по улучшению каждого раздела' },
        vacancies: { title: 'Поиск вакансий', description: 'Интеграция с HeadHunter для релевантных предложений' },
        recommendations: { title: 'Рекомендации', description: 'Навыки, роли и курсы для роста' }
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
      // новые ключи
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
      cities: { almaty: 'Алматы', astana: 'Астана', shymkent: 'Шымкент' },
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

    // Конструктор
    builder: {
      title: 'Конструктор резюме',
      steps: {
        personal: 'Личные данные',
        experience: 'Опыт работы',
        education: 'Образование',
        skills: 'Навыки',
        languages: 'Языки',
        template: 'Шаблон',
        // совместимость
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
        summaryPlaceholder: 'Опишите ваш опыт и цели...',
        // новые поля
        age: 'Возраст',
        agePlaceholder: '30',
        maritalStatus: 'Семейное положение',
        maritalStatusPlaceholder: 'Женат / Замужем / Не женат',
        children: 'Дети',
        childrenPlaceholder: '2 / нет',
        driversLicense: 'Водительские права',
        driversLicensePlaceholder: 'Категория B',
        photoHint: 'Рекомендуется загрузить фото',
        hint: 'Укажите опыт, 1–2 достижения и стек / сферу, в которой сильны.'
      },

      // Опыт
      experience: {
        label: 'Опыт',
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
        title: 'Добавленное образование',
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
        yourSkills: 'Ваши навыки:',
        skillPlaceholder: 'JavaScript, React, Node.js...',
        remove: 'Удалить',
        aiTitle: 'ИИ рекомендует добавить:',
        aiLoading: 'Подбираем навыки…',
        aiEmpty: 'Пока нечего предложить — добавьте пару ключевых навыков или укажите должность.',
        refresh: 'Обновить рекомендации'
      },

      // Языки
      languages: {
        title: 'Знание языков',
        language: 'Язык',
        languagePlaceholder: 'Английский',
        level: 'Уровень',
        addLanguage: 'Добавить язык',
        remove: 'Удалить язык',
        levels: {
          a1: 'A1 — Начальный',
          a2: 'A2 — Элементарный',
          b1: 'B1 — Средний',
          b2: 'B2 — Средне-продвинутый',
          c1: 'C1 — Продвинутый',
          c2: 'C2 — В совершенстве'
        }
      },

      // Превью
      preview: {
        title: 'Предпросмотр резюме',
        photoAlt: 'Фото',
        yourName: 'Ваше имя',
        jobsCount: 'мест работы',
        educationCount: 'образование',
        languagesCount: 'языков'
      },

      // Шаблоны
      templates: {
        title: 'Выберите шаблон резюме:',
        subtitle: 'Стильный и профессиональный дизайн',
        modern: 'Современный',
        minimal: 'Минималистичный',
        selected: 'Выбрано',
        choose: 'Выбрать шаблон {name}'
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
      back: 'Назад',
      select: 'Выберите'
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

    // Басты бет
    home: {
      badge: 'AI-қолдаумен Түйіндеме Құрастырушы',
      titlePrefix: 'Керемет түйіндеме жасаңыз',
      titleAccent: 'бірнеше минутта',
      title: 'Бірнеше минутта керемет түйіндеме жасаңыз',
      subtitle: 'AI қуатты түйіндеме дайындауға және қолайлы вакансияларды табуға көмектеседі',
      createButton: 'Түйіндеме жасау',
      findJobsButton: 'Вакансия іздеу',
      features: {
        ai: { title: 'Ақылды түйіндеме', description: 'Әр бөлімді жақсарту бойынша кеңестер' },
        vacancies: { title: 'Вакансия іздеу', description: 'HeadHunter-мен интеграция арқылы қолайлы ұсыныстар' },
        recommendations: { title: 'Ұсыныстар', description: 'Өсу үшін дағдылар, рөлдер және курстар' }
      }
    },

    // Ұсыныстар
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
      // жаңа кілттер
      needMoreData: 'Қосымша бірнеше дерек қажет',
      missingSections: 'Жетіспейтін бөлімдер',
      hint: 'Төменде бағыттар, дағдылар және курстар іріктелді. Вакансияны бірден іздеу үшін мамандықты басыңыз.',
      generate: 'Ұсыныстарды генерациялау',
      generating: 'Ұсыныстар жасалуда…',
      openCourse: 'Курсты ашу',
      searchVacancies: 'Осы мамандық бойынша іздеу'
    },

    // Вакансиялар
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
      cities: { almaty: 'Алматы', astana: 'Астана', shymkent: 'Шымкент' },
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

    // Құрастырушы
    builder: {
      title: 'Түйіндеме құрастырушысы',
      steps: {
        personal: 'Жеке деректер',
        experience: 'Жұмыс тәжірибесі',
        education: 'Білім',
        skills: 'Дағдылар',
        languages: 'Тілдер',
        template: 'Үлгі',
        preview: 'Алдын ала қарау'
      },

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
        summaryPlaceholder: 'Тәжірибеңіз бен мақсаттарыңызды сипаттаңыз...',
        // жаңа өрістер
        age: 'Жасы',
        agePlaceholder: '30',
        maritalStatus: 'Отбасылық жағдайы',
        maritalStatusPlaceholder: 'Үйленген / Тұрмыста / Үйленбеген',
        children: 'Балалар',
        childrenPlaceholder: '2 / жоқ',
        driversLicense: 'Жүргізуші куәлігі',
        driversLicensePlaceholder: 'B санаты',
        photoHint: 'Фото жүктеген жөн',
        hint: 'Тәжірибені, 1–2 жетістікті және мықты сала/стекті көрсетіңіз.'
      },

      experience: {
        label: 'Тәжірибе',
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

      education: {
        title: 'Қосылған білім',
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

      skills: {
        title: 'Дағдылар',
        addSkill: 'Дағды қосу',
        yourSkills: 'Дағдыларыңыз:',
        skillPlaceholder: 'JavaScript, React, Node.js...',
        remove: 'Жою',
        aiTitle: 'AI ұсынатын дағдылар:',
        aiLoading: 'Дағдылар таңдалуда…',
        aiEmpty: 'Әзірге ұсыныс жоқ — бірнеше негізгі дағдыны қосыңыз немесе лауазымды көрсетіңіз.',
        refresh: 'Ұсыныстарды жаңарту'
      },

      languages: {
        title: 'Тіл білу деңгейі',
        language: 'Тіл',
        languagePlaceholder: 'Ағылшын',
        level: 'Деңгей',
        addLanguage: 'Тілді қосу',
        remove: 'Тілді жою',
        levels: {
          a1: 'A1 — Бастапқы',
          a2: 'A2 — Бастауыш',
          b1: 'B1 — Орта',
          b2: 'B2 — Ортадан жоғары',
          c1: 'C1 — Жоғары',
          c2: 'C2 — Еркін'
        }
      },

      preview: {
        title: 'Түйіндеме алдын ала қарау',
        photoAlt: 'Фото',
        yourName: 'Сіздің атыңыз',
        jobsCount: 'жұмыс орны',
        educationCount: 'білімі',
        languagesCount: 'тіл'
      },

      templates: {
        title: 'Түйіндеме үлгісін таңдаңыз:',
        subtitle: 'Стильді және кәсіби дизайн',
        modern: 'Қазіргі',
        minimal: 'Минималистік',
        selected: 'Таңдалды',
        choose: '{name} үлгісін таңдау'
      },

      buttons: {
        previous: 'Артқа',
        next: 'Алға',
        generateWithAI: 'AI көмегімен жасау',
        downloadPDF: 'PDF жүктеу',
        save: 'Сақтау',
        cancel: 'Болдырмау'
      },

      messages: {
        saving: 'Сақталуда...',
        saved: 'Сақталды',
        generating: 'AI көмегімен жасалуда...',
        error: 'Қате орын алды',
        fillRequired: 'Міндетті өрістерді толтырыңыз'
      }
    },

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
      back: 'Артқа',
      select: 'Таңдаңыз'
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

    // Home
    home: {
      badge: 'AI-powered Resume Builder',
      titlePrefix: 'Create the perfect resume',
      titleAccent: 'in minutes',
      title: 'Create the perfect resume in minutes',
      subtitle: 'AI helps you quickly prepare a strong resume and find suitable vacancies',
      createButton: 'Create Resume',
      findJobsButton: 'Find Jobs',
      features: {
        ai: { title: 'Smart Resume', description: 'Tips to improve each section' },
        vacancies: { title: 'Job Search', description: 'Integration with HeadHunter for relevant offers' },
        recommendations: { title: 'Recommendations', description: 'Skills, roles and courses for growth' }
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
      // new keys
      needMoreData: 'We need a bit more data',
      missingSections: 'Missing sections',
      hint: 'Below are suggested roles, skills and courses. Click a profession to search jobs instantly.',
      generate: 'Generate recommendations',
      generating: 'Generating recommendations…',
      openCourse: 'Open course',
      searchVacancies: 'Search jobs for this profession'
    },

    // Jobs
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
      cities: { almaty: 'Almaty', astana: 'Astana', shymkent: 'Shymkent' },
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

    // Builder
    builder: {
      title: 'Resume Builder',
      steps: {
        personal: 'Personal Info',
        experience: 'Work Experience',
        education: 'Education',
        skills: 'Skills',
        languages: 'Languages',
        template: 'Template',
        preview: 'Preview'
      },

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
        summaryPlaceholder: 'Describe your experience and goals...',
        // new
        age: 'Age',
        agePlaceholder: '30',
        maritalStatus: 'Marital status',
        maritalStatusPlaceholder: 'Married / Single',
        children: 'Children',
        childrenPlaceholder: '2 / none',
        driversLicense: 'Driver’s license',
        driversLicensePlaceholder: 'Category B',
        photoHint: 'Uploading a photo is recommended',
        hint: 'Mention your experience, 1–2 achievements, and the stack/domain you are strong in.'
      },

      experience: {
        label: 'Experience',
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

      education: {
        title: 'Added education',
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

      skills: {
        title: 'Skills',
        addSkill: 'Add Skill',
        yourSkills: 'Your skills:',
        skillPlaceholder: 'JavaScript, React, Node.js...',
        remove: 'Remove',
        aiTitle: 'AI suggests adding:',
        aiLoading: 'Picking skills…',
        aiEmpty: 'Nothing to suggest yet — add a couple of key skills or specify the title.',
        refresh: 'Refresh suggestions'
      },

      languages: {
        title: 'Language proficiency',
        language: 'Language',
        languagePlaceholder: 'English',
        level: 'Level',
        addLanguage: 'Add language',
        remove: 'Remove language',
        levels: {
          a1: 'A1 — Beginner',
          a2: 'A2 — Elementary',
          b1: 'B1 — Intermediate',
          b2: 'B2 — Upper-intermediate',
          c1: 'C1 — Advanced',
          c2: 'C2 — Proficient'
        }
      },

      preview: {
        title: 'Resume preview',
        photoAlt: 'Photo',
        yourName: 'Your name',
        jobsCount: 'jobs',
        educationCount: 'education',
        languagesCount: 'languages'
      },

      templates: {
        title: 'Choose a resume template:',
        subtitle: 'Sleek and professional design',
        modern: 'Modern',
        minimal: 'Minimal',
        selected: 'Selected',
        choose: 'Choose template {name}'
      },

      buttons: {
        previous: 'Previous',
        next: 'Next',
        generateWithAI: 'Generate with AI',
        downloadPDF: 'Download PDF',
        save: 'Save',
        cancel: 'Cancel'
      },

      messages: {
        saving: 'Saving...',
        saved: 'Saved',
        generating: 'Generating with AI...',
        error: 'An error occurred',
        fillRequired: 'Fill in required fields'
      }
    },

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
      back: 'Back',
      select: 'Select'
    }
  }
};
