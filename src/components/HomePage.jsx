import React from 'react';
import { FileText, Briefcase, TrendingUp, Sparkles } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

export default function HomePage({ onCreate, onFindJobs }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mb-6">
            <Sparkles size={16} />
            <span className="text-sm font-medium">{t('home.badge')}</span>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            {t('home.titlePrefix')}{' '}
            <span className="text-blue-600">{t('home.titleAccent')}</span>
          </h1>

          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            {t('home.subtitle')}
          </p>

          <div className="flex gap-4 justify-center">
            <button
              onClick={onCreate}
              className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2 shadow-lg"
            >
              <FileText size={20} /> {t('home.createButton')}
            </button>
            <button
              onClick={onFindJobs}
              className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-50 transition border-2 border-blue-600 flex items-center gap-2"
            >
              <Briefcase size={20} /> {t('home.findJobsButton')}
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <FileText className="text-blue-600" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">{t('home.features.ai.title')}</h3>
            <p className="text-gray-600">{t('home.features.ai.description')}</p>
          </div>
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Briefcase className="text-purple-600" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">{t('home.features.vacancies.title')}</h3>
            <p className="text-gray-600">{t('home.features.vacancies.description')}</p>
          </div>
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">{t('home.features.recommendations.title')}</h3>
            <p className="text-gray-600">{t('home.features.recommendations.description')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
