// src/services/bff/resumes.js — User resumes, health check, version

import { safeFetchJSON } from './http';
import { USE_MOCKS } from './env';
import { mockResumes } from '../mocks';

export async function getUserResumes(options = {}) {
  const data = await safeFetchJSON('/hh/resumes', { method: 'GET', ...options });
  if (data == null && USE_MOCKS) return [...mockResumes];
  return data;
}

// Может отсутствовать на BFF — оставлен для совместимости
export async function importResume(hhResumeId, options = {}) {
  return safeFetchJSON(`/profile/import/hh/${encodeURIComponent(hhResumeId)}`, {
    method: 'POST',
    ...options,
  });
}

export async function ping(options = {}) {
  return safeFetchJSON('/health', options).catch(() =>
    safeFetchJSON('/alive', options).catch(() => null)
  );
}

export async function getServerVersion(options = {}) {
  // унифицируем с /version
  return safeFetchJSON('/version', options).catch(() => null);
}
