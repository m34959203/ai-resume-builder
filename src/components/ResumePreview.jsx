// src/components/ResumePreview.jsx
import React, { useMemo } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { MapPin, Mail, Phone, Globe } from 'lucide-react';

function firstNonEmpty(...vals) {
  for (const v of vals) {
    const s = String(v ?? '').trim();
    if (s) return s;
  }
  return '';
}

function fmtDate(v) {
  if (!v) return '';
  const d = new Date(v);
  if (!isNaN(d)) {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}.${yyyy}`;
  }
  // частые форматы: YYYY-MM, YYYY
  const m = String(v).trim();
  if (/^\d{4}-\d{2}/.test(m)) return `${m.slice(5, 7)}.${m.slice(0, 4)}`;
  if (/^\d{4}$/.test(m)) return m;
  return m;
}

function Line({ children }) {
  return <div className="text-gray-600 text-sm">{children}</div>;
}

function Section({ title, children }) {
  return (
    <div className="bg-white border rounded-xl p-5">
      <div className="font-semibold text-gray-900 mb-3">{title}</div>
      {children}
    </div>
  );
}

export default function ResumePreview({ profile }) {
  const { t } = useTranslation();

  const exp = Array.isArray(profile?.experience) ? profile.experience : [];
  const edu = Array.isArray(profile?.education) ? profile.education : [];
  const skills = Array.isArray(profile?.skills) ? profile.skills.filter(Boolean) : [];
  const langs = Array.isArray(profile?.languages) ? profile.languages : [];

  const projects = Array.isArray(profile?.projects) ? profile.projects : [];
  const courses  = Array.isArray(profile?.courses) ? profile.courses : [];
  const certs    = Array.isArray(profile?.certificates || profile?.certifications)
    ? (profile?.certificates || profile?.certifications) : [];
  const links    = Array.isArray(profile?.links || profile?.socials)
    ? (profile?.links || profile?.socials) : [];

  const stats = useMemo(() => ({
    exp: exp.length,
    edu: edu.length,
    lang: langs.length
  }), [exp.length, edu.length, langs.length]);

  return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
      <div className="bg-white rounded-xl border p-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          {profile?.photo ? (
            <img
              src={profile.photo}
              alt="Фото"
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200" />
          )}

          <div className="flex-1">
            <div className="text-2xl font-extrabold text-gray-900">
              {firstNonEmpty(profile?.fullName, t('builder.personal.fullName'), '—')}
            </div>
            <div className="text-gray-700 font-medium">
              {firstNonEmpty(profile?.position, profile?.desiredRole, '—')}
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm text-gray-600">
              {profile?.email ? (
                <span className="inline-flex items-center gap-1">
                  <Mail size={14} /> {profile.email}
                </span>
              ) : null}
              {profile?.phone ? (
                <span className="inline-flex items-center gap-1">
                  <Phone size={14} /> {profile.phone}
                </span>
              ) : null}
              {profile?.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} /> {profile.location}
                </span>
              ) : null}
            </div>

            {/* Личные атрибуты */}
            {(profile?.age || profile?.maritalStatus || profile?.children || profile?.driverLicense) && (
              <div className="mt-2 text-xs text-gray-500">
                {profile?.age ? <>Возраст: {profile.age}&nbsp;&nbsp;</> : null}
                {profile?.maritalStatus ? <>Семейное положение: {profile.maritalStatus}&nbsp;&nbsp;</> : null}
                {profile?.children ? <>Дети: {profile.children}&nbsp;&nbsp;</> : null}
                {profile?.driverLicense ? <>Водительские права: {profile.driverLicense}</> : null}
              </div>
            )}
          </div>
        </div>

        {/* О себе */}
        {profile?.summary ? (
          <div className="mt-5">
            <div className="font-semibold mb-2">О себе</div>
            <Line>{profile.summary}</Line>
          </div>
        ) : null}

        {/* Статы */}
        <div className="grid md:grid-cols-3 gap-4 mt-5">
          <div className="bg-blue-50 text-blue-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold">{stats.exp}</div>
            <div className="text-sm">мест работы</div>
          </div>
          <div className="bg-purple-50 text-purple-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold">{stats.edu}</div>
            <div className="text-sm">образование</div>
          </div>
          <div className="bg-indigo-50 text-indigo-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold">{stats.lang}</div>
            <div className="text-sm">языков</div>
          </div>
        </div>

        {/* Навыки */}
        {skills.length ? (
          <div className="mt-6">
            <div className="font-semibold mb-2">Навыки</div>
            <div className="flex flex-wrap gap-2">
              {skills.map((s, i) => (
                <span key={`${s}-${i}`} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                  {String(s)}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Опыт работы */}
        {exp.length ? (
          <div className="mt-6 grid gap-4">
            <Section title="Опыт работы">
              <ul className="space-y-4">
                {exp.map((e, i) => {
                  const company  = firstNonEmpty(e?.company, e?.employer, e?.org);
                  const position = firstNonEmpty(e?.position, e?.title, e?.role);
                  const start = fmtDate(firstNonEmpty(e?.start, e?.from, e?.dateStart, e?.date_from));
                  const end   = fmtDate(firstNonEmpty(e?.end, e?.to, e?.dateEnd, e?.date_to)) || 'наст. время';
                  const place = firstNonEmpty(e?.location, e?.city);
                  const text  = firstNonEmpty(e?.description, e?.responsibilities, e?.achievements);

                  return (
                    <li key={i} className="border rounded-lg p-4">
                      <div className="flex flex-wrap justify-between gap-2">
                        <div>
                          <div className="font-semibold text-gray-900">{position || 'Должность'}</div>
                          <div className="text-gray-700">{company || 'Компания'}</div>
                        </div>
                        <div className="text-sm text-gray-600">
                          {start || '—'} — {end}
                          {place ? <>, {place}</> : null}
                        </div>
                      </div>
                      {text ? (
                        <ul className="list-disc pl-5 mt-2 text-sm text-gray-700">
                          {String(text)
                            .split(/\n|;|•/g)
                            .map((li) => li.trim())
                            .filter(Boolean)
                            .slice(0, 12)
                            .map((li, k) => <li key={k}>{li}</li>)}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Section>
          </div>
        ) : null}

        {/* Образование */}
        {edu.length ? (
          <div className="mt-6 grid gap-4">
            <Section title="Образование">
              <ul className="space-y-3">
                {edu.map((e, i) => {
                  const inst  = firstNonEmpty(e?.institution, e?.university, e?.school, e?.org);
                  const spec  = firstNonEmpty(e?.specialization, e?.speciality, e?.major, e?.faculty, e?.program);
                  const deg   = firstNonEmpty(e?.degree, e?.level);
                  const start = fmtDate(firstNonEmpty(e?.start, e?.from, e?.dateStart, e?.date_from, e?.year_from));
                  const end   = fmtDate(firstNonEmpty(e?.end, e?.to, e?.dateEnd, e?.date_to, e?.year, e?.graduationYear));
                  return (
                    <li key={i} className="border rounded-lg p-3">
                      <div className="font-semibold text-gray-900">{inst || 'Учебное заведение'}</div>
                      <div className="text-gray-700">{[deg, spec].filter(Boolean).join(' • ') || 'Направление'}</div>
                      <div className="text-sm text-gray-600 mt-1">{[start, end].filter(Boolean).join(' — ')}</div>
                    </li>
                  );
                })}
              </ul>
            </Section>
          </div>
        ) : null}

        {/* Языки */}
        {langs.length ? (
          <div className="mt-6 grid gap-4">
            <Section title="Языки">
              <ul className="flex flex-wrap gap-2">
                {langs.map((l, i) => {
                  const name = typeof l === 'string' ? l : firstNonEmpty(l?.name, l?.lang);
                  const lvl  = typeof l === 'string' ? '' : firstNonEmpty(l?.level, l?.proficiency);
                  return (
                    <li key={i} className="px-3 py-1 bg-gray-50 rounded-full text-sm text-gray-700">
                      {name}{lvl ? ` — ${lvl}` : ''}
                    </li>
                  );
                })}
              </ul>
            </Section>
          </div>
        ) : null}

        {/* Проекты */}
        {projects.length ? (
          <div className="mt-6 grid gap-4">
            <Section title="Проекты">
              <ul className="space-y-3">
                {projects.map((p, i) => (
                  <li key={i} className="border rounded-lg p-3">
                    <div className="font-semibold">{firstNonEmpty(p?.name, p?.title, 'Проект')}</div>
                    {p?.role || p?.position ? (
                      <div className="text-sm text-gray-600 mt-0.5">Роль: {p.role || p.position}</div>
                    ) : null}
                    {p?.tech ? <div className="text-sm text-gray-600 mt-0.5">Технологии: {p.tech}</div> : null}
                    {p?.description ? <div className="text-gray-700 mt-1">{p.description}</div> : null}
                    {p?.link ? (
                      <a className="inline-flex items-center gap-1 text-blue-600 hover:underline mt-1" href={p.link} target="_blank" rel="noreferrer">
                        <Globe size={14} /> Открыть
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        ) : null}

        {/* Курсы */}
        {courses.length ? (
          <div className="mt-6 grid gap-4">
            <Section title="Курсы">
              <ul className="space-y-2">
                {courses.map((c, i) => {
                  const name = firstNonEmpty(c?.name, c?.title);
                  const provider = firstNonEmpty(c?.provider, c?.school, c?.platform);
                  const date = fmtDate(firstNonEmpty(c?.date, c?.year, c?.issuedAt));
                  return (
                    <li key={i} className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 border rounded-lg p-3">
                      <div>
                        <div className="font-medium">{name || 'Курс'}</div>
                        <div className="text-sm text-gray-600">{provider}</div>
                      </div>
                      <div className="text-sm text-gray-600">{date}</div>
                    </li>
                  );
                })}
              </ul>
            </Section>
          </div>
        ) : null}

        {/* Сертификаты */}
        {certs.length ? (
          <div className="mt-6 grid gap-4">
            <Section title="Сертификаты">
              <ul className="space-y-2">
                {certs.map((c, i) => {
                  const name = firstNonEmpty(c?.name, c?.title);
                  const org  = firstNonEmpty(c?.issuer, c?.organization);
                  const id   = c?.id || c?.credentialId;
                  const date = fmtDate(firstNonEmpty(c?.date, c?.issued, c?.issuedAt));
                  return (
                    <li key={i} className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 border rounded-lg p-3">
                      <div>
                        <div className="font-medium">{name || 'Сертификат'}</div>
                        <div className="text-sm text-gray-600">{[org, id].filter(Boolean).join(' • ')}</div>
                      </div>
                      <div className="text-sm text-gray-600">{date}</div>
                    </li>
                  );
                })}
              </ul>
            </Section>
          </div>
        ) : null}

        {/* Ссылки / профили */}
        {links.length ? (
          <div className="mt-6 grid gap-4">
            <Section title="Ссылки">
              <ul className="flex flex-wrap gap-2">
                {links.map((l, i) => {
                  const label = firstNonEmpty(l?.label, l?.name, l?.type, l?.platform, l?.url);
                  const url   = firstNonEmpty(l?.url, l?.link);
                  return (
                    <li key={i}>
                      {url ? (
                        <a className="px-3 py-1 border rounded-full text-sm hover:bg-gray-50 text-blue-700" href={url} target="_blank" rel="noreferrer">
                          {label}
                        </a>
                      ) : (
                        <span className="px-3 py-1 border rounded-full text-sm text-gray-700">{label}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
