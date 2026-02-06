import { describe, it, expect } from 'vitest';
import { norm, uniqCaseInsensitive, uniqCI, isBlank, firstNonEmpty, capitalize } from '../../src/utils/strings';

describe('norm', () => {
  it('lowercases and trims', () => {
    expect(norm('  Hello World  ')).toBe('hello world');
  });
  it('handles null/undefined', () => {
    expect(norm(null)).toBe('');
    expect(norm(undefined)).toBe('');
    expect(norm('')).toBe('');
  });
  it('handles numbers', () => {
    expect(norm(42)).toBe('42');
  });
});

describe('uniqCaseInsensitive', () => {
  it('removes case-insensitive duplicates', () => {
    expect(uniqCaseInsensitive(['React', 'react', 'REACT', 'Vue'])).toEqual(['React', 'Vue']);
  });
  it('preserves order (first occurrence wins)', () => {
    expect(uniqCaseInsensitive(['b', 'A', 'a', 'B'])).toEqual(['b', 'A']);
  });
  it('filters out empty strings', () => {
    expect(uniqCaseInsensitive(['', ' ', 'a', '', 'b'])).toEqual(['a', 'b']);
  });
  it('handles empty array', () => {
    expect(uniqCaseInsensitive([])).toEqual([]);
  });
});

describe('uniqCI (alias)', () => {
  it('works the same as uniqCaseInsensitive', () => {
    expect(uniqCI(['A', 'a', 'B'])).toEqual(['A', 'B']);
  });
});

describe('isBlank', () => {
  it('returns true for empty values', () => {
    expect(isBlank('')).toBe(true);
    expect(isBlank(null)).toBe(true);
    expect(isBlank(undefined)).toBe(true);
    expect(isBlank('   ')).toBe(true);
  });
  it('returns false for non-empty values', () => {
    expect(isBlank('hello')).toBe(false);
    expect(isBlank('0')).toBe(false);
  });
});

describe('firstNonEmpty', () => {
  it('returns first non-empty string', () => {
    expect(firstNonEmpty('', null, 'hello', 'world')).toBe('hello');
  });
  it('returns empty string when all are empty', () => {
    expect(firstNonEmpty('', null, undefined, '  ')).toBe('');
  });
  it('trims values', () => {
    expect(firstNonEmpty('  ', '  test  ')).toBe('test');
  });
});

describe('capitalize', () => {
  it('capitalizes first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });
  it('handles empty string', () => {
    expect(capitalize('')).toBe('');
  });
  it('handles single character', () => {
    expect(capitalize('a')).toBe('A');
  });
});
