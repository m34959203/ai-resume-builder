import React from 'react';
import { FileText, Briefcase, BarChart3, Sparkles } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

/* Hero illustration — SVG 3D document */
function DocIllustration() {
  return (
    <div className="relative animate-float">
      <img
        src="/images/hero-doc.svg"
        alt="AI Resume Document"
        className="w-[200px] h-[230px] sm:w-[240px] sm:h-[280px] drop-shadow-2xl"
        draggable={false}
      />
      {/* Glow */}
      <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] bg-blue-400/15 blur-[80px] rounded-full" />
    </div>
  );
}

/* Feature card */
function FeatureCard({ icon: Icon, title, desc }) {
  return (
    <div className="bg-white/45 backdrop-blur-xl border border-white/60 p-5 sm:p-6 rounded-[20px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:bg-white/70 transition-all group cursor-default">
      <div className="w-11 h-11 bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] rounded-lg flex items-center justify-center mb-3 shadow-lg shadow-blue-100/80 group-hover:scale-105 transition-transform">
        <Icon className="text-white" size={19} />
      </div>
      <h3 className="text-base font-bold text-[#1E293B] mb-1 tracking-tight">{title}</h3>
      <p className="text-[#64748B] leading-relaxed text-[13px]">{desc}</p>
    </div>
  );
}

export default function HomePage({ onCreate, onFindJobs }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#F0F4FF] bg-mesh-gradient relative overflow-hidden antialiased text-slate-900">
      <main className="max-w-5xl mx-auto px-5 sm:px-8 pt-10 sm:pt-14 pb-8">

        {/* ===== Hero ===== */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-16">
          {/* Left */}
          <div className="max-w-lg space-y-4 text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#DBEAFE] text-[#2563EB] px-3.5 py-1.5 rounded-full text-[13px] font-semibold">
              <Sparkles size={13} />
              {t('home.badge')}
            </div>

            {/* Title */}
            <h1 className="text-[2.2rem] sm:text-[2.75rem] font-extrabold text-[#0F172A] leading-[1.1] tracking-tight">
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10 sm:mt-12">
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
