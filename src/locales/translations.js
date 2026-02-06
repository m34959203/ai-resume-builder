// src/locales/translations.js
export const translations = {
  ru: {
    // Навигация
    nav: {
      home: 'Главная',
      builder: 'Резюме',
      vacancies: 'Вакансии',
      recommendations: 'Рекомендации'
    },

    // Главная
    home: {
      badge: 'AI-powered Resume Builder',
      titleLine1: 'Ваш персональный',
      titleLine2: 'ИИ-помощник в карьере',
      subtitle: 'ИИ поможет быстро подготовить сильное резюме и найти подходящие вакансии, а также дать рекомендации по улучшению скиллов',
      createButton: 'Создать резюме',
      findJobsButton: 'Найти вакансии',
      features: {
        ai: { title: 'Умное резюме', description: 'Подсказки по улучшению для каждого раздела' },
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

      // Основные действия
      generate: 'Сгенерировать рекомендации',
      generating: 'Генерируем рекомендации…',
      refresh: 'Обновить',
      improveResume: 'Улучшить резюме',
      viewVacancies: 'Посмотреть вакансии',
      findVacanciesButton: 'Найти вакансии',
      searchVacancies: 'Искать вакансии по этой профессии',
      openCourse: 'Открыть курс',

      // Оценка и хинты
      marketScore: 'Оценка соответствия рынку',
      matchScore: 'Оценка соответствия рынку',
      scoreHint: 'Это ориентировочная оценка по заполненности резюме и совпадению с рынком.',
      scoreLow: 'низкая',
      scoreMedium: 'средняя',
      scoreHigh: 'высокая',
      updatedAt: 'Обновлено {time}',

      // Секции
      professions: 'Рекомендуемые профессии',
      rolesTitle: 'Рекомендуемые роли',
      suitableRole: 'Целевая профессия',
      skillsToLearn: 'Навыки для развития',
      skillsTitle: 'Навыки для развития',
      courses: 'Рекомендуемые курсы',
      coursesTitle: 'Курсы для прокачки',
      duration: 'Длительность',
      details: 'Подробнее',
      provider: 'Платформа',
      visit: 'Перейти',
      openInHH: 'Открыть поиск на HH',
      copyQuery: 'Скопировать запрос',
      copied: 'Скопировано!',
      roleVacancies: 'вакансий: {n}',
      seeMore: 'Показать ещё',
      seeLess: 'Свернуть',

      // Пустые/ошибки
      needMoreData: 'Нужно немного больше данных',
      missingSections: 'Отсутствуют разделы',
      missingMap: {
        personal: 'Личные данные',
        experience: 'Опыт работы',
        skills: 'Навыки',
        education: 'Образование',
        title: 'Должность / цель'
      },
      completeSection: 'Заполнить раздел',
      hint: 'Ниже — подборка направлений, навыков и курсов. Нажмите на профессию, чтобы сразу искать вакансии.',
      aiEmpty: 'Пока нет рекомендаций',
      aiEmptyShort: 'Недостаточно данных для рекомендаций.',
      noSkills: 'Пока нет навыков для развития.',
      noCourses: 'Пока нет курсов — добавьте навыки или опыт.',
      genError: 'Не удалось построить рекомендации. Попробуйте ещё раз.'
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
      loadError: 'Ошибка загрузки вакансий.',
      autoRelax: {
        city: 'Мы расширили поиск: убрали фильтр по городу.',
        experience: 'Мы расширили поиск: убрали фильтр по опыту.',
        all: 'Мы расширили запрос: показываем общие ИТ-вакансии.'
      }
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
        preview: 'Предварительный просмотр'
      },
      personal: {
        fullName: 'Полное имя',
        fullNamePlaceholder: 'Фамилия Имя Отчество',
        email: 'Email',
        emailPlaceholder: 'example@email.com',
        phone: 'Телефон',
        phonePlaceholder: '+7 (777) 123-45-67',
        location: 'Город',
        locationPlaceholder: 'Жезказган, Казахстан',
        title: 'Должность',
        titlePlaceholder: 'Frontend разработчик',
        summary: 'О себе',
        summaryPlaceholder: 'Опишите ваш опыт и цели...',
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
      education: {
        title: 'Добавленное образование',
        addEducation: 'Добавить образование',
        institution: 'Учебное заведение',
        institutionPlaceholder: 'ЖезУ им. О.А. Байконурова',
        degree: 'Степень',
        degreePlaceholder: 'Бакалавр',
        fieldOfStudy: 'Специальность',
        fieldOfStudyPlaceholder: 'Информационные системы',
        startDate: 'Начало',
        endDate: 'Окончание',
        remove: 'Удалить'
      },
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
      preview: {
        title: 'Предпросмотр резюме',
        photoAlt: 'Фото',
        yourName: 'Ваше имя',
        jobsCount: 'мест работы',
        educationCount: 'образование',
        languagesCount: 'языков'
      },
      templates: {
        title: 'Выберите шаблон резюме:',
        subtitle: 'Стильный и профессиональный дизайн',
        modern: 'Современный',
        minimal: 'Минималистичный',
        selected: 'Выбрано',
        choose: 'Выбрать шаблон {name}'
      },
      buttons: {
        previous: 'Назад',
        next: 'Далее',
        generateWithAI: 'Генерировать с ИИ',
        downloadPDF: 'Скачать PDF',
        save: 'Сохранить',
        cancel: 'Отмена'
      },
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
      select: 'Выберите',
      notAvailable: 'Недоступно'
    },

    // ---------- PDF ----------
    pdf: {
      resume: 'Резюме',
      present: 'настоящее время',
      contacts: 'Контакты',
      profile: 'Профиль',
      about: 'О себе',
      work: 'Опыт работы',
      education: 'Образование',
      skills: 'Навыки',
      languages: 'Языки',
      personal: 'Личная информация',
      age: 'Возраст',
      marital: 'Семейное положение',
      children: 'Дети',
      license: 'Водительские права',
      duties: 'Обязанности и достижения',

      meta: {
        present: 'настоящее время'
      },

      sections: {
        personal: 'Личная информация',
        contacts: 'Контакты',
        summary: 'О себе',
        experience: 'Опыт работы',
        education: 'Образование',
        skills: 'Навыки',
        projects: 'Проекты',
        certificates: 'Сертификаты',
        courses: 'Курсы',
        languages: 'Языки',
        links: 'Ссылки',
        achievements: 'Достижения'
      }
    }
  },

  kk: {
    nav: {
      home: 'Басты бет',
      builder: 'Түйіндеме',
      vacancies: 'Вакансиялар',
      recommendations: 'Ұсыныстар'
    },

    home: {
      badge: 'AI көмегімен Түйіндеме Құрастырушы',
      titleLine1: 'Сіздің жеке',
      titleLine2: 'AI-карьера көмекшіңіз',
      subtitle: 'AI мықты түйіндеме дайындауға, лайықты вакансияларды табуға және дағдыларды жақсарту бойынша ұсыныстар беруге көмектеседі',
      createButton: 'Түйіндеме жасау',
      findJobsButton: 'Вакансия іздеу',
      features: {
        ai: { title: 'Ақылды түйіндеме', description: 'Әр бөлімді жақсарту бойынша кеңестер' },
        vacancies: { title: 'Вакансия іздеу', description: 'HeadHunter интеграциясы арқылы релевантты ұсыныстар' },
        recommendations: { title: 'Ұсыныстар', description: 'Өсу үшін дағдылар, рөлдер және курстар' }
      }
    },

    recommendations: {
      title: 'AI Ұсыныстары',
      subtitle: 'Түйіндемеңізге негізделген кеңестер',
      fillPrompt: 'Ұсыныстар түйіндемені талдағаннан кейін пайда болады',
      fillDescription: 'Негізгі бөлімдерді толтырыңыз — біз мамандықтарды, дағдыларды және курстарды таңдаймыз. Бастаңыз:',
      fillButton: 'Түйіндемені толтыру',

      // Негізгі әрекеттер
      generate: 'Ұсыныстарды генерациялау',
      generating: 'Ұсыныстар жасалуда…',
      refresh: 'Жаңарту',
      improveResume: 'Түйіндемені жақсарту',
      viewVacancies: 'Вакансияларды қарау',
      findVacanciesButton: 'Вакансия табу',
      searchVacancies: 'Осы мамандық бойынша іздеу',
      openCourse: 'Курсты ашу',

      // Бағалау және хинттер
      marketScore: 'Нарыққа сәйкестік бағасы',
      matchScore: 'Нарыққа сәйкестік бағасы',
      scoreHint: 'Бұл түйіндеме толықтығы мен нарыққа сәйкестік бойынша жуық бағалау.',
      scoreLow: 'төмен',
      scoreMedium: 'орта',
      scoreHigh: 'жоғары',
      updatedAt: 'Жаңартылған: {time}',

      // Бөлімдер
      professions: 'Ұсынылатын мамандықтар',
      rolesTitle: 'Ұсынылатын рөлдер',
      suitableRole: 'Мақсатты мамандық',
      skillsToLearn: 'Үйренуге арналған дағдылар',
      skillsTitle: 'Дамытуға арналған дағдылар',
      courses: 'Ұсынылатын курстар',
      coursesTitle: 'Дамыту курстары',
      duration: 'Ұзақтығы',
      details: 'Толығырақ',
      provider: 'Платформа',
      visit: 'Көру',
      openInHH: 'HH-де іздеуді ашу',
      copyQuery: 'Сұрауды көшіру',
      copied: 'Көшірілді!',
      roleVacancies: 'бос орын: {n}',
      seeMore: 'Көбірек көрсету',
      seeLess: 'Жасыру',

      // Бос/қате күйлер
      needMoreData: 'Ұсыныстар үшін деректер жеткіліксіз',
      missingSections: 'Жетіспейтін бөлімдер',
      missingMap: {
        personal: 'Жеке деректер',
        experience: 'Жұмыс тәжірибесі',
        skills: 'Дағдылар',
        education: 'Білім',
        title: 'Лауазым / мақсат'
      },
      completeSection: 'Бөлімді толтыру',
      hint: 'Төменде бағыттар, дағдылар және курстар іріктелді. Вакансияны бірден іздеу үшін мамандықты басыңыз.',
      aiEmpty: 'Әзірге ұсыныстар жоқ',
      aiEmptyShort: 'Ұсыныстар үшін дерек жеткіліксіз.',
      noSkills: 'Әзірге дағдылар ұсынылмады.',
      noCourses: 'Әзірге курстар жоқ — дағдыларды немесе тәжірибені қосыңыз.',
      genError: 'Ұсыныстарды құру мүмкін болмады. Қайталап көріңіз.'
    },

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
      loadError: 'Вакансияларды жүктеу қатесі.',
      autoRelax: {
        city: 'Іздеу кеңейді: қала сүзгісі алынды.',
        experience: 'Іздеу кеңейді: тәжірибе сүзгісі алынды.',
        all: 'Іздеу кеңейді: жалпы IT вакансиялары көрсетілді.'
      }
    },

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
        fullNamePlaceholder: 'Тегі, аты, әкесінің аты.',
        email: 'Email',
        emailPlaceholder: 'example@email.com',
        phone: 'Телефон',
        phonePlaceholder: '+7 (777) 123-45-67',
        location: 'Қала',
        locationPlaceholder: 'Жезқазған, Қазақстан',
        title: 'Лауазымы',
        titlePlaceholder: 'Frontend әзірлеуші',
        summary: 'Өзім туралы',
        summaryPlaceholder: 'Тәжірибеңіз бен мақсаттарыңызды сипаттаңыз...',
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
        institutionPlaceholder: 'О.А.Байқоңыров атындағы ЖезҚУ',
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
      select: 'Таңдаңыз',
      notAvailable: 'Қолжетімсіз'
    },

    // ---------- PDF ----------
    pdf: {
      resume: 'Түйіндеме',
      present: 'қазіргі уақыт',
      contacts: 'Байланыс',
      profile: 'Профиль',
      about: 'Өзім туралы',
      work: 'Тәжірибе',
      education: 'Білім',
      skills: 'Дағдылар',
      languages: 'Тілдер',
      personal: 'Жеке ақпарат',
      age: 'Жасы',
      marital: 'Отбасылық жағдайы',
      children: 'Балалар',
      license: 'Жүргі­зуші куәлігі',
      duties: 'Міндеттер мен жетістіктер',

      meta: {
        present: 'қазіргі уақыт'
      },

      sections: {
        personal: 'Жеке мәліметтер',
        contacts: 'Байланыс',
        summary: 'Өзім туралы',
        experience: 'Жұмыс тәжірибесі',
        education: 'Білім',
        skills: 'Дағдылар',
        projects: 'Жобалар',
        certificates: 'Сертификаттар',
        courses: 'Курстар',
        languages: 'Тілдер',
        links: 'Сілтемелер',
        achievements: 'Жетістіктер'
      }
    }
  },

  en: {
    nav: {
      home: 'Home',
      builder: 'Resume',
      vacancies: 'Jobs',
      recommendations: 'Recommendations'
    },

    home: {
      badge: 'AI-powered Resume Builder',
      titleLine1: 'Your personal',
      titleLine2: 'AI career assistant',
      subtitle: 'AI helps you quickly prepare a strong resume, find suitable vacancies, and get recommendations for improving your skills',
      createButton: 'Create Resume',
      findJobsButton: 'Find Jobs',
      features: {
        ai: { title: 'Smart Resume', description: 'Tips to improve each section' },
        vacancies: { title: 'Job Search', description: 'Integration with HeadHunter for relevant offers' },
        recommendations: { title: 'Recommendations', description: 'Skills, roles and courses for growth' }
      }
    },

    recommendations: {
      title: 'AI Recommendations',
      subtitle: 'Tips based on your resume',
      fillPrompt: 'Recommendations will appear after resume analysis',
      fillDescription: 'Fill in the main sections — we will suggest professions, skills and courses. Start with:',
      fillButton: 'Fill Resume',

      // Primary actions
      generate: 'Generate recommendations',
      generating: 'Generating recommendations…',
      refresh: 'Refresh',
      improveResume: 'Improve Resume',
      viewVacancies: 'View Jobs',
      findVacanciesButton: 'Find Jobs',
      searchVacancies: 'Search jobs for this profession',
      openCourse: 'Open course',

      // Score & hints
      marketScore: 'Market Fit Score',
      matchScore: 'Market Fit Score',
      scoreHint: 'Heuristic score based on resume completeness and market alignment.',
      scoreLow: 'low',
      scoreMedium: 'medium',
      scoreHigh: 'high',
      updatedAt: 'Updated {time}',

      // Sections
      professions: 'Recommended Professions',
      rolesTitle: 'Recommended Roles',
      suitableRole: 'Target profession',
      skillsToLearn: 'Skills to Learn',
      skillsTitle: 'Skills to Develop',
      courses: 'Recommended Courses',
      coursesTitle: 'Courses to Level Up',
      duration: 'Duration',
      details: 'Details',
      provider: 'Provider',
      visit: 'Visit',
      openInHH: 'Open search on HH',
      copyQuery: 'Copy query',
      copied: 'Copied!',
      roleVacancies: 'vacancies: {n}',
      seeMore: 'Show more',
      seeLess: 'Show less',

      // Empty/error states
      needMoreData: 'We need a bit more data',
      missingSections: 'Missing sections',
      missingMap: {
        personal: 'Personal info',
        experience: 'Work experience',
        skills: 'Skills',
        education: 'Education',
        title: 'Job title / objective'
      },
      completeSection: 'Complete section',
      hint: 'Below are suggested roles, skills and courses. Click a profession to search jobs instantly.',
      aiEmpty: 'No recommendations yet',
      aiEmptyShort: 'Not enough data for recommendations.',
      noSkills: 'No skills to suggest yet.',
      noCourses: 'No courses yet — add skills or experience.',
      genError: 'Could not build recommendations. Please try again.'
    },

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
      loadError: 'Error loading vacancies.',
      autoRelax: {
        city: 'Search widened: removed city filter.',
        experience: 'Search widened: removed experience filter.',
        all: 'Search widened: showing generic IT jobs.'
      }
    },

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
        locationPlaceholder: 'Zhezkazgan, Kazakhstan',
        title: 'Job Title',
        titlePlaceholder: 'Frontend Developer',
        summary: 'About',
        summaryPlaceholder: 'Describe your experience and goals...',
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
      select: 'Select',
      notAvailable: 'Not available'
    },

    // ---------- PDF ----------
    pdf: {
      resume: 'Resume',
      present: 'present',
      contacts: 'Contacts',
      profile: 'Profile',
      about: 'Summary',
      work: 'Work Experience',
      education: 'Education',
      skills: 'Skills',
      languages: 'Languages',
      personal: 'Personal Info',
      age: 'Age',
      marital: 'Marital status',
      children: 'Children',
      license: "Driver's license",
      duties: 'Responsibilities & Achievements',

      meta: {
        present: 'present'
      },

      sections: {
        personal: 'Personal info',
        contacts: 'Contacts',
        summary: 'Summary',
        experience: 'Experience',
        education: 'Education',
        skills: 'Skills',
        projects: 'Projects',
        certificates: 'Certificates',
        courses: 'Courses',
        languages: 'Languages',
        links: 'Links',
        achievements: 'Achievements'
      }
    }
  }
};
