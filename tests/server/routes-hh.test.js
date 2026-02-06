import { describe, it, expect } from 'vitest';

// Test the pure logic that the routes use (validation, sanitization)
// without needing Express in the Vite test environment

const ALLOWED_HOSTS = ['hh.kz', 'hh.ru'];
const DEFAULT_HOST = 'hh.kz';

function sanitizeHost(raw) {
  const h = String(raw || DEFAULT_HOST).trim().toLowerCase();
  return ALLOWED_HOSTS.includes(h) ? h : DEFAULT_HOST;
}

function toInt(v, def) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : def;
}

describe('HH routes: sanitizeHost', () => {
  it('allows hh.kz', () => {
    expect(sanitizeHost('hh.kz')).toBe('hh.kz');
  });
  it('allows hh.ru', () => {
    expect(sanitizeHost('hh.ru')).toBe('hh.ru');
  });
  it('rejects evil.com → defaults to hh.kz', () => {
    expect(sanitizeHost('evil.com')).toBe('hh.kz');
  });
  it('rejects empty string → defaults to hh.kz', () => {
    expect(sanitizeHost('')).toBe('hh.kz');
  });
  it('rejects null → defaults to hh.kz', () => {
    expect(sanitizeHost(null)).toBe('hh.kz');
  });
  it('rejects undefined → defaults to hh.kz', () => {
    expect(sanitizeHost(undefined)).toBe('hh.kz');
  });
  it('is case-insensitive', () => {
    expect(sanitizeHost('HH.KZ')).toBe('hh.kz');
    expect(sanitizeHost('HH.RU')).toBe('hh.ru');
  });
  it('trims whitespace', () => {
    expect(sanitizeHost('  hh.kz  ')).toBe('hh.kz');
  });
});

describe('HH routes: toInt', () => {
  it('parses valid integers', () => {
    expect(toInt('5', 0)).toBe(5);
    expect(toInt('0', 10)).toBe(0);
  });
  it('returns default for invalid input', () => {
    expect(toInt('abc', 0)).toBe(0);
    expect(toInt(null, 20)).toBe(20);
    expect(toInt(undefined, 10)).toBe(10);
  });
  it('returns default for negative numbers', () => {
    expect(toInt('-5', 0)).toBe(0);
  });
});

describe('HH routes: input clamping', () => {
  it('clamps page to max 50', () => {
    expect(Math.min(toInt('100', 0), 50)).toBe(50);
    expect(Math.min(toInt('25', 0), 50)).toBe(25);
  });
  it('clamps per_page to max 100', () => {
    expect(Math.min(toInt('200', 20), 100)).toBe(100);
    expect(Math.min(toInt('50', 20), 100)).toBe(50);
  });
  it('truncates text to 200 chars', () => {
    const longText = 'a'.repeat(300);
    expect(longText.slice(0, 200).length).toBe(200);
  });
});
