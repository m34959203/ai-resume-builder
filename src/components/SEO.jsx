import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from '../hooks/useTranslation';

const SEO = ({ title, description, keywords, image }) => {
  const { t, language } = useTranslation();
  
  const defaultTitle = t('home.title');
  const defaultDescription = t('home.subtitle');
  
  const siteTitle = title ? `${title} | ${defaultTitle}` : defaultTitle;

  const localeMap = {
    en: 'en_US',
    kk: 'kk_KZ',
    ru: 'ru_RU'
  };

  return (
    <Helmet>
      <html lang={language} />
      <title>{siteTitle}</title>
      <meta name="description" content={description || defaultDescription} />
      {keywords && <meta name="keywords" content={keywords} />}
      
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description || defaultDescription} />
      <meta property="og:locale" content={localeMap[language] || 'en_US'} />
      {image && <meta property="og:image" content={image} />}
      
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description || defaultDescription} />
      {image && <meta name="twitter:image" content={image} />}
    </Helmet>
  );
};

export default SEO;