import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

const PersonalInfoSection = ({ data, onChange }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">{t('builder.personalInfo.title')}</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('builder.personalInfo.fullName')}
          </label>
          <input
            type="text"
            value={data.fullName || ''}
            onChange={(e) => onChange('fullName', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('builder.personalInfo.fullName')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('builder.personalInfo.email')}
          </label>
          <input
            type="email"
            value={data.email || ''}
            onChange={(e) => onChange('email', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('builder.personalInfo.email')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('builder.personalInfo.phone')}
          </label>
          <input
            type="tel"
            value={data.phone || ''}
            onChange={(e) => onChange('phone', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('builder.personalInfo.phone')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('builder.personalInfo.location')}
          </label>
          <input
            type="text"
            value={data.location || ''}
            onChange={(e) => onChange('location', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('builder.personalInfo.location')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('builder.personalInfo.position')}
          </label>
          <input
            type="text"
            value={data.position || ''}
            onChange={(e) => onChange('position', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('builder.personalInfo.position')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('builder.personalInfo.summary')}
          </label>
          <textarea
            value={data.summary || ''}
            onChange={(e) => onChange('summary', e.target.value)}
            rows="4"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('builder.personalInfo.summary')}
          />
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoSection;