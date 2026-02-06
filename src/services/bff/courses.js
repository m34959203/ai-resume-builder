// src/services/bff/courses.js — Fetch real courses from BFF (Stepik, Coursera, YouTube)

import { safeFetchJSON } from './http';

/**
 * fetchCourses({ skills: ['React', 'TypeScript'], limit: 12 })
 * → { ok, courses: [{ provider, title, url, cover?, duration?, description?, source, learners?, channel? }], count }
 */
export async function fetchCourses({ skills = [], limit = 12 } = {}) {
  const skillsStr = (Array.isArray(skills) ? skills : [skills])
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .join(',');

  if (!skillsStr) return { ok: true, courses: [], count: 0 };

  try {
    const resp = await safeFetchJSON(
      `/courses/search?skills=${encodeURIComponent(skillsStr)}&limit=${limit}`,
      { method: 'GET', timeoutMs: 15000 },
    );
    return {
      ok: true,
      courses: Array.isArray(resp?.courses) ? resp.courses : [],
      count: resp?.count || 0,
    };
  } catch {
    return { ok: false, courses: [], count: 0 };
  }
}
