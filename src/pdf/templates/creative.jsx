// src/pdf/templates/creative.jsx
import React from 'react';
import { View, Text, StyleSheet, Image } from '@react-pdf/renderer';

/**
 * Creative PDF template (i18n-ready).
 * Props:
 *  - profile      : normalized profile object (from ResumePDF)
 *  - theme        : { accent, header, footer }
 *  - labels       : i18n labels object from ResumePDF (sections.* are guaranteed)
 *  - t, lang      : optional translator and current language
 *  - hints/flags  : optional rendering hints (e.g., preferEducationFirst)
 *  - pageInsets   : { header, footer, horizontal } — padding values used by wrapper
 */

/* ---------- helpers ---------- */
const s = (v) => (v == null ? '' : String(v));
const trimStr = (v) => s(v).trim();
const hasText = (v) => !!trimStr(v);

const normalizeMultiline = (v) =>
  s(v)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .join('\n')
    .trim();

const toBullets = (text) => {
  const lines = normalizeMultiline(text)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  return lines.map((line) => {
    const m = /^([•\-\*\u2022]|\d+[.)])\s+(.+)$/.exec(line);
    return trimStr(m ? m[2] : line);
  });
};

const fmtPeriod = (start, end, current, fallback, presentWord = 'Present') => {
  if (hasText(fallback)) return trimStr(fallback);
  const st = trimStr(start);
  const en = current ? presentWord : trimStr(end);
  if (!st && !en) return '';
  return `${st || '—'} — ${en || '—'}`;
};

/* ---------- layout ---------- */
const LEFT_W = 210;

const styles = StyleSheet.create({
  layout: {
    flexDirection: 'row',
    gap: 18,
  },

  /* LEFT */
  left: {
    width: LEFT_W,
    backgroundColor: '#6F95A3',
    color: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
  },
  photo: {
    width: LEFT_W - 24,
    height: 150,
    objectFit: 'cover',
    borderRadius: 6,
    marginBottom: 12,
  },
  nameCard: {
    backgroundColor: '#FFFFFF',
    color: '#111827',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  name: { fontSize: 13, fontWeight: 700 },
  subTitle: { fontSize: 10, color: '#374151', marginTop: 2 },

  sideSection: { marginBottom: 16 },
  sideTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sideTitle: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#E8EEF2',
  },
  dashRule: {
    flex: 1,
    height: 0.5,
    backgroundColor: '#DBE5EA',
    marginLeft: 8,
    opacity: 0.7,
  },

  sideRow: { marginBottom: 6 },
  sideText: { fontSize: 10, color: '#FFFFFF', lineHeight: 1.35 },
  sideSmall: { fontSize: 9, color: '#EAF2F6' },

  skillRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  skillName: { fontSize: 10, color: '#FFFFFF' },
  skillDash: { fontSize: 10, color: '#EAF2F6', flexGrow: 1, textAlign: 'right' },

  langRow: { marginBottom: 5 },

  /* RIGHT */
  right: { flex: 1 },
  block: { marginBottom: 16 },

  h2: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#0F172A',
    marginBottom: 6,
  },
  hRuleWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  hRule: { height: 1, backgroundColor: '#E5E7EB', flex: 1 },
  hDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginLeft: 8,
  },

  paragraph: { fontSize: 10, lineHeight: 1.35, color: '#111827' },

  twoCol: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  colTime: { width: 78, color: '#6B7280', fontSize: 9, paddingTop: 2 },
  colBody: { flex: 1 },

  em: { fontSize: 10, fontWeight: 700, color: '#111827' },
  muted: { fontSize: 10, color: '#6B7280' },

  bulletRow: { flexDirection: 'row', gap: 6, marginBottom: 2 },
  bulletDot: { fontSize: 10, lineHeight: 1.35 },
  bulletText: { fontSize: 10, lineHeight: 1.35, color: '#111827', flex: 1 },

  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillTag: {
    fontSize: 9,
    color: '#1F2937',
    backgroundColor: '#F3F4F6',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
});

/* ---------- small UI atoms ---------- */
const SideTitle = ({ children }) => (
  <View style={styles.sideTitleRow}>
    <Text style={styles.sideTitle}>{children}</Text>
    <View style={styles.dashRule} />
  </View>
);

const SideRow = ({ primary, secondary }) =>
  !hasText(primary) && !hasText(secondary) ? null : (
    <View style={styles.sideRow}>
      {hasText(primary) ? <Text style={styles.sideText}>{trimStr(primary)}</Text> : null}
      {hasText(secondary) ? <Text style={styles.sideSmall}>{trimStr(secondary)}</Text> : null}
    </View>
  );

/* ---------- main component ---------- */
export default function CreativeTemplate(props) {
  const {
    profile,
    theme,
    labels: L = {},
    t: tr, // translator from wrapper, optional
    lang = 'ru',
    hints = {},
    pageInsets, // not used directly but kept for API symmetry with other templates
  } = props;

  const accent = (theme && theme.accent) || '#8b5cf6';

  // Section labels (fallbacks included)
  const S = L.sections || {};
  const sec = (k, fb) => S[k] || fb;

  // (Optional) field labels, if provided
  const F = L.fields || {};
  const fld = (k, fb) => F[k] || fb;

  // Bullets prefix & "present" word
  const bulletsPrefix = L.bulletsPrefix || '•';
  const presentWord =
    L.present ||
    (typeof tr === 'function' && tr('builder.experience.current')) ||
    (lang === 'kk' ? 'Қазір' : lang === 'en' ? 'Present' : 'настоящее время');

  // base fields
  const fullName =
    trimStr(profile?.fullName) ||
    (lang === 'kk' ? 'АТЫ ЖӨНІ' : lang === 'en' ? 'NAME SURNAME' : 'ИМЯ ФАМИЛИЯ');
  const title = trimStr(profile?.position || profile?.title || profile?.professionalTitle);
  const email = trimStr(profile?.email);
  const phone = trimStr(profile?.phone);
  const location = trimStr(profile?.location);

  // new personal fields (both keys supported)
  const age = trimStr(profile?.age);
  const maritalStatus = trimStr(profile?.maritalStatus);
  const children = trimStr(profile?.children);
  const driversLicense = trimStr(profile?.driversLicense || profile?.driverLicense);

  // collections
  const skills = Array.isArray(profile?.skills) ? profile.skills.filter(hasText) : [];
  const languages = Array.isArray(profile?.languages) ? profile.languages : [];
  const education = Array.isArray(profile?.education) ? profile.education : [];
  const experience = Array.isArray(profile?.experience) ? profile.experience : [];
  const summary = normalizeMultiline(profile?.summary);

  // Order: respect hints.preferEducationFirst if provided
  const firstIsEducation = !!hints.preferEducationFirst;

  const renderEducation = () =>
    education.length ? (
      <View style={styles.block}>
        <Text style={styles.h2}>
          {sec('education', lang === 'kk' ? 'Білім' : lang === 'en' ? 'Education' : 'Образование')}
        </Text>
        <View style={styles.hRuleWrap}>
          <View style={styles.hRule} />
          <View style={[styles.hDot, { backgroundColor: accent }]} />
        </View>

        {education.map((ed, i) => {
          const period = trimStr(ed.period) || trimStr(ed.year) || '';
          const degree = trimStr(ed.level || ed.degree);
          const inst = trimStr(ed.institution || ed.university);
          const spec = trimStr(ed.specialization || ed.major);

          return (
            <View key={ed.id || i} style={styles.twoCol} wrap={false}>
              <Text style={styles.colTime}>{period}</Text>
              <View style={styles.colBody}>
                {hasText(degree) ? <Text style={styles.em}>{degree}</Text> : null}
                {hasText(inst) ? <Text style={styles.muted}>{inst}</Text> : null}
                {hasText(spec) ? <Text style={styles.paragraph}>{spec}</Text> : null}
              </View>
            </View>
          );
        })}
      </View>
    ) : null;

  const renderExperience = () =>
    experience.length ? (
      <View style={styles.block}>
        <Text style={styles.h2}>
          {sec(
            'experience',
            lang === 'kk' ? 'Жұмыс тәжірибесі' : lang === 'en' ? 'Work Experience' : 'Опыт работы'
          )}
        </Text>
        <View style={styles.hRuleWrap}>
          <View style={styles.hRule} />
          <View style={[styles.hDot, { backgroundColor: accent }]} />
        </View>

        {experience.map((ex, i) => {
          const left = fmtPeriod(
            ex.startDate || ex.start,
            ex.endDate || ex.end,
            ex.currentlyWorking,
            ex.period,
            presentWord
          );
          const pos = trimStr(ex.position);
          const comp = trimStr(ex.company);
          const loc = trimStr(ex.location);
          const lines = toBullets(ex.responsibilities || ex.description);

          return (
            <View key={ex.id || i} style={styles.twoCol} wrap={false}>
              <Text style={styles.colTime}>{left}</Text>
              <View style={styles.colBody}>
                {hasText(pos) ? <Text style={styles.em}>{pos}</Text> : null}
                {hasText(comp) || hasText(loc) ? (
                  <Text style={styles.muted}>
                    {hasText(comp) ? comp : ''}
                    {hasText(comp) && hasText(loc) ? ' • ' : ''}
                    {hasText(loc) ? loc : ''}
                  </Text>
                ) : null}

                {lines.length ? (
                  <View style={{ marginTop: 4 }}>
                    {lines.map((line, j) => (
                      <View key={j} style={styles.bulletRow} wrap={false}>
                        <Text style={styles.bulletDot}>{bulletsPrefix}</Text>
                        <Text style={styles.bulletText}>{line}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    ) : null;

  return (
    <View style={styles.layout}>
      {/* ===== LEFT COLUMN ===== */}
      <View style={styles.left}>
        {hasText(profile?.photoUrl || profile?.photo) ? (
          <Image src={profile.photoUrl || profile.photo} style={styles.photo} />
        ) : null}

        <View style={styles.nameCard}>
          <Text style={styles.name}>{fullName}</Text>
          {hasText(title) ? <Text style={styles.subTitle}>{title}</Text> : null}
        </View>

        {/* Personal info */}
        {hasText(age) || hasText(maritalStatus) || hasText(children) || hasText(driversLicense) ? (
          <View style={styles.sideSection}>
            <SideTitle>
              {sec(
                'personal',
                lang === 'kk' ? 'Жеке ақпарат' : lang === 'en' ? 'Personal Info' : 'Личная информация'
              )}
            </SideTitle>
            {hasText(age) && (
              <SideRow
                primary={`${fld(
                  'age',
                  lang === 'kk' ? 'Жасы' : lang === 'en' ? 'Age' : 'Возраст'
                )}: ${age}`}
              />
            )}
            {hasText(maritalStatus) && (
              <SideRow
                primary={`${fld(
                  'maritalStatus',
                  lang === 'kk'
                    ? 'Отбасылық жағдайы'
                    : lang === 'en'
                    ? 'Marital status'
                    : 'Семейное положение'
                )}: ${maritalStatus}`}
              />
            )}
            {hasText(children) && (
              <SideRow
                primary={`${fld(
                  'children',
                  lang === 'kk' ? 'Балалар' : lang === 'en' ? 'Children' : 'Дети'
                )}: ${children}`}
              />
            )}
            {hasText(driversLicense) && (
              <SideRow
                primary={`${fld(
                  'driversLicense',
                  lang === 'kk'
                    ? 'Жүргізуші куәлігі'
                    : lang === 'en'
                    ? 'Driver’s license'
                    : 'Водительские права'
                )}: ${driversLicense}`}
              />
            )}
          </View>
        ) : null}

        {/* Contacts */}
        {hasText(location) || hasText(phone) || hasText(email) ? (
          <View style={styles.sideSection}>
            <SideTitle>
              {sec('contacts', lang === 'kk' ? 'Байланыс' : lang === 'en' ? 'Contacts' : 'Контакты')}
            </SideTitle>
            {hasText(location) ? <SideRow primary={location} /> : null}
            {hasText(email) ? <SideRow primary={email} /> : null}
            {hasText(phone) ? <SideRow primary={phone} /> : null}
          </View>
        ) : null}

        {/* Skills (left meter-style) */}
        {skills.length ? (
          <View style={styles.sideSection}>
            <SideTitle>
              {sec('skills', lang === 'kk' ? 'Дағдылар' : lang === 'en' ? 'Skills' : 'Навыки')}
            </SideTitle>
            {skills.map((sk, i) => (
              <View key={`${sk}_${i}`} style={styles.skillRow}>
                <Text style={styles.skillName}>{trimStr(sk)}</Text>
                <Text style={styles.skillDash}> — — — — — —</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Languages */}
        {languages.length ? (
          <View style={styles.sideSection}>
            <SideTitle>
              {sec('languages', lang === 'kk' ? 'Тілдер' : lang === 'en' ? 'Languages' : 'Языки')}
            </SideTitle>
            {languages.map((l, i) => {
              const langName = trimStr(l?.language || l?.name || l?.lang);
              const lvl = trimStr(l?.level || l?.proficiency);
              return (
                <View key={l?.id || i} style={styles.langRow}>
                  <Text style={styles.sideText}>{langName}</Text>
                  {hasText(lvl) ? <Text style={styles.sideSmall}>{lvl}</Text> : null}
                </View>
              );
            })}
          </View>
        ) : null}
      </View>

      {/* ===== RIGHT COLUMN ===== */}
      <View style={styles.right}>
        {/* Order flips by hints.preferEducationFirst */}
        {firstIsEducation ? (
          <>
            {renderEducation()}
            {renderExperience()}
          </>
        ) : (
          <>
            {renderExperience()}
            {renderEducation()}
          </>
        )}

        {/* Summary */}
        {hasText(summary) ? (
          <View style={styles.block}>
            <Text style={styles.h2}>
              {sec('summary', lang === 'kk' ? 'Өзім туралы' : lang === 'en' ? 'Summary' : 'О себе')}
            </Text>
            <View style={styles.hRuleWrap}>
              <View style={styles.hRule} />
              <View style={[styles.hDot, { backgroundColor: accent }]} />
            </View>
            <Text style={styles.paragraph}>{summary}</Text>
          </View>
        ) : null}

        {/* Skills tags on right (optional duplicate) */}
        {skills.length ? (
          <View style={[styles.block, { marginTop: 4 }]}>
            <Text style={styles.h2}>
              {sec('skills', lang === 'kk' ? 'Дағдылар' : lang === 'en' ? 'Skills' : 'Навыки')}
            </Text>
            <View style={styles.hRuleWrap}>
              <View style={styles.hRule} />
              <View style={[styles.hDot, { backgroundColor: accent }]} />
            </View>
            <View style={styles.skillsWrap}>
              {skills.map((sk, i) => (
                <Text key={`${sk}_${i}`} style={styles.skillTag}>
                  {trimStr(sk)}
                </Text>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
