/* eslint-disable no-console */
'use strict';

const provider = (p, title, url, duration) => ({ provider: p, title, url, duration });

exports.getCourses = async function getCourses({ gaps = [], keywords = '' } = {}) {
  const top = (Array.isArray(gaps) ? gaps : []).slice(0, 6).map(g => (g.name || g).toString().trim()).filter(Boolean);
  const uniq = Array.from(new Set(top));
  const out = [];

  for (const skill of uniq) {
    const q = encodeURIComponent(skill);
    out.push(
      provider('Stepik',  `${skill} — курсы на русском`, `https://stepik.org/search?query=${q}`, '2–8 нед'),
      provider('Coursera',`${skill} — специализации`,    `https://www.coursera.org/search?query=${q}`, '1–3 мес'),
      provider('Udemy',   `${skill} — практические кейсы`,`https://www.udemy.com/courses/search/?q=${q}`, '1–2 мес'),
      provider('YouTube', `${skill} — плейлисты`,         `https://www.youtube.com/results?search_query=${q}+tutorial`, 'самообучение')
    );
  }
  // максимум 12
  return out.slice(0, 12);
};
