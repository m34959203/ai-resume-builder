// src/components/PersonalInfoSection.jsx
import React from 'react';

export default function PersonalInfoSection({ profile, onChange }) {
  // onChange(field, value) – родитель обновляет состояние профиля

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Личная информация</h2>

      {/* Фото */}
      <div className="flex flex-col items-center mb-8">
        {/* ... твой загрузчик аватара, без изменений ... */}
        <p className="text-sm text-gray-500 mt-2">Рекомендуется загрузить фото</p>
      </div>

      {/* Имя */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Полное имя *
        </label>
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          placeholder="Иван Иванов"
          value={profile.fullName || ''}
          onChange={(e) => onChange('fullName', e.target.value)}
        />
      </div>

      {/* Желаемая должность */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Желаемая должность
        </label>
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          placeholder="Frontend Developer"
          value={profile.targetPosition || ''}
          onChange={(e) => onChange('targetPosition', e.target.value)}
        />
      </div>

      {/* Email / Телефон */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="ivan@example.com"
            value={profile.email || ''}
            onChange={(e) => onChange('email', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Телефон *
          </label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="+7 (777) 123-45-67"
            value={profile.phone || ''}
            onChange={(e) => onChange('phone', e.target.value)}
          />
        </div>
      </div>

      {/* Город */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Город
        </label>
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          placeholder="Алматы"
          value={profile.city || ''}
          onChange={(e) => onChange('city', e.target.value)}
        />
      </div>

      {/* --- НОВЫЕ ПОЛЯ ------------------------------------- */}

      {/* Возраст */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Возраст
          </label>
          <input
            type="number"
            min="14"
            max="100"
            className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="29"
            value={profile.age || ''}
            onChange={(e) => onChange('age', e.target.value)}
          />
        </div>

        {/* Семейное положение */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Семейное положение
          </label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="Женат / замужем / не состою"
            value={profile.maritalStatus || ''}
            onChange={(e) => onChange('maritalStatus', e.target.value)}
          />
        </div>
      </div>

      {/* Дети / Водительские права */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Дети
          </label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="Есть / Нет (указать возраст при желании)"
            value={profile.children || ''}
            onChange={(e) => onChange('children', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Водительские права
          </label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="B, B1 / нет прав"
            value={profile.driversLicense || ''}
            onChange={(e) => onChange('driversLicense', e.target.value)}
          />
        </div>
      </div>
    </section>
  );
}
