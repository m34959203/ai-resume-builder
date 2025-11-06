import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function VacancyList() {
  const { i18n, t } = useTranslation();
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadVacancies();
  }, [i18n.language]); // Перезагрузка при смене языка

  const loadVacancies = async () => {
    setLoading(true);
    try {
      // Загрузка вакансий
      const response = await fetch('/api/hh/vacancies');
      const data = await response.json();

      // Перевод если нужно
      if (i18n.language !== 'ru') {
        const translateResponse = await fetch('/api/translate/vacancies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vacancies: data.items,
            targetLang: i18n.language
          })
        });
        const translated = await translateResponse.json();
        setVacancies(translated.vacancies);
      } else {
        setVacancies(data.items);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>{t('nav.vacancies')}</h2>
      {loading && <div>{t('common.loading')}</div>}
      
      {vacancies.map(vacancy => (
        <div key={vacancy.id} className="vacancy-card">
          <h3>{vacancy.name}</h3>
          <p>{vacancy.employer?.name}</p>
          <div dangerouslySetInnerHTML={{ __html: vacancy.description }} />
        </div>
      ))}
    </div>
  );
}