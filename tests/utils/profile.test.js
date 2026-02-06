import { describe, it, expect } from 'vitest';
import {
  deriveDesiredRole, extractSkillName, extractSkillNames,
  hasProfileForRecs, missingProfileSections, computeMarketFit,
  profileSignature,
} from '../../src/utils/profile';

describe('extractSkillName', () => {
  it('extracts from string', () => {
    expect(extractSkillName('React')).toBe('React');
  });
  it('extracts from object with .name', () => {
    expect(extractSkillName({ name: 'Vue' })).toBe('Vue');
  });
  it('extracts from object with .title', () => {
    expect(extractSkillName({ title: 'Angular' })).toBe('Angular');
  });
  it('returns empty for null', () => {
    expect(extractSkillName(null)).toBe('');
  });
});

describe('extractSkillNames', () => {
  it('deduplicates case-insensitively', () => {
    const profile = { skills: ['React', 'react', 'Vue'] };
    expect(extractSkillNames(profile)).toEqual(['React', 'Vue']);
  });
  it('handles mixed string/object skills', () => {
    const profile = { skills: ['React', { name: 'Vue' }] };
    expect(extractSkillNames(profile)).toEqual(['React', 'Vue']);
  });
  it('returns empty for no skills', () => {
    expect(extractSkillNames({})).toEqual([]);
  });
});

describe('deriveDesiredRole', () => {
  it('picks from position first', () => {
    const profile = { position: 'Frontend Dev', desiredRole: 'Backend' };
    expect(deriveDesiredRole(profile)).toBe('Frontend Dev');
  });
  it('falls back to experience', () => {
    const profile = { experience: [{ position: 'QA Engineer' }] };
    expect(deriveDesiredRole(profile)).toBe('QA Engineer');
  });
  it('falls back to skills', () => {
    const profile = { skills: ['React', 'TypeScript'] };
    expect(deriveDesiredRole(profile)).toBe('React TypeScript');
  });
  it('returns empty for blank profile', () => {
    expect(deriveDesiredRole({})).toBe('');
  });
});

describe('hasProfileForRecs', () => {
  it('returns true when has skills', () => {
    expect(hasProfileForRecs({ skills: ['React'] })).toBe(true);
  });
  it('returns true when has experience', () => {
    expect(hasProfileForRecs({ experience: [{ position: 'Dev' }] })).toBe(true);
  });
  it('returns true when has role', () => {
    expect(hasProfileForRecs({ position: 'Developer' })).toBe(true);
  });
  it('returns false for empty profile', () => {
    expect(hasProfileForRecs({})).toBe(false);
    expect(hasProfileForRecs(null)).toBe(false);
  });
});

describe('missingProfileSections', () => {
  it('lists all missing sections for empty profile', () => {
    const missing = missingProfileSections({});
    expect(missing).toHaveLength(4);
  });
  it('does not list sections that exist', () => {
    const profile = {
      experience: [{ position: 'Dev' }],
      skills: ['React'],
      education: [{ level: 'BS' }],
      summary: 'A good developer',
    };
    expect(missingProfileSections(profile)).toHaveLength(0);
  });
});

describe('computeMarketFit', () => {
  it('returns 0 for empty profile', () => {
    expect(computeMarketFit({})).toBe(0);
  });
  it('increases score with more data', () => {
    const bare = computeMarketFit({ skills: ['React'] });
    const full = computeMarketFit({
      position: 'Frontend Developer',
      skills: ['React', 'TypeScript', 'CSS', 'HTML', 'Redux'],
      experience: [{ start: '2020-01-01', end: '2024-01-01', position: 'Dev' }],
      education: [{ level: 'BS' }],
      summary: 'Experienced frontend developer with 4 years of professional experience building web applications.',
      location: 'Almaty',
    });
    expect(full).toBeGreaterThan(bare);
    expect(full).toBeGreaterThan(50);
  });
  it('caps at 100', () => {
    expect(computeMarketFit({
      position: 'Senior Staff Principal Architect Engineer',
      skills: Array.from({ length: 20 }, (_, i) => `Skill${i}`),
      experience: [{ start: '2010-01-01', end: '2024-01-01' }],
      education: [{ level: 'PhD' }],
      summary: 'A'.repeat(300),
      location: 'Almaty',
    })).toBeLessThanOrEqual(100);
  });
});

describe('profileSignature', () => {
  it('returns stable signature for same profile', () => {
    const profile = { position: 'Dev', skills: ['React'] };
    expect(profileSignature(profile)).toBe(profileSignature(profile));
  });
  it('returns empty for null', () => {
    expect(profileSignature(null)).toBe('');
  });
  it('changes when profile changes', () => {
    const a = profileSignature({ skills: ['React'] });
    const b = profileSignature({ skills: ['Vue'] });
    expect(a).not.toBe(b);
  });
});
