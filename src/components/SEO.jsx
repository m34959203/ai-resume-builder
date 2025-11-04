// src/components/SEO.jsx — многоязычные мета-теги, OG/Twitter, hreflang и JSON-LD
import { useContext, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

// Опционально берём текущий язык из вашего контекста
let LanguageContext = null;
try {
  // eslint-disable-next-line import/no-unresolved, global-require
  LanguageContext = require('../context/LanguageContext')?.LanguageContext ?? null;
} catch (_) {
  // no-op
}

/* ============================ Конфигурация по умолчанию ============================ */

const FALLBACK_SITE_URL = 'https://your-username.github.io/ai-resume-builder';
const SITE_URL =
  (typeof window !== 'undefined' && window.__SITE_URL__) ||
  (import.meta.env?.VITE_SITE_URL ?? FALLBACK_SITE_URL);

const TWITTER_HANDLE =
  (typeof window !== 'undefined' && window.__TWITTER_HANDLE__) ||
  (import.meta.env?.VITE_TWITTER_HANDLE ?? '@airesume');

const DEFAULT_IMAGE =
  (typeof window !== 'undefined' && window.__OG_IMAGE__) ||
  (import.meta.env?.VITE_OG_IMAGE ?? '/og-image.png');

const TITLE_TEMPLATE =
  (typeof window !== 'undefined' && window.__TITLE_TEMPLATE__) ||
  (import.meta.env?.VITE_TITLE_TEMPLATE ?? '%s | AI Resume Builder');

const APP_NAME =
  (typeof window !== 'undefined' && window.__APP_NAME__) ||
  (import.meta.env?.VITE_APP_NAME ?? 'AI Resume Builder');

// Поддерживаем RU / KK / EN
const LOCALES = {
  ru: {
    ogLocale: 'ru_RU',
    name: 'AI Resume Builder',
    defaultTitle: 'AI Resume Builder — Создайте профессиональное резюме за минуты',
    defaultDescription:
      'Создавайте идеальное резюме с помощью искусственного интеллекта: интеграция с HeadHunter, экспорт в PDF, персональные рекомендации.',
    imageAlt: 'Превью AI Resume Builder',
    pages: {
      home: {
        title: 'AI Resume Builder — Умный помощник для создания резюме',
        description:
          'Профессиональные резюме за минуты. AI-подсказки, интеграция с HeadHunter, экспорт в PDF.',
        keywords: 'резюме, cv, headhunter, карьера, работа, вакансии, ai',
      },
      builder: {
        title: 'Конструктор резюме — Создайте идеальное резюме',
        description:
          'Пошаговый конструктор с AI-подсказками: выберите шаблон, заполните данные, скачайте PDF.',
        keywords: 'конструктор резюме, создать резюме, шаблоны резюме',
      },
      vacancies: {
        title: 'Поиск вакансий — Интеграция с HeadHunter',
        description:
          'Ищите подходящие вакансии на HeadHunter с умной фильтрацией по навыкам и опыту.',
        keywords: 'вакансии, работа, headhunter, поиск работы',
      },
      recommendations: {
        title: 'AI-рекомендации — Развивайте карьеру',
        description:
          'Персональные рекомендации по профессиям, навыкам и курсам на основе вашего профиля.',
        keywords: 'карьера, развитие, навыки, курсы, обучение',
      },
    },
    breadcrumbs: { home: 'Главная' },
  },
  kk: {
    ogLocale: 'kk_KZ',
    name: 'AI Resume Builder',
    defaultTitle: 'AI Resume Builder — Профессиялық түйіндемені минуттарда жасаңыз',
    defaultDescription:
      'Жасанды интеллект көмегімен мінсіз түйіндеме жасаңыз: HeadHunter интеграциясы, PDF экспорт, жеке ұсыныстар.',
    imageAlt: 'AI Resume Builder алдын ала көрінісі',
    pages: {
      home: {
        title: 'AI Resume Builder — Түйіндеме жасауға ақылды көмекші',
        description:
          'Профессиялық түйіндеме бірнеше минутта. AI кеңестері, HeadHunter интеграциясы, PDF экспорт.',
        keywords: 'түйіндеме, cv, headhunter, мансап, жұмыс, вакансия, ai',
      },
      builder: {
        title: 'Түйіндеме конструкторы — Идеал түйіндеме жасаңыз',
        description:
          'Қадам-қадаммен конструктор: үлгіні таңдаңыз, деректерді толтырыңыз, PDF жүктеп алыңыз.',
        keywords: 'түйіндеме құру, түйіндеме үлгілері, конструктор',
      },
      vacancies: {
        title: 'Вакансия іздеу — HeadHunter интеграциясы',
        description:
          'Дағдыларыңыз бен тәжірибеңізге сай вакансияларды HeadHunter сайтынан іздеңіз.',
        keywords: 'вакансия, жұмыс, headhunter, жұмыс іздеу',
      },
      recommendations: {
        title: 'AI ұсыныстар — Мансапты дамыту',
        description:
          'Профильге негізделген мамандықтар, дағдылар және курстар бойынша жеке ұсыныстар.',
        keywords: 'мансап, даму, дағды, курс, оқу',
      },
    },
    breadcrumbs: { home: 'Басты бет' },
  },
  en: {
    ogLocale: 'en_US',
    name: 'AI Resume Builder',
    defaultTitle: 'AI Resume Builder — Create a professional resume in minutes',
    defaultDescription:
      'Build a standout resume with AI: HeadHunter integration, PDF export, and personalized recommendations.',
    imageAlt: 'AI Resume Builder preview',
    pages: {
      home: {
        title: 'AI Resume Builder — Smart resume assistant',
        description:
          'Create a professional resume in minutes. AI tips, HeadHunter integration, PDF export.',
        keywords: 'resume, cv, headhunter, career, jobs, vacancies, ai',
      },
      builder: {
        title: 'Resume builder — Craft your perfect resume',
        description:
          'Step-by-step builder with AI suggestions: pick a template, fill details, download PDF.',
        keywords: 'resume builder, create resume, resume templates',
      },
      vacancies: {
        title: 'Job search — HeadHunter integration',
        description:
          'Find relevant vacancies on HeadHunter with smart filtering by skills and experience.',
        keywords: 'vacancies, jobs, headhunter, job search',
      },
      recommendations: {
        title: 'AI recommendations — Grow your career',
        description:
          'Personalized suggestions for roles, skills, and courses based on your profile.',
        keywords: 'career, growth, skills, courses, learning',
      },
    },
    breadcrumbs: { home: 'Home' },
  },
};

// Порядок языков для alternate/hreflang
const ALT_LANGS = ['ru', 'kk', 'en'];

/* ============================ Утилиты дом-манипуляции ============================ */

function ensureMeta(attr, name, content) {
  if (typeof document === 'undefined') return;
  const selector = `meta[${attr}="${name}"]`;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function ensureTitle(text) {
  if (typeof document === 'undefined') return;
  document.title = text;
}

function ensureLink(rel, attrs, dataAttrKey) {
  if (typeof document === 'undefined') return;
  let selector = `link[rel="${rel}"]`;
  if (dataAttrKey) selector += `[data-${dataAttrKey}]`;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    if (dataAttrKey) el.dataset[dataAttrKey] = '1';
    document.head.appendChild(el);
  }
  Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function removeBySelector(selector) {
  if (typeof document === 'undefined') return;
  document.querySelectorAll(selector).forEach((n) => n.remove());
}

function setStructuredData(id, data) {
  if (typeof document === 'undefined') return;
  let el = document.querySelector(`script[type="application/ld+json"][data-id="${id}"]`);
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute('data-id', id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/* ============================ Вспомогательные функции ============================ */

// Определяем «страницу» из query (?page=builder|vacancies|recommendations)
function resolvePage(location) {
  const s = location?.search || '';
  if (s.includes('page=builder')) return 'builder';
  if (s.includes('page=vacancies')) return 'vacancies';
  if (s.includes('page=recommendations')) return 'recommendations';
  return 'home';
}

// Заголовок с шаблоном
function applyTitleTemplate(title) {
  const tpl = TITLE_TEMPLATE || '%s';
  return tpl.includes('%s') ? tpl.replace('%s', title) : `${title}`;
}

// Формируем URL с учётом query; для hreflang добавляем/заменяем lang=xx
function makePageUrl(location, lang) {
  const base = String(SITE_URL).replace(/\/+$/, '');
  const path = location?.pathname ?? '/';
  const url = new URL(base + path);

  const params = new URLSearchParams(location?.search || '');
  if (lang) {
    params.set('lang', lang);
  }
  const search = params.toString();
  return search ? `${url.toString()}?${search}` : url.toString();
}

function ogLocaleAlternates(currentLang) {
  return ALT_LANGS.filter((l) => l !== currentLang).map((l) => LOCALES[l]?.ogLocale).filter(Boolean);
}

/* ================================= Компонент SEO ================================= */

export function SEO({
  title,
  description,
  keywords,
  image,
  type = 'website',
  noindex = false,
  lang: langProp, // если хотите форсировать язык для конкретной страницы
}) {
  const location = useLocation();
  const langFromCtx = useContext(LanguageContext || ({})).lang;
  const lang = (langProp || langFromCtx || 'ru').toLowerCase();
  const page = resolvePage(location);

  const cfg = useMemo(() => {
    const L = LOCALES[lang] || LOCALES.ru;
    const pageCfg = L.pages[page] || L.pages.home;
    return {
      lang,
      ogLocale: L.ogLocale,
      name: L.name,
      pageTitle: title || pageCfg.title || L.defaultTitle,
      pageDescription: description || pageCfg.description || L.defaultDescription,
      pageKeywords: keywords || pageCfg.keywords || '',
      imageAlt: L.imageAlt,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, page, title, description, keywords]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const pageUrl = makePageUrl(location, lang);
    const canonical = makePageUrl({ pathname: location.pathname, search: '' }, lang);
    const finalTitle = applyTitleTemplate(cfg.pageTitle);
    const ogImageAbs = `${String(SITE_URL).replace(/\/+$/, '')}${String(image || DEFAULT_IMAGE)}`;

    // <title>
    ensureTitle(finalTitle);

    // Основные мета
    ensureMeta('name', 'description', cfg.pageDescription);
    if (cfg.pageKeywords) ensureMeta('name', 'keywords', cfg.pageKeywords);

    // robots
    ensureMeta('name', 'robots', noindex ? 'noindex,nofollow' : 'index,follow');

    // Open Graph
    ensureMeta('property', 'og:title', finalTitle);
    ensureMeta('property', 'og:description', cfg.pageDescription);
    ensureMeta('property', 'og:type', type);
    ensureMeta('property', 'og:url', pageUrl);
    ensureMeta('property', 'og:image', ogImageAbs);
    ensureMeta('property', 'og:image:alt', cfg.imageAlt || APP_NAME);
    ensureMeta('property', 'og:site_name', APP_NAME);
    ensureMeta('property', 'og:locale', cfg.ogLocale);

    // Удаляем прошлые og:locale:alternate и добавляем актуальные
    removeBySelector('meta[property="og:locale:alternate"][data-generated="1"]');
    ogLocaleAlternates(lang).forEach((alt) => {
      const el = document.createElement('meta');
      el.setAttribute('property', 'og:locale:alternate');
      el.setAttribute('content', alt);
      el.setAttribute('data-generated', '1');
      document.head.appendChild(el);
    });

    // Twitter
    ensureMeta('name', 'twitter:card', 'summary_large_image');
    ensureMeta('name', 'twitter:site', TWITTER_HANDLE);
    ensureMeta('name', 'twitter:title', finalTitle);
    ensureMeta('name', 'twitter:description', cfg.pageDescription);
    ensureMeta('name', 'twitter:image', ogImageAbs);

    // Canonical
    ensureLink('canonical', { href: canonical });

    // hreflang alternates
    removeBySelector('link[rel="alternate"][data-hreflang="1"]');
    ALT_LANGS.forEach((l) => {
      const href = makePageUrl(location, l);
      const hreflang =
        l === 'en' ? 'en' : l === 'kk' ? 'kk' : 'ru';
      const el = ensureLink('alternate', { href, hrefLang: hreflang }, 'hreflang');
      if (el) el.dataset.hreflang = '1';
    });
    // x-default
    const xdef = ensureLink('alternate', { href: makePageUrl(location, 'en'), hrefLang: 'x-default' }, 'hreflang');
    if (xdef) xdef.dataset.hreflang = '1';

    // PWA/UX (безопасно, не мешает)
    ensureMeta('name', 'theme-color', '#0ea5e9'); // Tailwind blue-500
    ensureMeta('name', 'apple-mobile-web-app-capable', 'yes');

    // JSON-LD: WebApplication
    setStructuredData('app', {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: APP_NAME,
      description: cfg.pageDescription,
      inLanguage: lang,
      url: SITE_URL,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@type': 'Organization', name: APP_NAME, url: SITE_URL },
    });

    // JSON-LD: WebSite + SearchAction (улучшает site-links)
    setStructuredData('website', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: APP_NAME,
      url: SITE_URL,
      inLanguage: lang,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${String(SITE_URL).replace(/\/+$/, '')}/?page=vacancies&text={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    });

    // JSON-LD: Хлебные крошки для внутренних страниц
    if (page !== 'home') {
      const L = LOCALES[lang] || LOCALES.ru;
      setStructuredData('breadcrumbs', {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: L.breadcrumbs.home,
            item: SITE_URL,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: cfg.pageTitle,
            item: pageUrl,
          },
        ],
      });
    } else {
      // очищаем breadcrumbs при переходе на главную
      removeBySelector('script[type="application/ld+json"][data-id="breadcrumbs"]');
    }

    // Отправка pageview в GA (если вы вручную инициализируете gtag где-то в app)
    const GA_ID =
      (typeof window !== 'undefined' && window.__GA_ID__) || import.meta.env?.VITE_GA_ID;
    if (GA_ID && typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('config', GA_ID, {
        page_path: location.pathname + location.search,
        page_title: finalTitle,
      });
    }
  }, [location, lang, cfg, type, noindex, image]);

  return null;
}

export default SEO;
