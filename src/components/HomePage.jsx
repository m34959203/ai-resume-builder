import React from 'react';
import { FileText, Briefcase, BarChart3, Sparkles } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

/* 3D Document Illustration — CSS only, no images */
function DocIllustration() {
  return (
    <div className="relative">
      {/* Document card */}
      <div className="w-[320px] h-[400px] sm:w-[380px] sm:h-[470px] bg-white rounded-[40px] shadow-[-20px_40px_80px_rgba(37,99,235,0.15)] border border-white p-8 sm:p-10 relative animate-float">
        {/* Blue corner with AI */}
        <div className="absolute top-0 right-0 w-32 h-32 sm:w-36 sm:h-36 bg-[#2563EB] rounded-bl-[60px] rounded-tr-[40px] flex items-center justify-center shadow-inner">
          {/* Chip icon */}
          <div className="flex flex-col items-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="mb-1">
              <rect x="6" y="6" width="12" height="12" rx="2.5" stroke="white" strokeWidth="1.5" />
              <path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-white font-extrabold text-3xl tracking-wide">AI</span>
          </div>
        </div>

        {/* Text lines */}
        <div className="space-y-7 mt-16 sm:mt-20">
          <div className="h-5 w-3/4 bg-slate-100 rounded-full" />
          <div className="space-y-3.5">
            <div className="h-2.5 w-full bg-slate-50 rounded-full" />
            <div className="h-2.5 w-full bg-slate-50 rounded-full" />
            <div className="h-2.5 w-4/5 bg-slate-50 rounded-full" />
          </div>
          <div className="h-5 w-1/2 bg-slate-100 rounded-full mt-10" />
          <div className="space-y-3.5">
            <div className="h-2.5 w-full bg-slate-50 rounded-full" />
            <div className="h-2.5 w-2/3 bg-slate-50 rounded-full" />
          </div>
        </div>
      </div>
      {/* Glow behind */}
      <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-400/20 blur-[100px] rounded-full" />
    </div>
  );
}

/* Feature card */
function FeatureCard({ icon: Icon, title, desc }) {
  return (
    <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-8 sm:p-10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.03)] hover:bg-white/80 transition-all group cursor-default">
      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] rounded-2xl flex items-center justify-center mb-6 sm:mb-8 shadow-xl shadow-blue-100 group-hover:scale-110 transition-transform">
        <Icon className="text-white" size={24} />
      </div>
      <h3 className="text-xl sm:text-2xl font-bold text-[#1E293B] mb-3 tracking-tight">{title}</h3>
      <p className="text-[#64748B] font-medium leading-relaxed text-[15px]">{desc}</p>
    </div>
  );
}

export default function HomePage({ onCreate, onFindJobs }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#F0F4FF] bg-mesh-gradient relative overflow-hidden antialiased text-slate-900">
      <main className="max-w-7xl mx-auto px-5 sm:px-10 pt-28 sm:pt-40 pb-20">

        {/* ===== Hero ===== */}
        <div className="flex flex-col lg:flex-row items-center justify-between w-full gap-12 lg:gap-20">
          {/* Left */}
          <div className="max-w-2xl space-y-8 sm:space-y-10 text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#DBEAFE] text-[#2563EB] px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">
              <Sparkles size={14} />
              {t('home.badge')}
            </div>

            {/* Title */}
            <h1 className="text-5xl sm:text-7xl font-extrabold text-[#0F172A] leading-[1.05] tracking-tight">
              {t('home.titleLine1')}<br />
              {t('home.titleLine2')}
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-[#475569] leading-relaxed font-medium opacity-90 max-w-lg mx-auto lg:mx-0">
              {t('home.subtitle')}
            </p>

            {/* Buttons */}
            <div className="flex flex-wrap gap-5 justify-center lg:justify-start">
              <button
                onClick={onCreate}
                className="group relative flex items-center gap-3 px-8 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] text-white rounded-[20px] font-bold text-base sm:text-lg shadow-2xl shadow-blue-300 transition-all hover:scale-105 active:scale-95 overflow-hidden"
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                <FileText size={20} />
                {t('home.createButton')}
              </button>

              <button
                onClick={onFindJobs}
                className="flex items-center gap-3 px-8 sm:px-10 py-4 sm:py-5 bg-white/50 backdrop-blur-md border border-slate-200 text-[#334155] rounded-[20px] font-bold text-base sm:text-lg hover:bg-white transition-all shadow-sm"
              >
                <Briefcase size={20} className="text-[#3B82F6]" />
                {t('home.findJobsButton')}
              </button>
            </div>
          </div>

          {/* Right — 3D document */}
          <div className="flex-shrink-0">
            <DocIllustration />
          </div>
        </div>

        {/* ===== Feature cards ===== */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 w-full mt-24 sm:mt-32">
          <FeatureCard
            icon={FileText}
            title={t('home.features.ai.title')}
            desc={t('home.features.ai.description')}
          />
          <FeatureCard
            icon={Briefcase}
            title={t('home.features.vacancies.title')}
            desc={t('home.features.vacancies.description')}
          />
          <FeatureCard
            icon={BarChart3}
            title={t('home.features.recommendations.title')}
            desc={t('home.features.recommendations.description')}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-10 text-center text-slate-400 text-sm font-medium border-t border-slate-200/50">
        &copy; {new Date().getFullYear()} ZhezU AI Resume. All rights reserved.
      </footer>
    </div>
  );
}
