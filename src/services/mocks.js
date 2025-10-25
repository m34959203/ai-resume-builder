// src/services/mocks.js
export const mockJobs = {
  items: [
    {
      id: 1,
      name: 'Frontend Developer',
      employer: { name: 'Tech Corp' },
      area: { name: 'Алматы' },
      salary: { from: 200000, to: 300000, currency: 'KZT' },
      snippet: { requirement: 'React, JS/TS, CSS', responsibility: 'Разработка SPA' }
    },
    {
      id: 2,
      name: 'UI/UX Designer',
      employer: { name: 'Design Studio' },
      area: { name: 'Астана' },
      salary: { from: 180000, to: 250000, currency: 'KZT' },
      snippet: { requirement: 'Figma, Research', responsibility: 'Прототипирование' }
    },
    {
      id: 3,
      name: 'Data Analyst',
      employer: { name: 'Analytics Pro' },
      area: { name: 'Алматы' },
      salary: { from: 220000, to: 280000, currency: 'KZT' },
      snippet: { requirement: 'Python, SQL, BI', responsibility: 'Аналитика и отчёты' }
    }
  ],
  found: 3,
  page: 1,
  pages: 1
};

export const mockResumes = [
  { id: 'mock-1', title: 'Junior Frontend', area: { name: 'Алматы' }, skills: ['React', 'JavaScript'] }
];
