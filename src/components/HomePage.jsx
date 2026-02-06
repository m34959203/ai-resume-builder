import React from 'react';
import { FileText, Briefcase, BarChart3, Sparkles } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

/* 3D Document Illustration */
function DocIllustration() {
  return (
    <div className="relative">
      <div className="w-[220px] h-[280px] sm:w-[260px] sm:h-[320px] bg-white rounded-[28px] shadow-[-12px_24px_60px_rgba(37,99,235,0.13)] border border-white/80 p-6 sm:p-7 relative animate-float">
        {/* Blue corner with AI */}
        <div className="absolute top-0 right-0 w-24 h-24 sm:w-[104px] sm:h-[104px] bg-[#2563EB] rounded-bl-[40px] rounded-tr-[28px] flex items-center justify-center">
          <div className="flex flex-col items-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="mb-0.5">
              <rect x="6" y="6" width="12" height="12" rx="2.5" stroke="white" strokeWidth="1.5" />
              <path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-white font-extrabold text-xl tracking-wide leading-none">AI</span>
          </div>
        </div>

        {/* Text lines */}
        <div className="space-y-5 mt-10 sm:mt-12">
          <div className="h-3.5 w-3/4 bg-slate-100 rounded-full" />
          <div className="space-y-2.5">
            <div className="h-[7px] w-full bg-slate-50 rounded-full" />
            <div className="h-[7px] w-full bg-slate-50 rounded-full" />
            <div className="h-[7px] w-4/5 bg-slate-50 rounded-full" />
          </div>
          <div className="h-3.5 w-1/2 bg-slate-100 rounded-full mt-6" />
          <div className="space-y-2.5">
            <div className="h-[7px] w-full bg-slate-50 rounded-full" />
            <div className="h-[7px] w-2/3 bg-slate-50 rounded-full" />
          </div>
        </div>
      </div>
      {/* Glow */}
      <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] bg-blue-400/15 blur-[80px] rounded-full" />
    </div>
  );
}

/* Feature card */
function FeatureCard({ icon: Icon, title, desc }) {
  return (
    <div className="bg-white/45 backdrop-blur-xl border border-white/60 p-6 sm:p-7 rounded-[22px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:bg-white/70 transition-all group cursor-default">
      <div className="w-12 h-12 bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-100/80 group-hover:scale-105 transition-transform">
        <Icon className="text-white" size={21} />
      </div>
      <h3 className="text-lg font-bold text-[#1E293B] mb-1.5 tracking-tight">{title}</h3>
      <p className="text-[#64748B] leading-relaxed text-[14px]">{desc}</p>
    </div>
  );
}

export default function HomePage({ onCreate, onFindJobs }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#F0F4FF] bg-mesh-gradient relative overflow-hidden antialiased text-slate-900">
      <main className="max-w-6xl mx-auto px-5 sm:px-8 pt-14 sm:pt-20 pb-12">

        {/* ===== Hero ===== */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-10">
          {/* Left */}
          <div className="max-w-xl space-y-5 text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#DBEAFE] text-[#2563EB] px-3.5 py-1.5 rounded-full text-[13px] font-semibold">
              <Sparkles size={13} />
              {t('home.badge')}
            </div>

            {/* Title */}
            <h1 className="text-[2.5rem] sm:text-[3.1rem] font-extrabold text-[#0F172A] leading-[1.1] tracking-tight">
              {t('home.titleLine1')}<br />
              {t('home.titleLine2')}
            </h1>

            {/* Subtitle */}
            <p className="text-[15px] sm:text-base text-[#475569] leading-relaxed max-w-md mx-auto lg:mx-0">
              {t('home.subtitle')}
            </p>

            {/* Buttons */}
            <div className="flex flex-wrap gap-3.5 justify-center lg:justify-start pt-2">
              <button
                onClick={onCreate}
                className="group relative flex items-center gap-2.5 px-7 py-3 bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] text-white rounded-xl font-semibold text-[15px] shadow-lg shadow-blue-300/40 transition-all hover:scale-[1.03] active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                <FileText size={17} />
                {t('home.createButton')}
              </button>

              <button
                onClick={onFindJobs}
                className="flex items-center gap-2.5 px-7 py-3 bg-white/60 backdrop-blur-md border border-slate-200/80 text-[#334155] rounded-xl font-semibold text-[15px] hover:bg-white transition-all shadow-sm"
              >
                <Briefcase size={17} className="text-[#3B82F6]" />
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-16 sm:mt-20">
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
      <footer className="w-full py-8 text-center text-slate-400 text-sm border-t border-slate-200/40">
        &copy; {new Date().getFullYear()} ZhezU AI Resume. All rights reserved.
      </footer>
    </div>
  );
}
