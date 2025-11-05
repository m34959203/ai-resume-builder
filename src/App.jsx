import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import ErrorBoundary from './components/ErrorBoundary';
import BuilderPage from './components/BuilderPage';
import HHCallback from './pages/oauth/HHCallback';
import LanguageSwitcher from './components/LanguageSwitcher';
import SEO from './components/SEO';
import { useTranslation } from './hooks/useTranslation';

const HomePage = () => {
  const { t } = useTranslation();
  
  return (
    <>
      <SEO />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              {t('home.title')}
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              {t('home.subtitle')}
            </p>
            <a
              href="/builder"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              {t('home.getStarted')}
            </a>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-bold mb-3">{t('home.features.ai.title')}</h3>
              <p className="text-gray-600">{t('home.features.ai.description')}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-4xl mb-4">📄</div>
              <h3 className="text-xl font-bold mb-3">{t('home.features.templates.title')}</h3>
              <p className="text-gray-600">{t('home.features.templates.description')}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-4xl mb-4">💾</div>
              <h3 className="text-xl font-bold mb-3">{t('home.features.export.title')}</h3>
              <p className="text-gray-600">{t('home.features.export.description')}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const AppContent = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <a href="/" className="text-2xl font-bold text-blue-600">
            AI Resume
          </a>
          <LanguageSwitcher />
        </div>
      </header>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/builder" element={<BuilderPage />} />
        <Route path="/oauth/hh/callback" element={<HHCallback />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <Router>
          <AppContent />
        </Router>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;