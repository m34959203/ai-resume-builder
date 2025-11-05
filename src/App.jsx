import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import ErrorBoundary from './components/ErrorBoundary';
import BuilderPage from './components/BuilderPage';
import HHCallback from './pages/oauth/HHCallback';
import LanguageSwitcher from './components/LanguageSwitcher';
import SEO from './components/SEO';
import { useTranslation } from './hooks/useTranslation';

// ========================================
// HOMEPAGE COMPONENT
// ========================================
const HomePage = () => {
  const { t } = useTranslation();
  
  return (
    <>
      <SEO 
        title={t('home.title')}
        description={t('home.subtitle')}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="container mx-auto px-4 py-16">
          {/* Hero Section */}
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              {t('home.title')}
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              {t('home.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/builder"
                className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                {t('home.getStarted')} →
              </Link>
              <a
                href="#features"
                className="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-50 transition-all border-2 border-blue-600"
              >
                {t('home.learnMore')}
              </a>
            </div>
          </div>

          {/* Features Section */}
          <div id="features" className="grid md:grid-cols-3 gap-8 mt-20">
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="text-5xl mb-4">🤖</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">
                {t('home.features.ai.title')}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t('home.features.ai.description')}
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="text-5xl mb-4">📄</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">
                {t('home.features.templates.title')}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t('home.features.templates.description')}
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="text-5xl mb-4">💾</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">
                {t('home.features.export.title')}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t('home.features.export.description')}
              </p>
            </div>
          </div>

          {/* Additional Features */}
          <div className="grid md:grid-cols-2 gap-8 mt-12">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-8 rounded-xl shadow-lg text-white">
              <div className="text-4xl mb-4">🌍</div>
              <h3 className="text-2xl font-bold mb-3">
                {t('home.features.multilingual.title')}
              </h3>
              <p className="opacity-90">
                {t('home.features.multilingual.description')}
              </p>
            </div>

            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-8 rounded-xl shadow-lg text-white">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-2xl font-bold mb-3">
                {t('home.features.instant.title')}
              </h3>
              <p className="opacity-90">
                {t('home.features.instant.description')}
              </p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center mt-20 bg-white p-12 rounded-2xl shadow-xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t('home.cta.title')}
            </h2>
            <p className="text-gray-600 mb-6 text-lg">
              {t('home.cta.subtitle')}
            </p>
            <Link
              to="/builder"
              className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-10 py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg"
            >
              {t('home.cta.button')} 🚀
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

// ========================================
// HEADER COMPONENT
// ========================================
const Header = () => {
  const { t } = useTranslation();

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <span className="text-3xl">📝</span>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AI Resume
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className="text-gray-700 hover:text-blue-600 transition font-medium"
            >
              {t('nav.home')}
            </Link>
            <Link 
              to="/builder" 
              className="text-gray-700 hover:text-blue-600 transition font-medium"
            >
              {t('nav.builder')}
            </Link>
          </nav>

          {/* Language Switcher */}
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
};

// ========================================
// LOADING COMPONENT
// ========================================
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600 text-lg">Loading...</p>
    </div>
  </div>
);

// ========================================
// APP CONTENT (WITH ROUTES)
// ========================================
const AppContent = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/builder" element={<BuilderPage />} />
          <Route path="/oauth/hh/callback" element={<HHCallback />} />
          
          {/* 404 Page */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
                <p className="text-xl text-gray-600 mb-6">Page not found</p>
                <Link 
                  to="/" 
                  className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                >
                  Go Home
                </Link>
              </div>
            </div>
          } />
        </Routes>
      </Suspense>
    </div>
  );
};

// ========================================
// MAIN APP COMPONENT
// ========================================
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