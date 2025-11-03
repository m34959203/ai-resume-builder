// src/components/SEO.jsx — SEO и мета-теги с поддержкой RU/KK/EN
import { useEffect, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { LanguageContext } from '../context/LanguageContext';

// 🔧 Базовая конфигурация (можно переопределить через .env)
const SEO_BASE = {
  siteName: 'AI Resume Builder',
  defaultImage: '/og-image.png',
  twitterHandle: '@airesume',
  // Приоритет: .env → дефолт
  siteUrl:
    import.meta.env?.VITE_SITE_URL?.replace(/\/+$/, '') ||
    'https://your-username.github.io/ai-resume-builder',
  gaId: import.meta.env?.VITE_GA_ID || '',
};

// 🌐 Локализованные тексты (минимальный набор по страницам)
const PAGE_I18N = {
  ru: {
    home: {
      title: 'AI Resume Builder — умный помощник для создания резюме',
      description:
        'Профессиональные резюме за минуты: AI-подсказки, интеграция с HeadHunter, экспорт в PDF.',
      keywords: 'резюме, cv, headhunter, карьера, работа, вакансии, ai',
    },
    builder: {
      title: 'Конструктор резюме — создайте идеальное резюме',
      description:
        'Пошаговый конструктор с AI-подсказками. Выберите шаблон, заполните данные, скачайте PDF.',
      keywords: 'конструктор резюме, создать резюме, шаблоны резюме',
    },
    vacancies: {
      title: 'Поиск вакансий — HeadHunter интеграция',
      description:
        'Поиск подходящих вакансий на HeadHunter с умной фильтрацией по навыкам и опыту.',
      keywords: 'вакансии, работа, headhunter, поиск работы',
    },
    recommendations: {
      title: 'AI-рекомендации — развивайте карьеру',
      description:
        'Персональные рекомендации по профессиям, навыкам и курсам на основе вашего резюме.',
      keywords: 'карьера, развитие, навыки, курсы, обучение',
    },
    common: {
      breadcrumbHome: 'Главная',
      appDescription:
        'Создавайте идеальное резюме с помощью искусственного интеллекта. Интеграция с HeadHunter, экспорт в PDF, персональные рекомендации.',
    },
  },
  kk: {
    home: {
      title: 'AI Resume Builder — түйіндемені жылдам жасаңыз',
      description:
        'Минуттар ішінде кәсіби түйіндеме: AI кеңестері, HeadHunter интеграциясы, PDF экспорты.',
      keywords: 'түйіндеме, cv, жұмыс, бос орындар, headhunter, ai',
    },
    builder: {
      title: 'Түйіндеме құрастыру — мінсіз түйіндеме жасаңыз',
      description:
        'AI кеңестері бар қадамдық конструктор. Үлгіні таңдаңыз, мәліметтерді толтырыңыз, PDF жүктеңіз.',
      keywords: 'түйіндеме конструкторы, түйіндеме жасау, үлгілер',
    },
    vacancies: {
      title: 'Бос орындар іздеу — HeadHunter интеграциясы',
      description:
        'Құзыреттер мен тәжірибеге қарай HeadHunter бойынша лайықты жұмыс іздеу.',
      keywords: 'бос орындар, жұмыс, headhunter, жұмыс іздеу',
    },
    recommendations: {
      title: 'AI ұсынымдары — мансапты дамыту',
      description:
        'Түйіндемеңізге сүйене отырып, мамандықтар, дағдылар және курстар бойынша жеке ұсынымдар.',
      keywords: 'мансап, даму, дағдылар, курстар, оқу',
    },
    common: {
      breadcrumbHome: 'Басты бет',
      appDescription:
        'Жасанды интеллект көмегімен кәсіби түйіндеме жасаңыз. HeadHunter интеграциясы, PDF экспорт, жеке ұсынымдар.',
    },
  },
  en: {
    home: {
      title: 'AI Resume Builder — create a professional resume in minutes',
      description:
        'Build polished resumes fast: AI suggestions, HeadHunter integration, PDF export.',
      keywords: 'resume, cv, headhunter, career, jobs, vacancies, ai',
    },
    builder: {
      title: 'Resume Builder — craft your perfect resume',
      description:
        'Step-by-step builder with AI tips. Pick a template, fill your data, download as PDF.',
      keywords: 'resume builder, create resume, resume templates',
    },
    vacancies: {
      title: 'Job Search — HeadHunter integration',
      description:
        'Find relevant jobs on HeadHunter with smart filtering by skills and experience.',
      keywords: 'jobs, vacancies, headhunter, job search',
    },
    recommendations: {
      title: 'AI Recommendations — grow your career',
      description:
        'Personalized suggestions for roles, skills, and courses based on your resume.',
      keywords: 'career, growth, skills, courses, learning',
    },
    common: {
      breadcrumbHome: 'Home',
      appDescription:
        'Create great resumes with AI. HeadHunter integration, PDF export, and personalized recommendations.',
    },
  },
};

// ↔️ Утилиты DOM
function upsertMeta(nameOrProp, content, isName = false) {
  if (!content) return;
  const attr = isName ? 'name' : 'property';
  let el = document.querySelector(`meta[${attr}="${nameOrProp}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, nameOrProp);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel, href, extra = {}) {
  if (!href) return;
  let el = document.querySelector(`link[rel="${rel}"][data-auto="1"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    el.setAttribute('data-auto', '1');
    document.head.appendChild(el);
  }
  el.href = href;
  Object.entries(extra).forEach(([k, v]) => el.setAttribute(k, v));
}

function upsertScriptJsonLd(data, selector = 'script[type="application/ld+json"][data-auto="1"]') {
  if (!data) return;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute('data-auto', '1');
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

const ogLocale = (lang) =>
  lang === 'ru' ? 'ru_RU' : lang === 'kk' ? 'kk_KZ' : 'en_US';

const otherLangs = (lang) => ['ru', 'kk', 'en'].filter((l) => l !== lang);

// 🧠 Вычисление текущей страницы (мы используем query ?page=...)
function detectPage(search) {
  const sp = new URLSearchParams(search || '');
  const p = sp.get('page');
  return ['builder', 'vacancies', 'recommendations'].includes(p) ? p : 'home';
}

export function SEO({
  title,
  description,
  keywords,
  image,
  type = 'website',
  noindex = false,
}) {
  const location = useLocation();
  const { lang = 'ru', t } = useContext(LanguageContext) || {};

  // Тексты для текущего языка + страницы
  const pageKey = useMemo(() => detectPage(location.search), [location.search]);

  const pageI18n = PAGE_I18N[lang] || PAGE_I18N.ru;
  const pageCfg = pageI18n[pageKey] || pageI18n.home;
  const common = pageI18n.common || PAGE_I18N.ru.common;

  const SITE_URL = SEO_BASE.siteUrl;
  const imageUrl = `${SITE_URL}${image || SEO_BASE.defaultImage}`;

  // Полные урлы (каноникал и hreflang)
  const canonicalUrl = useMemo(() => {
    const url = new URL(`${SITE_URL}${location.pathname}`);
    // Сохраняем текущие параметры страницы
    const sp = new URLSearchParams(location.search);
    sp.forEach((v, k) => url.searchParams.set(k, v));
    // Язык в canonical не добавляем, чтобы избежать дубликатов (альтернативы — ниже)
    return url.toString();
  }, [location.pathname, location.search, SITE_URL]);

  const altUrls = useMemo(() => {
    const base = `${SITE_URL}${location.pathname}`;
    return ['ru', 'kk', 'en'].reduce((acc, code) => {
      const url = new URL(base);
      const sp = new URLSearchParams(location.search);
      // Заменяем/ставим lang
      sp.set('lang', code);
      sp.forEach((v, k) => url.searchParams.set(k, v));
      acc[code] = url.toString();
      return acc;
    }, {});
  }, [location.pathname, location.search, SITE_URL]);

  useEffect(() => {
    // 1) <html lang="...">
    try {
      document.documentElement.setAttribute('lang', lang || 'ru');
      document.documentElement.setAttribute('dir', 'ltr');
    } catch {}

    // 2) Title
    const finalTitle =
      title || pageCfg.title || (t ? t('seo.title', '') : '') || SEO_BASE.siteName;
    document.title = finalTitle;

    // 3) Description/Keywords
    const finalDesc =
      description ||
      common.appDescription ||
      (t ? t('seo.description', '') : '') ||
      '';
    const finalKeywords = keywords || pageCfg.keywords || '';

    upsertMeta('description', finalDesc, true);
    upsertMeta('keywords', finalKeywords, true);

    // 4) Open Graph
    upsertMeta('og:title', finalTitle);
    upsertMeta('og:description', finalDesc);
    upsertMeta('og:type', type);
    upsertMeta('og:url', canonicalUrl);
    upsertMeta('og:image', imageUrl);
    upsertMeta('og:site_name', SEO_BASE.siteName);
    upsertMeta('og:locale', ogLocale(lang));

    // Альтернативные локали для OG
    otherLangs(lang).forEach((l) => {
      upsertMeta('og:locale:alternate', ogLocale(l));
    });

    // 5) Twitter
    upsertMeta('twitter:card', 'summary_large_image', true);
    upsertMeta('twitter:site', SEO_BASE.twitterHandle, true);
    upsertMeta('twitter:title', finalTitle, true);
    upsertMeta('twitter:description', finalDesc, true);
    upsertMeta('twitter:image', imageUrl, true);

    // 6) Robots
    upsertMeta('robots', noindex ? 'noindex,nofollow' : 'index,follow', true);

    // 7) Canonical
    upsertLink('canonical', canonicalUrl);

    // 8) hreflang (альтернативные версии)
    // x-default → без параметров языка
    upsertLink('alternate', canonicalUrl, { hreflang: 'x-default' });
    Object.entries(altUrls).forEach(([code, href]) => {
      const hreflang = code === 'en' ? 'en' : code === 'kk' ? 'kk' : 'ru';
      const selector = `link[rel="alternate"][hreflang="${hreflang}"][data-auto="1"]`;
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('link');
        el.rel = 'alternate';
        el.setAttribute('hreflang', hreflang);
        el.setAttribute('data-auto', '1');
        document.head.appendChild(el);
      }
      el.href = href;
    });

    // 9) JSON-LD: WebApplication
    const jsonLdApp = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: SEO_BASE.siteName,
      description: finalDesc,
      inLanguage: lang,
      url: SITE_URL,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      author: { '@type': 'Organization', name: SEO_BASE.siteName },
    };
    upsertScriptJsonLd(jsonLdApp);

    // 10) JSON-LD: Хлебные крошки (кроме home)
    if (pageKey !== 'home') {
      const bread = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: common.breadcrumbHome || 'Home',
            item: SITE_URL,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: finalTitle,
            item: canonicalUrl,
          },
        ],
      };
      upsertScriptJsonLd(bread, 'script[type="application/ld+json"][data-breadcrumb="1"]');
      const el = document.querySelector(
        'script[type="application/ld+json"][data-breadcrumb="1"]',
      );
      if (el) el.setAttribute('data-breadcrumb', '1');
    }

    // 11) Google Analytics (если настроен)
    if (window.gtag && SEO_BASE.gaId) {
      window.gtag('config', SEO_BASE.gaId, {
        page_path: location.pathname + location.search,
        page_title: finalTitle,
        page_location: canonicalUrl,
        language: lang,
      });
    }
  }, [
    lang,
    title,
    description,
    keywords,
    image,
    type,
    noindex,
    pageKey,
    location.pathname,
    location.search,
    canonicalUrl,
    imageUrl,
    common.appDescription,
    pageCfg.keywords,
    pageCfg.title,
  ]);

  return null;
}

export default SEO;
