import React from 'react';
import { FileText, Briefcase, TrendingUp, Sparkles } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

/* 3D-style AI document illustration */
function HeroIllustration() {
  return (
    <div className="relative w-56 h-64 sm:w-64 sm:h-72 flex-shrink-0">
      {/* Document card */}
      <div
        className="absolute inset-0 rounded-2xl shadow-2xl transform rotate-3"
        style={{
          background: 'linear-gradient(145deg, #f0f4ff 0%, #e8ecf4 100%)',
          border: '1px solid rgba(200,210,230,0.5)',
        }}
      >
        {/* Header accent line */}
        <div className="absolute top-8 left-6 right-6 h-2.5 bg-blue-300/50 rounded-full" />
        {/* Text lines */}
        <div className="absolute top-14 left-6 right-6 space-y-2.5">
          <div className="h-2 bg-gray-300/60 rounded-full w-full" />
          <div className="h-2 bg-gray-300/60 rounded-full w-5/6" />
          <div className="h-2 bg-gray-300/60 rounded-full w-3/4" />
          <div className="h-2 bg-blue-200/50 rounded-full w-4/5" />
          <div className="h-2 bg-gray-300/60 rounded-full w-full" />
          <div className="h-2 bg-gray-300/60 rounded-full w-2/3" />
        </div>
      </div>

      {/* AI chip badge */}
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-2xl shadow-xl flex flex-col items-center justify-center transform rotate-6 bg-gradient-to-br from-blue-400 to-blue-600">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mb-0.5">
          <rect x="6" y="6" width="12" height="12" rx="2" stroke="white" strokeWidth="2" />
          <path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="text-white text-sm font-extrabold tracking-wide">AI</span>
      </div>

      {/* Soft shadow / glow */}
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-3/4 h-6 bg-blue-400/15 blur-2xl rounded-full" />
    </div>
  );
}

export default function HomePage({ onCreate, onFindJobs }) {
  const { t } = useTranslation();

  const features = [
    { icon: FileText, titleKey: 'home.features.ai.title', descKey: 'home.features.ai.description' },
    { icon: Briefcase, titleKey: 'home.features.vacancies.title', descKey: 'home.features.vacancies.description' },
    { icon: TrendingUp, titleKey: 'home.features.recommendations.title', descKey: 'home.features.recommendations.description' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #eef1f8 0%, #f4f0fa 50%, #eef1f8 100%)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">

        {/* Hero */}
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16 mb-16 sm:mb-24">
          <div className="flex-1 text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full mb-6 border border-blue-100">
              <Sparkles size={14} />
              <span className="text-sm font-medium">{t('home.badge')}</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
              {t('home.titleLine1')}<br />
              {t('home.titleLine2')}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-gray-500 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {t('home.subtitle')}
            </p>

            {/* CTA */}
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
              <button
                onClick={onCreate}
                className="px-7 py-3.5 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2 hover:shadow-xl hover:shadow-blue-500/30"
                style={{ background: 'linear-gradient(135deg, #5b9cf5 0%, #3b82f6 50%, #2563eb 100%)' }}
              >
                <FileText size={18} /> {t('home.createButton')}
              </button>
              <button
                onClick={onFindJobs}
                className="px-7 py-3.5 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all border border-blue-200 flex items-center gap-2 shadow-sm"
              >
                <Briefcase size={18} /> {t('home.findJobsButton')}
              </button>
            </div>
          </div>

          <HeroIllustration />
        </div>

        {/* Feature Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, titleKey, descKey }, i) => (
            <div
              key={i}
              className="bg-white/60 backdrop-blur-sm p-7 rounded-2xl border border-white/80 hover:shadow-lg hover:bg-white/80 transition-all"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-md shadow-blue-500/15 bg-gradient-to-br from-blue-400 to-blue-600">
                <Icon className="text-white" size={22} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1.5">{t(titleKey)}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{t(descKey)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} ZhezU AI Resume. All rights reserved.
      </footer>
    </div>
  );
}
