// src/services/bff.js
const BASE = (import.meta.env?.VITE_BFF_URL || '').replace(/\/+$/, '');
const withBase = (p) => (BASE ? `${BASE}${p}` : p); // в dev BASE пустой → /api/...

export async function fetchAreas() {
  const r = await fetch(withBase('/api/hh/areas'), { credentials: 'include' });
  if (!r.ok) throw new Error(`Areas fetch failed: ${r.status}`);
  return r.json();
}

export async function searchJobsSmart(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(withBase(`/api/hh/jobs/search?${qs}`), { credentials: 'include' });
  if (!r.ok) throw new Error(`Jobs fetch failed: ${r.status}`);
  return r.json();
}
