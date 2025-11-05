// src/components/SEO.jsx - SEO and Meta Tags Management
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SEO_CONFIG = {
  defaultTitle: 'AI Resume Builder - Создайте профессиональное резюме за минуты',
  titleTemplate: '%s | AI Resume Builder',
  defaultDescription: 'Создавайте идеальное резюме с помощью искусственного интеллекта. Интеграция с HeadHunter, экспорт в PDF, персональные рекомендации.',
  siteUrl: 'https://your-username.github.io/ai-resume-builder',
  defaultImage: '/og-image.png',
  twitterHandle: '@airesume',
};

const PAGE_CONFIGS = {
  home: {
    title: 'AI Resume Builder - Умный помощник для создания резюме',
    description: 'Профессиональные резюме за минуты. AI-подсказки, HeadHunter интеграция, экспорт в PDF',
    keywords: 'резюме, cv, headhunter, карьера, работа, вакансии, ai',
  },
  builder: {
    title: 'Конструктор резюме - Создайте идеальное резюме',
    description: 'Пошаговый конструктор с AI-подсказками. Выберите шаблон, заполните данные, скачайте PDF',
    keywords: 'конструктор резюме, создать резюме, шаблоны резюме',
  },
  vacancies: {
    title: 'Поиск вакансий - HeadHunter интеграция',
    description: 'Поиск подходящих вакансий на HeadHunter с умной фильтрацией по навыкам',
    keywords: 'вакансии, работа, headhunter, поиск работы',
  },
  recommendations: {
    title: 'AI Рекомендации - Развивайте карьеру',
    description: 'Персональные рекомендации по профессиям, навыкам и курсам от AI',
    keywords: 'карьера, развитие, навыки, курсы, обучение',
  },
};

function updateMetaTag(property, content, isName = false) {
  const attr = isName ? 'name' : 'property';
  let element = document.querySelector(`meta[${attr}="${property}"]`);
  
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, property);
    document.head.appendChild(element);
  }
  
  element.setAttribute('content', content);
}

function setStructuredData(data) {
  let script = document.querySelector('script[type="application/ld+json"]');
  
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  
  script.textContent = JSON.stringify(data);
}

export function SEO({ title, description, keywords, image, type = 'website', noindex = false }) {
  const location = useLocation();

  useEffect(() => {
    const page = location.search.includes('page=builder') ? 'builder'
      : location.search.includes('page=vacancies') ? 'vacancies'
      : location.search.includes('page=recommendations') ? 'recommendations'
      : 'home';

    const config = PAGE_CONFIGS[page] || PAGE_CONFIGS.home;
    const pageTitle = title || config.title || SEO_CONFIG.defaultTitle;
    const pageDescription = description || config.description || SEO_CONFIG.defaultDescription;
    const pageKeywords = keywords || config.keywords || '';
    const pageImage = image || SEO_CONFIG.defaultImage;
    const pageUrl = `${SEO_CONFIG.siteUrl}${location.pathname}${location.search}`;

    // Update title
    document.title = pageTitle;

    // Meta tags
    updateMetaTag('description', pageDescription, true);
    updateMetaTag('keywords', pageKeywords, true);
    
    // Open Graph
    updateMetaTag('og:title', pageTitle);
    updateMetaTag('og:description', pageDescription);
    updateMetaTag('og:type', type);
    updateMetaTag('og:url', pageUrl);
    updateMetaTag('og:image', `${SEO_CONFIG.siteUrl}${pageImage}`);
    updateMetaTag('og:site_name', 'AI Resume Builder');
    updateMetaTag('og:locale', 'ru_RU');

    // Twitter Card
    updateMetaTag('twitter:card', 'summary_large_image', true);
    updateMetaTag('twitter:site', SEO_CONFIG.twitterHandle, true);
    updateMetaTag('twitter:title', pageTitle, true);
    updateMetaTag('twitter:description', pageDescription, true);
    updateMetaTag('twitter:image', `${SEO_CONFIG.siteUrl}${pageImage}`, true);

    // Robots
    if (noindex) {
      updateMetaTag('robots', 'noindex,nofollow', true);
    } else {
      updateMetaTag('robots', 'index,follow', true);
    }

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = pageUrl;

    // Structured Data (JSON-LD)
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'AI Resume Builder',
      description: pageDescription,
      url: SEO_CONFIG.siteUrl,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Any',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      author: {
        '@type': 'Organization',
        name: 'AI Resume Builder',
      },
    };

    setStructuredData(structuredData);

    // Breadcrumbs for non-home pages
    if (page !== 'home') {
      const breadcrumbData = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Главная',
            item: SEO_CONFIG.siteUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: config.title,
            item: pageUrl,
          },
        ],
      };

      let breadcrumbScript = document.querySelector('script[data-breadcrumb]');
      if (!breadcrumbScript) {
        breadcrumbScript = document.createElement('script');
        breadcrumbScript.type = 'application/ld+json';
        breadcrumbScript.setAttribute('data-breadcrumb', 'true');
        document.head.appendChild(breadcrumbScript);
      }
      breadcrumbScript.textContent = JSON.stringify(breadcrumbData);
    }

    // Google Analytics (if configured)
    if (window.gtag && process.env.GA_MEASUREMENT_ID) {
      window.gtag('config', process.env.GA_MEASUREMENT_ID, {
        page_path: location.pathname + location.search,
        page_title: pageTitle,
      });
    }
  }, [location, title, description, keywords, image, type, noindex]);

  return null;
}

export default SEO;