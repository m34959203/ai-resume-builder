🚀 AI Resume Builder — Production-Ready (HH.kz/HH.ru + AI)






AI-конструктор резюме с интеграцией HeadHunter (hh.ru / hh.kz), экспортом PDF и персональными карьерными рекомендациями на базе LLM (DeepSeek / Gemma 3 12B через OpenRouter).

✨ Возможности
🤖 AI

Smart Recommendations — карьерные направления, топ-навыки к прокачке, список курсов.

Auto-suggestions — умные подсказки по навыкам и формулировкам.

Profile Analysis — оценка профиля и короткая обратная связь.

📄 Резюме

Мастер из 5 шагов и живой превью.

Шаблоны: Modern / Minimal / Creative / Professional.

PDF-экспорт через @react-pdf/renderer.

🔍 Вакансии (HeadHunter)

Поиск по hh.ru/hh.kz, фильтры по опыту/зарплате/городу.

Прозрачная «честная» прокся /api/hh/jobs/search (без «проглатывания» ошибок HH).

🔐 Безопасность и производительность

Helmet-заголовки, rate-limit, валидация входа.

CORS «по умолчанию» для dev и популярных облаков (Render/Vercel/Netlify).

PWA (опционально), lazy-loading PDF-движка.

🏗 Технологии

Frontend

React 18, Vite, Tailwind, React Router, @react-pdf/renderer, lucide-react.

Backend (BFF)

Node.js 18+, Express, Helmet, express-rate-limit, CORS, Morgan/логирование.

AI & APIs

OpenRouter (DeepSeek R1/V3, Gemma 3 12B — через модельную переменную).

HeadHunter API (поиск / areas / OAuth — при необходимости).

🧭 Архитектура короче
Frontend (Vite, :5173 dev / :4173 preview)
   └── REST → BFF (Express, :3001 локально или PORT в проде)
         ├── /api/hh/*        → HH API (прокси, честные статусы/ошибки)
         ├── /api/recommendations/*  → рекомендации (рынок + LLM)
         └── /api/ai/infer-search    → простая эвристика запроса по профилю

📦 Установка (локально)
1) Требования
node >= 18.18
npm  >= 9

2) Клонировать и установить
git clone https://github.com/your-organization/ai-resume-builder.git
cd ai-resume-builder
npm install

3) Настроить окружение

Создайте .env (или используйте .env.example как основу):

Frontend (Vite)

VITE_APP_NAME=AI Resume Builder
VITE_API_URL=http://localhost:3001
VITE_API_PREFIX=/api
VITE_USE_MOCKS=false
VITE_API_TIMEOUT_MS=12000
VITE_AREAS_TTL_MS=21600000


Server (BFF)

NODE_ENV=development
PORT=3001

# Разрешенные фронты (через CORS)
FRONT_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173

# Куда возвращать после OAuth (если используете HH OAuth)
FRONT_REDIRECT_URL=http://localhost:5173/?page=home&auth=ok

# HeadHunter
HH_HOST=hh.kz
HH_OAUTH_HOST=https://hh.kz
HH_CLIENT_ID=your-hh-client-id
HH_CLIENT_SECRET=your-hh-client-secret
HH_REDIRECT_URI=http://localhost:3001/api/auth/hh/callback
HH_USER_AGENT=AI Resume Builder/1.0 (you@domain)

# Cookies
COOKIE_DOMAIN=
COOKIE_SECURE=false

# OpenRouter / LLM
OPENROUTER_API_KEY=sk-or-v1-***
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=deepseek/deepseek-r1:free   # или google/gemma-3-12b-it:free
OPENROUTER_REFERER=http://localhost:5173
OPENROUTER_TITLE=AI Resume Builder

# Рекомендации — флаги и параметры (опционально, разумные дефолты на сервере)
RECS_USE_MARKET=1
RECS_USE_LLM=1
RECS_LLM_COMPLEX=0
RECS_DEBUG=0
RECS_MAX_ROLES=5
RECS_SAMPLE_PAGES=2
RECS_PER_PAGE=50
RECS_VACANCY_SAMPLE_PER_ROLE=30
RECS_CACHE_TTL_MS=180000
RECS_DETAIL_CONCURRENCY=6
RECS_FETCH_TIMEOUT_MS=15000

4) Запуск в разработке
# фронт + бэкенд вместе
npm run dev:all

# или по отдельности
npm run dev         # Vite (5173)
npm run server:dev  # Express (3001)


Откройте http://localhost:5173.

🔧 Скрипты
// из package.json (верхний уровень)
{
  "scripts": {
    "dev": "vite",
    "dev:all": "concurrently \"npm run dev\" \"npm run server:dev\"",
    "build": "vite build",
    "preview": "vite preview",         // :4173
    "start": "concurrently \"npm run server:start\" \"npm run preview\"",
    "server:dev": "npm --prefix server run start:dev",
    "server:start": "npm --prefix server run start"
  }
}

🌐 Эндпойнты BFF (основные)

Здоровье/версия

GET /health
GET /healthz
GET /alive
GET /ready
GET /version
GET /api/health/hh


Эвристика поиска

POST /api/ai/infer-search
body: { profile: {...} }


HeadHunter (честная прокся поиска)

GET /api/hh/jobs/search?text=developer&area=160&per_page=20&page=0
# Заголовок X-Source-HH-URL возвращает исходный HH URL для дебага


Рекомендации

POST /api/recommendations/generate
  body: { profile, areaId?, focusRole?, seedSkills?[] }
  resp: { ok, data: { marketFitScore, roles[], growSkills[], courses[], debug }, used, timingsMs }

POST /api/recommendations/analyze
  body: { profile, areaId?, focusRole?, seedSkills?[] }
  resp: { marketFitScore, roles[], growSkills[], courses[], debug }

POST /api/recommendations/improve
  body: { profile }
  resp: { ok, updated, changes, llm? }

🧠 Как используются модели DeepSeek и Gemma

DeepSeek (R1/V3) — «тяжёлая» модель для сложных выводов:

усиливает рыночный анализ (по HH) генеративными рекомендациями,

формирует skillsToLearn, улучшенные формулировки и общую оценку соответствия.

Gemma 3 12B — «лёгкая» модель для быстрых текстовых задач:

переформулировка summary, короткие советы, подсказки в мастере.

Выбор модели — через OPENROUTER_MODEL. Глубину и факт использования LLM регулируют RECS_USE_LLM, RECS_LLM_COMPLEX.
Поиск вакансий всегда делает HeadHunter API (LLM сюда не вмешивается).

🚀 Развёртывание
Вариант A — Render (рекомендуем для демо)

BFF (Backend)

Создайте веб-сервис из папки server (Node 18).

В Environment добавьте переменные из блока «Server (BFF)».

Установите PORT (например, 10000) — Render сам подставит переменную для процесса.

Команда запуска: npm start (внутри server — node index.js).

Frontend

Создайте статическое приложение из корня репозитория:

npm run build в Build Command,

dist как Publish Directory.

В Environment укажите:

VITE_API_URL=https://<ваш-bff>.onrender.com,

VITE_API_PREFIX=/api,

другие VITE_* по необходимости.

После деплоя проверьте CORS: добавьте домен фронта в FRONT_ORIGINS на BFF.

OAuth HH (опционально)

В настройках HH-приложения укажите Redirect URI:
https://<ваш-bff>.onrender.com/api/auth/hh/callback
И продублируйте его в HH_REDIRECT_URI на BFF.

Вариант B — Docker (единый хост)
# Сборка образа
docker build -t ai-resume-builder .

# Запуск BFF
docker run -d --name airesume-bff -p 3001:3001 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e FRONT_ORIGINS=https://your-frontend.example \
  -e OPENROUTER_API_KEY=sk-or-v1-*** \
  ... \
  your-bff-image

# Фронтенд как статику можно отдать через NGINX/кастомный контейнер

Вариант C — Vercel / Netlify + любой BFF

Деплой фронта → переменная VITE_API_URL указывает на внешний BFF.

На BFF добавьте домены фронта в FRONT_ORIGINS.

🧪 Smoke-тесты (полезно после деплоя)
# Проверка BFF здоровья
curl -i https://<bff>/health

# Проверка HH статуса через BFF
curl -i https://<bff>/api/health/hh

# Поиск вакансий (должен вернуть JSON HH с items[])
curl -s 'https://<bff>/api/hh/jobs/search?text=developer&per_page=5' | jq .

# Генерация рекомендаций (минимальный профиль)
curl -s -X POST https://<bff>/api/recommendations/generate \
  -H 'Content-Type: application/json' \
  -d '{"profile":{"position":"Frontend Developer","skills":["JavaScript","React","CSS"]}}' | jq .

⚙️ Переменные окружения (сводно)
Ключ  Где Обязательно Назначение
VITE_APP_NAME Front нет Название приложения
VITE_API_URL  Front да  Базовый URL BFF
VITE_API_PREFIX Front да  Префикс API (/api)
VITE_USE_MOCKS  Front нет Моки фронта
VITE_API_TIMEOUT_MS Front нет Таймаут API
VITE_AREAS_TTL_MS Front нет TTL кеша справочников
NODE_ENV  BFF да  development / production
PORT  BFF да  Порт BFF (локально 3001)
FRONT_ORIGINS BFF да (прод) CORS-белый список (через запятую)
FRONT_REDIRECT_URL  BFF нет Куда возвращать после OAuth
HH_HOST BFF да  hh.kz или hh.ru (для валюты/ссылок)
HH_OAUTH_HOST BFF нет OAuth-хост HH
HH_CLIENT_ID/HH_CLIENT_SECRET BFF нет OAuth клиента HH
HH_REDIRECT_URI BFF нет CallBack URI
HH_USER_AGENT BFF да  «Честный» UA (дублируется в HH-User-Agent)
COOKIE_DOMAIN/COOKIE_SECURE BFF нет Куки
OPENROUTER_API_KEY  BFF да (если LLM) Ключ OpenRouter
OPENROUTER_MODEL  BFF нет deepseek/deepseek-r1:free или google/gemma-3-12b-it:free
OPENROUTER_BASE_URL/REFERER/TITLE BFF нет Служебные поля OpenRouter
RECS_*  BFF нет Тюнинг рекомендательного движка
🔒 Рекомендации по безопасности

В проде включите HTTPS, COOKIE_SECURE=true.

Установите корректный HH_USER_AGENT (реальный, с контактом), иначе HH может ограничивать.

Регулярно ротируйте OPENROUTER_API_KEY.

Следите за логами rate-limit и 429/5xx от HH (BFF не скрывает ошибки — проверяйте).

🐛 Частые проблемы

Вакансии «не появляются», пока не тронешь фильтр

Проверьте, что фронт идёт на ваш BFF (VITE_API_URL) и CORS позволяет домен фронта (FRONT_ORIGINS).

Посмотрите заголовок ответа X-Source-HH-URL — попробуйте открыть эту ссылку прямо в браузере.

Если 403/429/5xx — проблема на стороне HH (ограничения/таймаут). Увеличьте RECS_FETCH_TIMEOUT_MS, уменьшите RECS_PER_PAGE.

LLM не отвечает

Проверьте OPENROUTER_API_KEY и OPENROUTER_MODEL.

На время диагностики установите RECS_USE_LLM=0 — движок будет работать только по рынку HH.

OAuth HH не проходит

Убедитесь, что HH_REDIRECT_URI совпадает в HH-настройках и на BFF.

Проверьте домен фронта и куки-политику (COOKIE_SECURE на проде).

📁 Структура (вкратце)
ai-resume-builder/
├─ server/                # BFF (Express, CommonJS)
│  ├─ index.js            # запуск, CORS, health, inline /api/hh/jobs/search
│  └─ routes/
│     ├─ hh.js            # areas, search (минималистичная прокся)
│     └─ recommendations.js# рынок+LLM, анализ, improve
├─ src/                   # React-клиент
│  ├─ components/         # UI, PDF, мастер резюме
│  ├─ hooks/, services/   # API-клиенты, i18n-утилиты
│  └─ locales/            # словари RU/KZ/EN (при необходимости)
└─ .env(.example)         # примеры настроек

🧹 Качество кода
# Линт/фиксы (если настроено)
npm run lint:fix

📄 Лицензия

MIT — см. LICENSE.

🙌 Поддержка

Issues в репозитории.

Оперативные вопросы — владелец проекта/команда.

Made with ❤️ for better careers