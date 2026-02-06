import React from 'react';
import { FileText, Briefcase, TrendingUp, Sparkles } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

/* 3D-style AI document illustration — large */
function HeroIllustration() {
  return (
    <div className="relative w-64 h-72 sm:w-80 sm:h-[360px] flex-shrink-0">
      {/* Shadow underneath */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[70%] h-10 bg-blue-300/20 blur-3xl rounded-full" />

      {/* Document card */}
      <div
        className="absolute inset-4 sm:inset-6 rounded-3xl transform rotate-3"
        style={{
          background: 'linear-gradient(155deg, #f5f7fd 0%, #e6eaf5 100%)',
          boxShadow: '0 20px 60px -15px rgba(100,120,180,0.25), 0 8px 24px -8px rgba(100,120,180,0.15)',
          border: '1px solid rgba(210,218,240,0.6)',
        }}
      >
        {/* Header accent */}
        <div className="absolute top-8 left-7 right-7 h-3 bg-blue-300/40 rounded-full" />
        {/* Text lines */}
        <div className="absolute top-16 left-7 right-7 space-y-3">
          <div className="h-2.5 bg-gray-300/50 rounded-full w-full" />
          <div className="h-2.5 bg-gray-300/50 rounded-full w-[85%]" />
          <div className="h-2.5 bg-gray-300/50 rounded-full w-3/4" />
          <div className="h-2.5 bg-blue-200/40 rounded-full w-[80%]" />
          <div className="h-2.5 bg-gray-300/50 rounded-full w-full" />
          <div className="h-2.5 bg-gray-300/50 rounded-full w-2/3" />
          <div className="h-2.5 bg-gray-300/50 rounded-full w-[90%]" />
          <div className="h-2.5 bg-blue-200/40 rounded-full w-3/5" />
        </div>
      </div>

      {/* AI chip badge */}
      <div
        className="absolute -top-2 -right-2 sm:top-0 sm:right-0 w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] rounded-2xl flex flex-col items-center justify-center transform rotate-6"
        style={{
          background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)',
          boxShadow: '0 8px 30px -4px rgba(37,99,235,0.5)',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mb-0.5 sm:w-7 sm:h-7">
          <rect x="6" y="6" width="12" height="12" rx="2" stroke="white" strokeWidth="1.8" />
          <path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="text-white text-base sm:text-lg font-extrabold tracking-wide">AI</span>
      </div>
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
    <div className="min-h-screen" style={{ background: 'linear-gradient(140deg, #e8ecf6 0%, #ede8f5 40%, #f0ecf8 60%, #e8ecf6 100%)' }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-8">

        {/* Hero */}
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-4 mb-20 sm:mb-28">
          <div className="flex-1 text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-50/80 text-blue-600 px-5 py-2 rounded-full mb-7 border border-blue-100/80">
              <Sparkles size={15} />
              <span className="text-sm font-medium">{t('home.badge')}</span>
            </div>

            {/* Title */}
            <h1 className="text-[2.5rem] sm:text-[3.25rem] font-extrabold text-gray-900 leading-[1.15] mb-5 tracking-tight">
              {t('home.titleLine1')}<br />
              {t('home.titleLine2')}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-[17px] text-gray-500 mb-9 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              {t('home.subtitle')}
            </p>

            {/* CTA */}
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <button
                onClick={onCreate}
                className="px-8 py-4 text-white rounded-2xl font-semibold transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2.5 hover:shadow-xl hover:shadow-blue-500/35 text-[15px]"
                style={{ background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 40%, #2563eb 100%)' }}
              >
                <FileText size={19} /> {t('home.createButton')}
              </button>
              <button
                onClick={onFindJobs}
                className="px-8 py-4 bg-white text-blue-600 rounded-2xl font-semibold hover:bg-blue-50/80 transition-all border border-gray-200 flex items-center gap-2.5 shadow-sm text-[15px]"
              >
                <Briefcase size={19} /> {t('home.findJobsButton')}
              </button>
            </div>
          </div>

          <HeroIllustration />
        </div>

        {/* Feature Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, titleKey, descKey }, i) => (
            <div
              key={i}
              className="bg-white/50 backdrop-blur-sm p-8 rounded-3xl border border-white/70 hover:shadow-xl hover:bg-white/70 transition-all"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.03), 0 6px 20px rgba(0,0,0,0.03)' }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                style={{
                  background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)',
                  boxShadow: '0 4px 14px -2px rgba(37,99,235,0.35)',
                }}
              >
                <Icon className="text-white" size={26} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t(titleKey)}</h3>
              <p className="text-gray-500 text-[15px] leading-relaxed">{t(descKey)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-10 text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} ZhezU AI Resume. All rights reserved.
      </footer>
    </div>
  );
}
