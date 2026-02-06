import { describe, it, expect } from 'vitest';
import {
  safeDate, bestOfDates, pickLatestExperience,
  yearsOfExperience, calcExperienceCategory, fmtDate,
} from '../../src/utils/dates';

describe('safeDate', () => {
  it('parses valid ISO date', () => {
    const d = safeDate('2024-01-15');
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2024);
  });
  it('returns null for invalid input', () => {
    expect(safeDate(null)).toBeNull();
    expect(safeDate(undefined)).toBeNull();
    expect(safeDate('')).toBeNull();
    expect(safeDate('not-a-date')).toBeNull();
  });
});

describe('bestOfDates', () => {
  it('picks first valid date from multiple keys', () => {
    const obj = { start: null, from: '2023-06-01' };
    const d = bestOfDates(obj, ['start', 'from']);
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2023);
  });
  it('returns null when none found', () => {
    expect(bestOfDates({}, ['start', 'from'])).toBeNull();
    expect(bestOfDates(null, ['start'])).toBeNull();
  });
});

describe('pickLatestExperience', () => {
  it('picks entry with latest end date', () => {
    const profile = {
      experience: [
        { position: 'Junior', end: '2020-01-01' },
        { position: 'Senior', end: '2024-01-01' },
        { position: 'Mid', end: '2022-01-01' },
      ],
    };
    expect(pickLatestExperience(profile).position).toBe('Senior');
  });
  it('returns null for empty experience', () => {
    expect(pickLatestExperience({})).toBeNull();
    expect(pickLatestExperience({ experience: [] })).toBeNull();
  });
  it('returns first entry when no dates', () => {
    const profile = { experience: [{ position: 'Dev' }] };
    expect(pickLatestExperience(profile).position).toBe('Dev');
  });
});

describe('yearsOfExperience', () => {
  it('calculates years from dated entries', () => {
    const profile = {
      experience: [{
        start: '2020-01-01',
        end: '2023-01-01',
      }],
    };
    const years = yearsOfExperience(profile);
    expect(years).toBeCloseTo(3, 0);
  });
  it('returns 0 for no experience', () => {
    expect(yearsOfExperience({})).toBe(0);
    expect(yearsOfExperience({ experience: [] })).toBe(0);
  });
});

describe('calcExperienceCategory', () => {
  it('returns "none" for empty profile', () => {
    expect(calcExperienceCategory({})).toBe('none');
  });
  it('returns correct category', () => {
    const mkProfile = (start, end) => ({
      experience: [{ start, end }],
    });
    expect(calcExperienceCategory(mkProfile('2023-06-01', '2024-01-01'))).toBe('0-1');
    expect(calcExperienceCategory(mkProfile('2022-01-01', '2024-06-01'))).toBe('1-3');
    expect(calcExperienceCategory(mkProfile('2020-01-01', '2024-01-01'))).toBe('3-6');
    expect(calcExperienceCategory(mkProfile('2015-01-01', '2024-01-01'))).toBe('6+');
  });
});

describe('fmtDate', () => {
  it('formats YYYY-MM → MM.YYYY', () => {
    expect(fmtDate('2024-03')).toBe('03.2024');
  });
  it('returns YYYY as-is', () => {
    expect(fmtDate('2024')).toBe('2024');
  });
  it('returns empty for falsy', () => {
    expect(fmtDate(null)).toBe('');
    expect(fmtDate('')).toBe('');
  });
});
