import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { fetchAreas, getDefaultHost } from '../services/bff';

const HOST = getDefaultHost();

export default function CitySelect({ value, onChange }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => setQuery(value || ''), [value]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const areas = await fetchAreas(HOST);
        if (cancelled) return;

        const kz = (areas || []).find((c) => /казахстан|kazakhstan|қазақстан/i.test(c?.name));
        const acc = [];
        function walk(node) {
          if (!node) return;
          const child = Array.isArray(node.areas) ? node.areas : [];
          if (!child.length) {
            acc.push({ id: String(node.id), name: node.name });
            return;
          }
          child.forEach(walk);
        }
        if (kz) walk(kz);

        const uniqCities = [];
        const seen = new Set();
        acc.forEach((x) => {
          const k = x.name.toLowerCase();
          if (!seen.has(k)) { seen.add(k); uniqCities.push(x); }
        });

        setCities(uniqCities.sort((a, b) => a.name.localeCompare(b.name, 'ru')));
      } catch {
        setCities([
          { id: 'almaty', name: 'Алматы' },
          { id: 'astana', name: 'Астана' },
          { id: 'shymkent', name: 'Шымкент' },
        ]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return cities.slice(0, 50);
    return cities
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 50);
  }, [query, cities]);

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        placeholder={t('vacancies.cityPlaceholder')}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full px-4 py-2 border rounded-lg"
        aria-label={t('builder.personal.location')}
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto bg-white border rounded-lg shadow-lg">
          {loading ? (
            <div className="p-3 text-sm text-gray-500">{t('common.loading')}</div>
          ) : filtered.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">{t('vacancies.noCitiesFound')}</div>
          ) : (
            filtered.map((c) => (
              <button
                key={`${c.id}-${c.name}`}
                onClick={() => {
                  setQuery(c.name);
                  setOpen(false);
                  onChange?.(c.name, c);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50"
              >
                {c.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
