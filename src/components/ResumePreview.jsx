// src/components/ResumePreview.jsx
import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { MapPin, Mail, Phone, Globe } from 'lucide-react';

/* ---------- helpers ---------- */
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
  const m = String(v).trim();
  if (/^\d{4}-\d{2}/.test(m)) return `${m.slice(5, 7)}.${m.slice(0, 4)}`;
  if (/^\d{4}$/.test(m)) return m;
  return m;
}

function period(e, presentLabel = 'Present') {
  const start = fmtDate(firstNonEmpty(e?.start, e?.from, e?.dateStart, e?.date_from));
  const end = fmtDate(firstNonEmpty(e?.end, e?.to, e?.dateEnd, e?.date_to));
  const isCurrent = !end || e?.current;
  return [start || '—', isCurrent ? presentLabel : end].join(' — ');
}

function toBullets(text) {
  if (!text) return [];
  return String(text)
    .split(/\n|;|•/g)
    .map((li) => li.trim())
    .filter(Boolean)
    .slice(0, 12);
}

/* ---------- sidebar section ---------- */
function SideSection({ title, children }) {
  return (
    <div>
      <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-3 pb-1 border-b border-gray-200">
        {title}
      </h2>
      {children}
    </div>
  );
}

/* ---------- main section with accent bar ---------- */
function MainSection({ title, children }) {
  return (
    <div>
      <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
        <span className="w-7 h-[2px] bg-blue-600" />
        {title}
      </h2>
      {children}
    </div>
  );
}

/* ---------- component ---------- */
export default function ResumePreview({ profile }) {
  const { t } = useTranslation();

  const exp = Array.isArray(profile?.experience) ? profile.experience : [];
  const edu = Array.isArray(profile?.education) ? profile.education : [];
  const skills = Array.isArray(profile?.skills) ? profile.skills.filter(Boolean) : [];
  const langs = Array.isArray(profile?.languages) ? profile.languages : [];
  const projects = Array.isArray(profile?.projects) ? profile.projects : [];
  const certs = Array.isArray(profile?.certificates || profile?.certifications)
    ? (profile?.certificates || profile?.certifications) : [];

  const fullName = firstNonEmpty(profile?.fullName, t('builder.personal.fullName'), '—');
  const role = firstNonEmpty(profile?.position, profile?.desiredRole, '');
  const presentLabel = t('builder.experience.present') || 'наст. время';

  return (
    <div className="bg-white shadow-2xl rounded-sm overflow-hidden flex" style={{ aspectRatio: '1/1.414' }}>

      {/* ===== LEFT SIDEBAR ===== */}
      <aside className="w-[34%] bg-slate-100 border-r border-slate-200 p-6 flex flex-col gap-6 text-[11px]">

        {/* Photo + Name */}
        <div className="flex flex-col items-center text-center">
          {profile?.photo ? (
            <img
              src={profile.photo}
              alt={fullName}
              className="w-20 h-20 rounded-full object-cover mb-3 border-[3px] border-white shadow-sm"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-slate-300 mb-3 border-[3px] border-white shadow-sm" />
          )}
          <h1 className="text-base font-bold leading-tight uppercase tracking-wider text-gray-900">
            {fullName}
          </h1>
          {role && (
            <p className="text-blue-600 font-semibold text-[10px] mt-1 uppercase">{role}</p>
          )}
        </div>

        {/* Contact */}
        {(profile?.phone || profile?.email || profile?.location || profile?.website) && (
          <SideSection title={t('builder.sections.contact') || 'Contact'}>
            <ul className="space-y-2">
              {profile?.phone && (
                <li className="flex items-center gap-2">
                  <Phone size={13} className="text-blue-600 flex-shrink-0" />
                  <span>{profile.phone}</span>
                </li>
              )}
              {profile?.email && (
                <li className="flex items-center gap-2">
                  <Mail size={13} className="text-blue-600 flex-shrink-0" />
                  <span className="break-all">{profile.email}</span>
                </li>
              )}
              {profile?.location && (
                <li className="flex items-center gap-2">
                  <MapPin size={13} className="text-blue-600 flex-shrink-0" />
                  <span>{profile.location}</span>
                </li>
              )}
              {profile?.website && (
                <li className="flex items-center gap-2">
                  <Globe size={13} className="text-blue-600 flex-shrink-0" />
                  <span className="break-all">{profile.website}</span>
                </li>
              )}
            </ul>
          </SideSection>
        )}

        {/* Skills / Expertise */}
        {skills.length > 0 && (
          <SideSection title={t('builder.sections.skills') || 'Expertise'}>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s, i) => (
                <span
                  key={`${s}-${i}`}
                  className="px-2 py-0.5 bg-white border border-slate-200 text-[10px] font-medium rounded"
                >
                  {String(s)}
                </span>
              ))}
            </div>
          </SideSection>
        )}

        {/* Languages */}
        {langs.length > 0 && (
          <SideSection title={t('builder.sections.languages') || 'Languages'}>
            <ul className="space-y-1.5">
              {langs.map((l, i) => {
                const name = typeof l === 'string' ? l : firstNonEmpty(l?.name, l?.lang);
                const lvl = typeof l === 'string' ? '' : firstNonEmpty(l?.level, l?.proficiency);
                return (
                  <li key={i} className="flex justify-between">
                    <span>{name}</span>
                    {lvl && <span className="text-gray-400">{lvl}</span>}
                  </li>
                );
              })}
            </ul>
          </SideSection>
        )}

        {/* Personal */}
        {(profile?.age || profile?.maritalStatus || profile?.driverLicense) && (
          <SideSection title={t('builder.sections.personal') || 'Personal'}>
            <ul className="space-y-1 text-gray-600">
              {profile?.age && <li>{t('builder.personal.age') || 'Age'}: {profile.age}</li>}
              {profile?.maritalStatus && <li>{profile.maritalStatus}</li>}
              {profile?.driverLicense && <li>{t('builder.personal.driverLicense') || 'License'}: {profile.driverLicense}</li>}
            </ul>
          </SideSection>
        )}
      </aside>

      {/* ===== RIGHT CONTENT ===== */}
      <div className="flex-1 p-7 flex flex-col gap-6 bg-white overflow-y-auto text-[11px]">

        {/* Profile / Summary */}
        {profile?.summary && (
          <MainSection title={t('builder.sections.summary') || 'Profile'}>
            <p className="text-gray-600 leading-relaxed text-[11px]">{profile.summary}</p>
          </MainSection>
        )}

        {/* Experience */}
        {exp.length > 0 && (
          <MainSection title={t('builder.sections.experience') || 'Experience'}>
            <div className="space-y-4">
              {exp.map((e, i) => {
                const company = firstNonEmpty(e?.company, e?.employer, e?.org);
                const position = firstNonEmpty(e?.position, e?.title, e?.role);
                const place = firstNonEmpty(e?.location, e?.city);
                const desc = firstNonEmpty(e?.description, e?.responsibilities, e?.achievements);
                const per = period(e, presentLabel);
                const isCurrent = !fmtDate(firstNonEmpty(e?.end, e?.to, e?.dateEnd, e?.date_to)) || e?.current;

                return (
                  <div key={i}>
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className="font-bold text-[12px] text-gray-900">{position || '—'}</h3>
                      <span className={`text-[10px] font-semibold whitespace-nowrap ml-2 ${isCurrent ? 'text-blue-600' : 'text-gray-400'}`}>
                        {per}
                      </span>
                    </div>
                    <p className="text-gray-500 italic text-[10px] mb-1.5">
                      {[company, place].filter(Boolean).join(' \u2022 ')}
                    </p>
                    {desc && (
                      <ul className="list-disc ml-4 text-gray-600 space-y-0.5">
                        {toBullets(desc).map((li, k) => (
                          <li key={k}>{li}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </MainSection>
        )}

        {/* Education */}
        {edu.length > 0 && (
          <MainSection title={t('builder.sections.education') || 'Education'}>
            <div className="space-y-3">
              {edu.map((e, i) => {
                const inst = firstNonEmpty(e?.institution, e?.university, e?.school, e?.org);
                const spec = firstNonEmpty(e?.specialization, e?.speciality, e?.major, e?.faculty, e?.program);
                const deg = firstNonEmpty(e?.degree, e?.level);
                const start = fmtDate(firstNonEmpty(e?.start, e?.from, e?.dateStart, e?.date_from, e?.year_from));
                const end = fmtDate(firstNonEmpty(e?.end, e?.to, e?.dateEnd, e?.date_to, e?.year, e?.graduationYear));
                return (
                  <div key={i}>
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className="font-bold text-[12px] text-gray-900">
                        {[deg, spec].filter(Boolean).join(' — ') || inst}
                      </h3>
                      {(start || end) && (
                        <span className="text-[10px] font-semibold text-gray-400 whitespace-nowrap ml-2">
                          {[start, end].filter(Boolean).join(' — ')}
                        </span>
                      )}
                    </div>
                    {deg || spec ? (
                      <p className="text-gray-500 italic text-[10px]">{inst}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </MainSection>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <MainSection title={t('builder.sections.projects') || 'Projects'}>
            <div className="space-y-3">
              {projects.map((p, i) => (
                <div key={i}>
                  <div className="font-bold text-[12px] text-gray-900">
                    {firstNonEmpty(p?.name, p?.title, 'Project')}
                  </div>
                  {p?.tech && (
                    <p className="text-gray-400 text-[10px]">{p.tech}</p>
                  )}
                  {p?.description && (
                    <p className="text-gray-600 mt-0.5">{p.description}</p>
                  )}
                </div>
              ))}
            </div>
          </MainSection>
        )}

        {/* Certificates */}
        {certs.length > 0 && (
          <MainSection title={t('builder.sections.certificates') || 'Certificates'}>
            <div className="space-y-2">
              {certs.map((c, i) => {
                const name = firstNonEmpty(c?.name, c?.title);
                const org = firstNonEmpty(c?.issuer, c?.organization);
                const date = fmtDate(firstNonEmpty(c?.date, c?.issued, c?.issuedAt));
                return (
                  <div key={i} className="flex justify-between items-baseline">
                    <div>
                      <span className="font-medium text-gray-900">{name || '—'}</span>
                      {org && <span className="text-gray-400 ml-1.5">({org})</span>}
                    </div>
                    {date && <span className="text-[10px] text-gray-400 ml-2">{date}</span>}
                  </div>
                );
              })}
            </div>
          </MainSection>
        )}
      </div>
    </div>
  );
}
