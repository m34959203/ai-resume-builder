// src/pdf/templates/minimal.jsx
// Minimalist single-column resume template
import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';

/* ---------- utils ---------- */
const s = (v) => (v != null ? String(v) : '');
const tr = (v) => s(v).trim();
const has = (v) => !!tr(v);

const fmtMonth = (m) => {
  const v = tr(m);
  if (!v) return '';
  const t = /^(\d{4})-(\d{2})$/.exec(v);
  return t ? `${t[2]}.${t[1]}` : v;
};

function toBullets(text) {
  const raw = s(text);
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[\u2022\-–•]\s*/, '').trim())
    .filter(Boolean);
}

function uniq(arr) {
  const out = [], seen = new Set();
  for (const v of (Array.isArray(arr) ? arr : [])) {
    const k = tr(v).toLowerCase();
    if (k && !seen.has(k)) { seen.add(k); out.push(tr(v)); }
  }
  return out;
}

/* ---------- i18n ---------- */
const SEC = {
  summary:    { ru: 'О себе',          kk: 'Өзім туралы',         en: 'Summary' },
  experience: { ru: 'Опыт работы',     kk: 'Жұмыс тәжірибесі',   en: 'Work Experience' },
  skills:     { ru: 'Навыки',          kk: 'Дағдылар',            en: 'Skills' },
  education:  { ru: 'Образование',     kk: 'Білім',               en: 'Education' },
  languages:  { ru: 'Языки',           kk: 'Тілдер',              en: 'Languages' },
  present:    { ru: 'Наст. время',     kk: 'Қазір',               en: 'Present' },
};
const sec = (key, labels, lang) =>
  labels?.sections?.[key] || labels?.[key] || SEC[key]?.[lang] || SEC[key]?.ru || key;

/* ---------- styles ---------- */
const SLATE = {
  900: '#0F172A',
  700: '#334155',
  600: '#475569',
  500: '#64748B',
  400: '#94A3B8',
  100: '#F1F5F9',
};

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: SLATE[700],
    paddingHorizontal: 48,
    paddingVertical: 40,
    lineHeight: 1.5,
  },

  /* Header */
  name: {
    fontFamily: 'NotoSerif',
    fontSize: 28,
    fontWeight: 700,
    color: SLATE[900],
    letterSpacing: 0.3,
    lineHeight: 1.15,
  },
  position: {
    fontSize: 10,
    fontWeight: 400,
    color: SLATE[500],
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginTop: 6,
    marginBottom: 14,
  },
  contactsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    borderTopWidth: 0.5,
    borderTopColor: SLATE[100],
    paddingTop: 10,
    marginBottom: 24,
  },
  contactItem: {
    fontSize: 9,
    color: SLATE[600],
  },

  /* Section heading */
  sectionTitle: {
    fontSize: 8,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: SLATE[400],
    marginBottom: 8,
    marginTop: 18,
  },

  /* Summary */
  summaryText: {
    fontSize: 10.5,
    lineHeight: 1.6,
    color: SLATE[700],
  },

  /* Experience */
  xpItem: { marginBottom: 14 },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  xpTitle: { fontSize: 12, fontWeight: 600, color: SLATE[900] },
  xpPeriod: {
    fontSize: 8.5,
    fontWeight: 500,
    color: SLATE[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  xpCompany: {
    fontSize: 9.5,
    color: SLATE[600],
    fontStyle: 'italic',
    fontWeight: 500,
    marginBottom: 5,
  },
  bulletRow: { flexDirection: 'row', gap: 6, marginBottom: 3 },
  bulletDot: { fontSize: 10, color: SLATE[700], lineHeight: 1.5 },
  bulletText: { fontSize: 9.5, color: SLATE[700], lineHeight: 1.5, flex: 1 },

  /* Skills */
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  skillTag: {
    fontSize: 9,
    fontWeight: 500,
    color: SLATE[700],
    backgroundColor: SLATE[100],
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 2,
  },

  /* Education */
  eduItem: { marginBottom: 10 },
  eduHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eduTitle: { fontSize: 11, fontWeight: 600, color: SLATE[900] },
  eduPeriod: { fontSize: 8.5, fontWeight: 500, color: SLATE[500] },
  eduInst: { fontSize: 9.5, color: SLATE[600], fontStyle: 'italic' },

  /* Languages */
  langsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  langItem: { fontSize: 9.5, color: SLATE[700] },
  langName: { fontWeight: 600 },
});

/* ---------- Template ---------- */
export default function MinimalTemplate({ profile = {}, labels = {}, lang = 'ru' }) {
  const present = labels?.present || SEC.present[lang] || SEC.present.ru;

  const fullName = tr(profile.fullName) ||
    (lang === 'kk' ? 'СІЗДІҢ АТЫҢЫЗ' : lang === 'en' ? 'YOUR NAME' : 'ВАШЕ ИМЯ');
  const position = tr(profile.position || profile.title || profile.professionalTitle);
  const email = tr(profile.email);
  const phone = tr(profile.phone);
  const location = tr(profile.location);
  const website = tr(profile.website || profile.portfolio);
  const summary = tr(profile.summary);
  const skills = uniq(Array.isArray(profile.skills) ? profile.skills : []);
  const experience = Array.isArray(profile.experience) ? profile.experience : [];
  const education = Array.isArray(profile.education) ? profile.education : [];

  const languagesArr = Array.isArray(profile.languages) ? profile.languages : [];
  const langs = [];
  const seenL = new Set();
  for (const l of languagesArr) {
    const nm = tr(typeof l === 'string' ? l : (l?.language || l?.name));
    const lv = tr(typeof l === 'string' ? '' : (l?.level || l?.proficiency));
    const key = `${nm}_${lv}`.toLowerCase();
    if (nm && !seenL.has(key)) { seenL.add(key); langs.push({ name: nm, level: lv }); }
  }

  const buildPeriod = (e) => {
    const p = tr(e?.period);
    if (p) return p;
    const st = fmtMonth(e?.startDate || e?.start);
    const en = e?.currentlyWorking ? present : fmtMonth(e?.endDate || e?.end);
    if (!st && !en) return '';
    return `${st || '—'} — ${en || '—'}`;
  };

  const contacts = [
    email && `✉ ${email}`,
    phone && `☎ ${phone}`,
    location && `⊙ ${location}`,
    website && `⌂ ${website}`,
  ].filter(Boolean);

  return (
    <View style={styles.page}>

      {/* ===== HEADER ===== */}
      <Text style={styles.name}>{fullName}</Text>
      {has(position) && <Text style={styles.position}>{position}</Text>}

      {contacts.length > 0 && (
        <View style={styles.contactsRow}>
          {contacts.map((c, i) => (
            <Text key={i} style={styles.contactItem}>{c}</Text>
          ))}
        </View>
      )}

      {/* ===== SUMMARY ===== */}
      {has(summary) && (
        <View>
          <Text style={styles.sectionTitle}>{sec('summary', labels, lang)}</Text>
          <Text style={styles.summaryText}>{summary}</Text>
        </View>
      )}

      {/* ===== EXPERIENCE ===== */}
      {experience.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>{sec('experience', labels, lang)}</Text>
          {experience.map((e, i) => {
            const pos = tr(e?.position || e?.title || e?.role);
            const comp = tr(e?.company || e?.employer);
            const period = buildPeriod(e);
            const bullets = (Array.isArray(e?.bullets) && e.bullets.length)
              ? e.bullets
              : [...toBullets(e?.responsibilities), ...toBullets(e?.description)];
            const uniqBullets = uniq(bullets);

            return (
              <View key={e?.id || i} style={styles.xpItem} wrap={false}>
                <View style={styles.xpHeader}>
                  <Text style={styles.xpTitle}>{pos || '—'}</Text>
                  {has(period) && <Text style={styles.xpPeriod}>{period}</Text>}
                </View>
                {has(comp) && <Text style={styles.xpCompany}>{comp}</Text>}
                {uniqBullets.length > 0 && uniqBullets.map((b, j) => (
                  <View key={j} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      )}

      {/* ===== SKILLS ===== */}
      {skills.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>{sec('skills', labels, lang)}</Text>
          <View style={styles.skillsWrap}>
            {skills.map((sk, i) => (
              <Text key={i} style={styles.skillTag}>{sk}</Text>
            ))}
          </View>
        </View>
      )}

      {/* ===== EDUCATION ===== */}
      {education.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>{sec('education', labels, lang)}</Text>
          {education.map((ed, i) => {
            const degree = tr(ed?.degree || ed?.level);
            const inst = tr(ed?.institution || ed?.university);
            const spec = tr(ed?.specialization || ed?.major);
            const period = tr(ed?.period) || tr(ed?.year) ||
              [fmtMonth(ed?.startDate), fmtMonth(ed?.endDate)].filter(Boolean).join(' — ');

            return (
              <View key={ed?.id || i} style={styles.eduItem} wrap={false}>
                <View style={styles.eduHeader}>
                  <Text style={styles.eduTitle}>{degree || inst || '—'}</Text>
                  {has(period) && <Text style={styles.eduPeriod}>{period}</Text>}
                </View>
                {has(degree) && has(inst) && <Text style={styles.eduInst}>{inst}</Text>}
                {has(spec) && <Text style={{ ...styles.eduInst, fontStyle: 'normal' }}>{spec}</Text>}
              </View>
            );
          })}
        </View>
      )}

      {/* ===== LANGUAGES ===== */}
      {langs.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>{sec('languages', labels, lang)}</Text>
          <View style={styles.langsRow}>
            {langs.map((l, i) => (
              <Text key={i} style={styles.langItem}>
                <Text style={styles.langName}>{l.name}</Text>
                {l.level ? ` — ${l.level}` : ''}
              </Text>
            ))}
          </View>
        </View>
      )}

    </View>
  );
}
