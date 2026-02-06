/**
 * Shared profile utilities — replaces duplicated profile analysis logic
 * across AIResumeBuilder.jsx, bff.js, and server/index.js.
 */

import { norm, uniqCI, isBlank } from './strings';
import { pickLatestExperience, yearsOfExperience } from './dates';

/** Derive the desired role from various profile fields */
export function deriveDesiredRole(profile) {
  const fields = [
    profile?.position,
    profile?.desiredRole,
    profile?.desiredPosition,
    profile?.targetRole,
    profile?.objective,
  ];
  for (const f of fields) {
    const val = String(f || '').trim();
    if (val) return val;
  }
  const latest = pickLatestExperience(profile);
  const role = String(latest?.position || latest?.title || latest?.role || '').trim();
  if (role) return role;

  const skills = extractSkillNames(profile);
  if (skills.length) return skills.slice(0, 3).join(' ');

  const sum = String(profile?.summary || '').trim();
  if (sum) return sum.split(/\s+/).slice(0, 3).join(' ');
  return '';
}

/** Extract skill names from profile (handles strings and objects) */
export function extractSkillName(s) {
  if (!s) return '';
  if (typeof s === 'string') return s;
  return s.name || s.title || s.skill || '';
}

/** Extract and deduplicate skills from profile */
export function extractSkillNames(profile = {}) {
  const raw = (Array.isArray(profile.skills) ? profile.skills : []).map(extractSkillName);
  return uniqCI(raw).filter(Boolean);
}

/** Check if profile has enough data for AI recommendations */
export function hasProfileForRecs(profile) {
  if (!profile) return false;
  const hasSkills = Array.isArray(profile.skills) && profile.skills.length > 0;
  const hasExp = Array.isArray(profile.experience) && profile.experience.length > 0;
  const hasRole = !isBlank(profile.position || profile.desiredRole || profile.targetRole);
  const hasSummary = !isBlank(profile.summary) && String(profile.summary).trim().length > 10;
  return hasSkills || hasExp || hasRole || hasSummary;
}

/** List missing profile sections for user guidance */
export function missingProfileSections(profile, t = (k) => k) {
  const missing = [];
  if (!Array.isArray(profile?.experience) || !profile.experience.length) {
    missing.push(t('recommendations.missing.experience'));
  }
  if (!Array.isArray(profile?.skills) || !profile.skills.length) {
    missing.push(t('recommendations.missing.skills'));
  }
  if (!Array.isArray(profile?.education) || !profile.education.length) {
    missing.push(t('recommendations.missing.education'));
  }
  if (isBlank(profile?.summary)) {
    missing.push(t('recommendations.missing.summary'));
  }
  return missing;
}

/** Calculate market fit score (0-100) based on profile completeness */
export function computeMarketFit(profile = {}) {
  const hasAnything =
    !isBlank(profile.summary) ||
    (Array.isArray(profile.skills) && profile.skills.length > 0) ||
    (Array.isArray(profile.experience) && profile.experience.length > 0) ||
    (Array.isArray(profile.education) && profile.education.length > 0);
  if (!hasAnything) return 0;

  let score = 0;
  const roleText = String(profile.position || profile.title || '').trim();
  if (roleText.length >= 3) score += Math.min(10, Math.floor(roleText.split(/\s+/).length * 2));

  const uniqSkills = uniqCI((profile.skills || []).map(s => String(s).trim()).filter(Boolean));
  score += Math.min(30, uniqSkills.length * 3);

  const years = yearsOfExperience(profile);
  if (years >= 6) score += 35;
  else if (years >= 3) score += 25;
  else if (years >= 1) score += 15;
  else if (years > 0) score += 5;

  const sumLen = String(profile.summary || '').trim().length;
  if (sumLen >= 200) score += 10;
  else if (sumLen >= 120) score += 7;
  else if (sumLen >= 60) score += 5;
  else if (sumLen >= 20) score += 2;

  if (Array.isArray(profile.education) && profile.education.length) score += 8;
  if (String(profile.location || '').trim()) score += 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Create a JSON signature of profile for change detection */
export function profileSignature(profile) {
  if (!profile) return '';
  const stripped = {
    position: norm(profile.position || ''),
    summary: norm(profile.summary || '').slice(0, 200),
    skills: extractSkillNames(profile).sort().join(','),
    experience: (profile.experience || []).length,
    education: (profile.education || []).length,
    location: norm(profile.location || ''),
  };
  return JSON.stringify(stripped);
}
