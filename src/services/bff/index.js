// src/services/bff/index.js — Barrel re-export

export { API_BASE } from './env';
export { BFFHttpError, isHttpError, safeFetchJSON } from './http';
export { normalizeExperience, getDefaultHost, getDefaultCurrency } from './normalize';
export { startHHOAuth, finishHHOAuth, refreshHH, logoutHH, getHHMe, hhIsAuthed, hhListResumes, hhRespond } from './oauth';
export { fetchAreas, clearAreasCache, resolveAreaId, suggestCities } from './areas';
export { searchJobs, searchJobsSmart, searchVacanciesRaw } from './jobs';
export { inferSearchFromProfile, polishText, polishBatch } from './ai';
export { fetchRecommendations, generateRecommendations, improveProfileAI } from './recommendations';
export { getUserResumes, importResume, ping, getServerVersion } from './resumes';
export { translateText, translateTextBatch, translateProfileForLang } from './translate';
export { fetchCourses } from './courses';
