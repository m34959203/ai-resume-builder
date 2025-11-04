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
      improveResume: 'Улучшить резюме'
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
        personal: 'Личная информация',
        experience: 'Опыт работы',
        education: 'Образование',
        skills: 'Навыки',
        languages: 'Языки',
        template: 'Шаблон',
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
        addExperience: 'Добавить опыт',
        addedExperience: 'Добавленный опыт:',
        company: 'Компания',
        companyPlaceholder: 'ТОО "Tech Corp"',
        position: 'Должность',
        positionPlaceholder: 'Frontend Developer',
        startDate: 'Начало работы',
        endDate: 'Окончание работы',
        current: 'Работаю в настоящее время',
        description: 'Обязанности и достижения',
        descriptionPlaceholder: '• Разработка и поддержка приложений\n• Оптимизация производительности\n• Наставничество джуниоров',
        remove: 'Удалить',
        label: 'Опыт'
      },
      
      // Образование
      education: {
        addEducation: 'Добавить образование',
        addedEducation: 'Добавленное образование:',
        institution: 'Учебное заведение',
        institutionPlaceholder: 'Жезказганский университет имени О.А. Байконурова',
        level: 'Уровень',
        levelPlaceholder: 'Выберите',
        levelOptions: {
          secondary: 'Среднее',
          secondarySpecial: 'Среднее специальное',
          incompleteHigher: 'Неоконченное высшее',
          higher: 'Высшее',
          bachelor: 'Бакалавр',
          master: 'Магистр',
          mba: 'MBA',
          candidate: 'Кандидат наук',
          doctor: 'Доктор наук'
        },
        year: 'Год окончания',
        yearPlaceholder: '2024',
        specialization: 'Специальность',
        specializationPlaceholder: 'Программная инженерия',
        remove: 'Удалить'
      },
      
      // Навыки
      skills: {
        title: 'Навыки',
        addSkill: 'Добавить навык',
        skillPlaceholder: 'Например: React, JavaScript, Python',
        yourSkills: 'Ваши навыки:',
        aiRecommends: 'AI рекомендует добавить:',
        aiLoading: 'Подбираем навыки…',
        aiEmpty: 'Пока нечего предложить — добавьте пару ключевых навыков или укажите должность.',
        aiRefresh: 'Обновить рекомендации',
        remove: 'Удалить'
      },
      
      // Языки
      languages: {
        title: 'Знание языков',
        addLanguage: 'Добавить язык',
        language: 'Язык',
        languagePlaceholder: 'Английский',
        level: 'Уровень',
        levelOptions: {
          a1: 'A1 — Начальный',
          a2: 'A2 — Элементарный',
          b1: 'B1 — Средний',
          b2: 'B2 — Средне-продвинутый',
          c1: 'C1 — Продвинутый',
          c2: 'C2 — В совершенстве'
        },
        remove: 'Удалить'
      },
      
      // Шаблоны
      templates: {
        modern: 'Современный',
        minimal: 'Минималистичный'
      },
      
      // Шаблон
      template: {
        title: 'Выберите шаблон резюме:',
        select: 'Выбрать шаблон',
        description: 'Стильный и профессиональный дизайн',
        selected: 'Выбрано'
      },
      
      // Предпросмотр
      preview: {
        title: 'Предпросмотр резюме',
        photo: 'Фото',
        yourName: 'Ваше имя',
        jobsCount: 'мест работы',
        educationCount: 'образование',
        languagesCount: 'языков'
      },
      
      // Кнопки
      buttons: {
        previous: 'Назад',
        next: 'Далее',
        back: 'Назад',
        generateWithAI: 'Генерировать с ИИ',
        downloadPDF: 'Скачать PDF',
        downloadingPDF: 'Готовим PDF…',
        fillRequired: 'Заполните обязательные поля',
        save: 'Сохранить',
        cancel: 'Отмена'
      },
      
      // Сообщения
      messages: {
        saving: 'Сохранение...',
        saved: 'Сохранено',
        generating: 'Генерация с помощью ИИ...',
        error: 'Произошла ошибка',
        fillRequired: 'Заполните обязательные поля',
        requiredFields: 'Необходимо:'
      },
      
      // PDF
      pdf: {
        generateError: 'Не удалось сформировать PDF.',
        emptyError: 'Пустой PDF (blob.size === 0)',
        unknownError: 'Неизвестная ошибка'
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
    },
    
    // Состояния загрузки
    loading: {
      page: 'Загружаем приложение...',
      pleaseWait: 'Пожалуйста, подождите',
      component: 'Загрузка...',
      processing: 'Обработка...',
      progress: 'Прогресс',
      aiGenerating: 'ИИ генерирует контент...'
    },
    
    // Ошибки
    errors: {
      title: 'Что-то пошло не так',
      criticalTitle: 'Критическая ошибка',
      message: 'Мы зафиксировали ошибку и работаем над её устранением. Попробуйте обновить страницу.',
      criticalMessage: 'Приложение столкнулось с критической ошибкой. Пожалуйста, перезагрузите страницу или вернитесь на главную.',
      details: 'Детали ошибки',
      devOnly: 'только в разработке',
      errorMessage: 'Сообщение',
      componentStack: 'Стек компонентов',
      callStack: 'Стек вызовов',
      tryAgain: 'Попробовать снова',
      goHome: 'На главную',
      contactSupport: 'Если проблема повторяется, пожалуйста, свяжитесь с поддержкой',
      repeated: 'Ошибка повторилась',
      times: 'раз',
      whatToTry: 'Что можно попробовать',
      tip1: 'Обновите страницу (Ctrl + F5 или Cmd + R)',
      tip2: 'Очистите кэш браузера',
      tip3: 'Попробуйте использовать режим инкогнито',
      tip4: 'Проверьте подключение к интернету',
      tip5: 'Обновите браузер до последней версии'
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
      improveResume: 'Түйіндемені жақсарту'
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
        personal: 'Жеке ақпарат',
        experience: 'Жұмыс тәжірибесі',
        education: 'Білім',
        skills: 'Дағдылар',
        languages: 'Тілдер',
        template: 'Үлгі',
        preview: 'Алдын ала қарау'
      },
      
      // Личные данные
      personal: {
        fullName: 'Толық аты-жөні',
        fullNamePlaceholder: 'Иванов Иван Иванович',
        position: 'Қалаған лауазым',
        positionPlaceholder: 'Frontend Developer',
        email: 'Email',
        emailPlaceholder: 'example@email.com',
        phone: 'Телефон',
        phonePlaceholder: '+7 (777) 123-45-67',
        location: 'Қала',
        locationPlaceholder: 'Алматы',
        summary: 'Өзім туралы',
        summaryPlaceholder: 'Өзіңіз туралы айтып беріңіз: негізгі құзыреттер мен мақсаттар туралы 2–3 сөйлем…',
        summaryHint: 'Тәжірибе, 1–2 жетістік және күшті болған стек / сала көрсетіңіз.',
        age: 'Жас',
        agePlaceholder: '30',
        maritalStatus: 'Отбасылық жағдайы',
        maritalStatusPlaceholder: 'Үйленген / Тұрмысқа шыққан / Бойдақ',
        children: 'Балалар',
        childrenPlaceholder: '2 бала / жоқ',
        driversLicense: 'Жүргізуші куәлігі',
        driversLicensePlaceholder: 'B санаты',
        photoRecommendation: 'Фото жүктеу ұсынылады'
      },
      
      // Опыт работы
      experience: {
        addExperience: 'Тәжірибе қосу',
        addedExperience: 'Қосылған тәжірибе:',
        company: 'Компания',
        companyPlaceholder: 'ЖШС "Tech Corp"',
        position: 'Лауазым',
        positionPlaceholder: 'Frontend Developer',
        startDate: 'Жұмыс басталуы',
        endDate: 'Жұмыс аяқталуы',
        current: 'Қазіргі уақытта жұмыс істеймін',
        description: 'Міндеттер мен жетістіктер',
        descriptionPlaceholder: '• Қосымшаларды әзірлеу және қолдау\n• Өнімділікті оңтайландыру\n• Джуниорларға тәлімгерлік',
        remove: 'Жою',
        label: 'Тәжірибе'
      },
      
      // Образование
      education: {
        addEducation: 'Білім қосу',
        addedEducation: 'Қосылған білім:',
        institution: 'Оқу орны',
        institutionPlaceholder: 'О.Ә. Байқоңыров атындағы Жезқазған университеті',
        level: 'Деңгей',
        levelPlaceholder: 'Таңдаңыз',
        levelOptions: {
          secondary: 'Орта',
          secondarySpecial: 'Орта арнайы',
          incompleteHigher: 'Аяқталмаған жоғары',
          higher: 'Жоғары',
          bachelor: 'Бакалавр',
          master: 'Магистр',
          mba: 'MBA',
          candidate: 'Ғылым кандидаты',
          doctor: 'Ғылым докторы'
        },
        year: 'Бітірген жыл',
        yearPlaceholder: '2024',
        specialization: 'Мамандық',
        specializationPlaceholder: 'Бағдарламалық инженерия',
        remove: 'Жою'
      },
      
      // Навыки
      skills: {
        title: 'Дағдылар',
        addSkill: 'Дағды қосу',
        skillPlaceholder: 'Мысалы: React, JavaScript, Python',
        yourSkills: 'Сіздің дағдыларыңыз:',
        aiRecommends: 'AI қосуды ұсынады:',
        aiLoading: 'Дағдыларды іріктеп жатырмыз…',
        aiEmpty: 'Әзірге ұсынар ешнәрсе жоқ — бірнеше негізгі дағдыларды қосыңыз немесе лауазымды көрсетіңіз.',
        aiRefresh: 'Ұсыныстарды жаңарту',
        remove: 'Жою'
      },
      
      // Языки
      languages: {
        title: 'Тілдерді білу',
        addLanguage: 'Тіл қосу',
        language: 'Тіл',
        languagePlaceholder: 'Ағылшын',
        level: 'Деңгей',
        levelOptions: {
          a1: 'A1 — Бастапқы',
          a2: 'A2 — Элементарлы',
          b1: 'B1 — Орта',
          b2: 'B2 — Орта-жетілдірілген',
          c1: 'C1 — Жетілдірілген',
          c2: 'C2 — Кемелдікте'
        },
        remove: 'Жою'
      },
      
      // Шаблоны
      templates: {
        modern: 'Заманауи',
        minimal: 'Минималистік'
      },
      
      // Шаблон
      template: {
        title: 'Түйіндеме үлгісін таңдаңыз:',
        select: 'Үлгіні таңдау',
        description: 'Стильді және кәсіби дизайн',
        selected: 'Таңдалған'
      },
      
      // Предпросмотр
      preview: {
        title: 'Түйіндемені алдын ала қарау',
        photo: 'Фото',
        yourName: 'Сіздің атыңыз',
        jobsCount: 'жұмыс орны',
        educationCount: 'білім',
        languagesCount: 'тіл'
      },
      
      // Кнопки
      buttons: {
        previous: 'Артқа',
        next: 'Алға',
        back: 'Артқа',
        generateWithAI: 'AI арқылы жасау',
        downloadPDF: 'PDF жүктеу',
        downloadingPDF: 'PDF дайындап жатырмыз…',
        fillRequired: 'Міндетті өрістерді толтырыңыз',
        save: 'Сақтау',
        cancel: 'Болдырмау'
      },
      
      // Сообщения
      messages: {
        saving: 'Сақталуда...',
        saved: 'Сақталды',
        generating: 'AI көмегімен жасалуда...',
        error: 'Қате орын алды',
        fillRequired: 'Міндетті өрістерді толтырыңыз',
        requiredFields: 'Қажет:'
      },
      
      // PDF
      pdf: {
        generateError: 'PDF қалыптастыру мүмкін болмады.',
        emptyError: 'Бос PDF (blob.size === 0)',
        unknownError: 'Белгісіз қате'
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
    },
    
    // Состояния загрузки
    loading: {
      page: 'Қосымшаны жүктеп жатырмыз...',
      pleaseWait: 'Күтіңіз',
      component: 'Жүктелуде...',
      processing: 'Өңдеу...',
      progress: 'Прогресс',
      aiGenerating: 'AI мазмұн жасап жатыр...'
    },
    
    // Ошибки
    errors: {
      title: 'Бірдеңе дұрыс болмады',
      criticalTitle: 'Сыни қате',
      message: 'Біз қатені тіркедік және оны жою үстіндеміз. Бетті жаңартып көріңіз.',
      criticalMessage: 'Қосымша сыни қатеге тап болды. Бетті қайта жүктеңіз немесе басты бетке оралыңыз.',
      details: 'Қате туралы мәліметтер',
      devOnly: 'тек әзірлеуде',
      errorMessage: 'Хабарлама',
      componentStack: 'Компоненттер стегі',
      callStack: 'Шақырулар стегі',
      tryAgain: 'Қайталап көру',
      goHome: 'Басты бетке',
      contactSupport: 'Мәселе қайталанса, қолдау қызметіне хабарласыңыз',
      repeated: 'Қате қайталанды',
      times: 'рет',
      whatToTry: 'Не істеуге болады',
      tip1: 'Бетті жаңартыңыз (Ctrl + F5 немесе Cmd + R)',
      tip2: 'Браузер кэшін тазалаңыз',
      tip3: 'Жасырын режимді пайдаланып көріңіз',
      tip4: 'Интернет байланысын тексеріңіз',
      tip5: 'Браузерді соңғы нұсқаға дейін жаңартыңыз'
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
      improveResume: 'Improve Resume'
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
        languages: 'Languages',
        template: 'Template',
        preview: 'Preview'
      },
      
      // Personal info
      personal: {
        fullName: 'Full Name',
        fullNamePlaceholder: 'John Smith',
        position: 'Desired Position',
        positionPlaceholder: 'Frontend Developer',
        email: 'Email',
        emailPlaceholder: 'example@email.com',
        phone: 'Phone',
        phonePlaceholder: '+1 (555) 123-4567',
        location: 'City',
        locationPlaceholder: 'New York',
        summary: 'About',
        summaryPlaceholder: 'Tell about yourself: 2–3 sentences about key competencies and goals…',
        summaryHint: 'Mention experience, 1–2 achievements, and the stack/field where you excel.',
        age: 'Age',
        agePlaceholder: '30',
        maritalStatus: 'Marital Status',
        maritalStatusPlaceholder: 'Married / Single',
        children: 'Children',
        childrenPlaceholder: '2 children / none',
        driversLicense: 'Driver\'s License',
        driversLicensePlaceholder: 'Category B',
        photoRecommendation: 'Recommended to upload photo'
      },
      
      // Work experience
      experience: {
        addExperience: 'Add Experience',
        addedExperience: 'Added experience:',
        company: 'Company',
        companyPlaceholder: 'Tech Corp LLC',
        position: 'Position',
        positionPlaceholder: 'Frontend Developer',
        startDate: 'Start Date',
        endDate: 'End Date',
        current: 'Currently working',
        description: 'Responsibilities and Achievements',
        descriptionPlaceholder: '• Application development and support\n• Performance optimization\n• Junior mentoring',
        remove: 'Remove',
        label: 'Experience'
      },
      
      // Education
      education: {
        addEducation: 'Add Education',
        addedEducation: 'Added education:',
        institution: 'Institution',
        institutionPlaceholder: 'Zhezkazgan University',
        level: 'Level',
        levelPlaceholder: 'Select',
        levelOptions: {
          secondary: 'Secondary',
          secondarySpecial: 'Secondary Special',
          incompleteHigher: 'Incomplete Higher',
          higher: 'Higher',
          bachelor: 'Bachelor',
          master: 'Master',
          mba: 'MBA',
          candidate: 'PhD Candidate',
          doctor: 'PhD'
        },
        year: 'Graduation Year',
        yearPlaceholder: '2024',
        specialization: 'Specialization',
        specializationPlaceholder: 'Software Engineering',
        remove: 'Remove'
      },
      
      // Skills
      skills: {
        title: 'Skills',
        addSkill: 'Add Skill',
        skillPlaceholder: 'E.g.: React, JavaScript, Python',
        yourSkills: 'Your skills:',
        aiRecommends: 'AI recommends adding:',
        aiLoading: 'Selecting skills…',
        aiEmpty: 'Nothing to suggest yet — add a few key skills or specify position.',
        aiRefresh: 'Refresh suggestions',
        remove: 'Remove'
      },
      
      // Languages
      languages: {
        title: 'Language Proficiency',
        addLanguage: 'Add Language',
        language: 'Language',
        languagePlaceholder: 'English',
        level: 'Level',
        levelOptions: {
          a1: 'A1 — Beginner',
          a2: 'A2 — Elementary',
          b1: 'B1 — Intermediate',
          b2: 'B2 — Upper Intermediate',
          c1: 'C1 — Advanced',
          c2: 'C2 — Proficiency'
        },
        remove: 'Remove'
      },
      
      // Templates
      templates: {
        modern: 'Modern',
        minimal: 'Minimal'
      },
      
      // Template
      template: {
        title: 'Choose resume template:',
        select: 'Select template',
        description: 'Stylish and professional design',
        selected: 'Selected'
      },
      
      // Preview
      preview: {
        title: 'Resume Preview',
        photo: 'Photo',
        yourName: 'Your Name',
        jobsCount: 'jobs',
        educationCount: 'education',
        languagesCount: 'languages'
      },
      
      // Buttons
      buttons: {
        previous: 'Previous',
        next: 'Next',
        back: 'Back',
        generateWithAI: 'Generate with AI',
        downloadPDF: 'Download PDF',
        downloadingPDF: 'Preparing PDF…',
        fillRequired: 'Fill required fields',
        save: 'Save',
        cancel: 'Cancel'
      },
      
      // Messages
      messages: {
        saving: 'Saving...',
        saved: 'Saved',
        generating: 'Generating with AI...',
        error: 'An error occurred',
        fillRequired: 'Fill required fields',
        requiredFields: 'Required:'
      },
      
      // PDF
      pdf: {
        generateError: 'Failed to generate PDF.',
        emptyError: 'Empty PDF (blob.size === 0)',
        unknownError: 'Unknown error'
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
    },
    
    // Loading states
    loading: {
      page: 'Loading application...',
      pleaseWait: 'Please wait',
      component: 'Loading...',
      processing: 'Processing...',
      progress: 'Progress',
      aiGenerating: 'AI is generating content...'
    },
    
    // Errors
    errors: {
      title: 'Something went wrong',
      criticalTitle: 'Critical error',
      message: 'We have recorded the error and are working to fix it. Try refreshing the page.',
      criticalMessage: 'The application encountered a critical error. Please reload the page or return to the home page.',
      details: 'Error details',
      devOnly: 'development only',
      errorMessage: 'Message',
      componentStack: 'Component stack',
      callStack: 'Call stack',
      tryAgain: 'Try again',
      goHome: 'Go home',
      contactSupport: 'If the problem persists, please contact support',
      repeated: 'Error repeated',
      times: 'times',
      whatToTry: 'What you can try',
      tip1: 'Refresh the page (Ctrl + F5 or Cmd + R)',
      tip2: 'Clear browser cache',
      tip3: 'Try using incognito mode',
      tip4: 'Check internet connection',
      tip5: 'Update browser to the latest version'
    }
  }
};