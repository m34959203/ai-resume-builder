// src/pdf/templates/professional.jsx
import React from 'react';
import { View, Text, StyleSheet, Image } from '@react-pdf/renderer';

/** props: { profile, theme } */

/* ---------- helpers ---------- */
const s = (v) => (v == null ? '' : String(v));
const t = (v) => s(v).trim();
const has = (v) => !!t(v);

const normalizeMultiline = (v) =>
  s(v)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .join('\n')
    .trim();

const bullets = (text) => {
  const lines = normalizeMultiline(text)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  return lines.map((line) => {
    const m = /^([•\-\*\u2022]|\d+[.)])\s+(.+)$/.exec(line);
    return t(m ? m[2] : line);
  });
};

const fmtPeriod = (start, end, current, fallback) => {
  if (has(fallback)) return t(fallback);
  const st = t(start);
  const en = current ? 'настоящее время' : t(end);
  if (!st && !en) return '';
  return `${st || '—'} — ${en || '—'}`;
};

/* ---------- layout & styles ---------- */
const LEFT_W = 210;

const styles = StyleSheet.create({
  layout: { flexDirection: 'row', gap: 18 },

  /* LEFT (dark sidebar) */
  left: {
    width: LEFT_W,
    backgroundColor: '#0F172A', // slate-900
    color: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
  },
  avatarWrap: { alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    objectFit: 'cover',
    borderWidth: 2,
    borderColor: '#ffffff33',
  },
  name: { fontSize: 14, fontWeight: 700, textAlign: 'center', marginTop: 8 },
  role: { fontSize: 10, textAlign: 'center', color: '#38BDF8', marginTop: 2 },

  sideSection: { marginTop: 14 },
  sideTitle: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#93C5FD',
    marginBottom: 6,
  },
  sideRow: { marginBottom: 6 },
  sideText: { fontSize: 10, color: '#E5E7EB', lineHeight: 1.35 },
  sideSmall: { fontSize: 9, color: '#CBD5E1' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    fontSize: 9,
    color: '#E5E7EB',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },

  /* RIGHT (content) */
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
  hLineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  hTick: { width: 16, height: 3, borderRadius: 2 },
  hLine: { height: 1, backgroundColor: '#E5E7EB', flex: 1 },
  hDots: { flexDirection: 'row', gap: 3 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },

  paragraph: { fontSize: 10, lineHeight: 1.45, color: '#111827' },

  xpItem: { marginBottom: 12 },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  xpTitle: { fontSize: 11, fontWeight: 700 },
  xpSub: { fontSize: 10, color: '#6B7280' },
  xpPeriod: { fontSize: 9, color: '#0891B2' },

  bulletRow: { flexDirection: 'row', gap: 6, marginTop: 3 },
  bulletDot: { fontSize: 10, lineHeight: 1.35, color: '#0891B2' },
  bulletText: { fontSize: 10, lineHeight: 1.35, color: '#111827', flex: 1 },

  eduRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  eduYear: { width: 42, fontSize: 9, color: '#6B7280', paddingTop: 1 },
  eduBody: { flex: 1 },
  strong: { fontSize: 10, fontWeight: 700, color: '#0F172A' },
  muted: { fontSize: 10, color: '#6B7280' },

  cols2: { flexDirection: 'row', gap: 24 },
  col: { flex: 1 },
});

/* ---------- small components ---------- */
const SideRow = ({ primary, secondary }) =>
  !has(primary) && !has(secondary) ? null : (
    <View style={styles.sideRow}>
      {has(primary) ? <Text style={styles.sideText}>{t(primary)}</Text> : null}
      {has(secondary) ? <Text style={styles.sideSmall}>{t(secondary)}</Text> : null}
    </View>
  );

const Heading = ({ children, accent }) => (
  <View>
    <Text style={styles.h2}>{children}</Text>
    <View style={styles.hLineRow}>
      <View style={[styles.hTick, { backgroundColor: accent }]} />
      <View style={styles.hLine} />
      <View style={styles.hDots}>
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <View style={[styles.dot, { backgroundColor: accent }]} />
      </View>
    </View>
  </View>
);

/* ---------- main template ---------- */
export default function ProfessionalTemplate({ profile, theme }) {
  const accent = (theme && theme.accent) || '#38BDF8'; // cyan

  // базовые поля
  const fullName = t(profile?.fullName) || 'ИМЯ ФАМИЛИЯ';
  const role = t(profile?.position || profile?.title || profile?.professionalTitle);
  const email = t(profile?.email);
  const phone = t(profile?.phone);
  const location = t(profile?.location);

  // новые поля личного блока
  const age = t(profile?.age);
  const maritalStatus = t(profile?.maritalStatus);
  const children = t(profile?.children);
  const driverLicense = t(profile?.driverLicense);

  const skills = Array.isArray(profile?.skills) ? profile.skills.filter(has) : [];
  const languages = Array.isArray(profile?.languages) ? profile.languages : [];
  const education = Array.isArray(profile?.education) ? profile.education : [];
  const experience = Array.isArray(profile?.experience) ? profile.experience : [];
  const summary = normalizeMultiline(profile?.summary);

  return (
    <View style={styles.layout}>
      {/* LEFT: левая тёмная колонка */}
      <View style={styles.left}>
        <View style={styles.avatarWrap}>
          {has(profile?.photoUrl || profile?.photo) ? (
            <Image src={profile.photoUrl || profile.photo} style={styles.avatar} />
          ) : null}
          <Text style={styles.name}>{fullName}</Text>
          {has(role) ? <Text style={[styles.role, { color: accent }]}>{role}</Text> : null}
        </View>

        {/* Личная информация */}
        {(has(age) || has(maritalStatus) || has(children) || has(driverLicense)) && (
          <View style={styles.sideSection}>
            <Text style={styles.sideTitle}>Личная информация</Text>
            {has(age) && <SideRow primary={`Возраст: ${age}`} />}
            {has(maritalStatus) && <SideRow primary={`Семейное положение: ${maritalStatus}`} />}
            {has(children) && <SideRow primary={`Дети: ${children}`} />}
            {has(driverLicense) && <SideRow primary={`Водительские права: ${driverLicense}`} />}
          </View>
        )}

        {/* Контакты */}
        {(has(location) || has(phone) || has(email)) && (
          <View style={styles.sideSection}>
            <Text style={styles.sideTitle}>Контакты</Text>
            {has(phone) && <SideRow primary={phone} />}
            {has(email) && <SideRow primary={email} />}
            {has(location) && <SideRow primary={location} />}
          </View>
        )}

        {/* Языки */}
        {languages.length ? (
          <View style={styles.sideSection}>
            <Text style={styles.sideTitle}>Языки</Text>
            {languages.map((l, i) => {
              const lang = t(l?.language || l?.name);
              const lvl = t(l?.level);
              return <SideRow key={l.id || i} primary={lang} secondary={lvl} />;
            })}
          </View>
        ) : null}

        {/* Навыки */}
        {skills.length ? (
          <View style={styles.sideSection}>
            <Text style={styles.sideTitle}>Навыки</Text>
            <View style={styles.chips}>
              {skills.map((sk, i) => (
                <Text key={`${sk}_${i}`} style={styles.chip}>{t(sk)}</Text>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      {/* RIGHT: контент */}
      <View style={styles.right}>
        {/* О себе */}
        {has(summary) ? (
          <View style={styles.block}>
            <Heading accent={accent}>О себе</Heading>
            <Text style={styles.paragraph}>{summary}</Text>
          </View>
        ) : null}

        {/* Опыт работы */}
        {experience.length ? (
          <View style={styles.block}>
            <Heading accent={accent}>Опыт работы</Heading>
            {experience.map((ex, i) => {
              const period = fmtPeriod(
                ex.startDate || ex.start,
                ex.endDate || ex.end,
                ex.currentlyWorking,
                ex.period
              );
              const title = t(ex.position);
              const company = t(ex.company);
              const loc = t(ex.location);
              const lines = bullets(ex.responsibilities || ex.description);

              return (
                <View key={ex.id || i} style={styles.xpItem} break={false}>
                  <View style={styles.xpHeader}>
                    <View>
                      {has(title) ? <Text style={styles.xpTitle}>{title}</Text> : null}
                      <Text style={styles.xpSub}>
                        {has(company) ? company : ''}
                        {has(company) && has(loc) ? ' • ' : ''}
                        {has(loc) ? loc : ''}
                      </Text>
                    </View>
                    {has(period) ? (
                      <Text style={[styles.xpPeriod, { color: accent }]}>{period}</Text>
                    ) : null}
                  </View>

                  {lines.length ? (
                    <View>
                      {lines.map((line, j) => (
                        <View key={j} style={styles.bulletRow}>
                          <Text style={styles.bulletDot}>•</Text>
                          <Text style={styles.bulletText}>{line}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Образование */}
        {education.length ? (
          <View style={styles.block}>
            <Heading accent={accent}>Образование</Heading>
            {education.map((ed, i) => {
              const year = t(ed.period) || t(ed.year) || '';
              const degree = t(ed.level || ed.degree);
              const inst = t(ed.institution || ed.university);
              const spec = t(ed.specialization || ed.major);

              return (
                <View key={ed.id || i} style={styles.eduRow}>
                  <Text style={styles.eduYear}>{year}</Text>
                  <View style={styles.eduBody}>
                    {has(degree) ? <Text style={styles.strong}>{degree}</Text> : null}
                    {has(inst) ? <Text style={styles.muted}>{inst}</Text> : null}
                    {has(spec) ? <Text style={styles.paragraph}>{spec}</Text> : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Ключевые компетенции (дублируем навыки в 2 колонки) */}
        {skills.length ? (
          <View style={styles.block}>
            <Heading accent={accent}>Ключевые компетенции</Heading>
            <View style={styles.cols2}>
              <View style={styles.col}>
                {skills.filter((_, idx) => idx % 2 === 0).map((sk, i) => (
                  <View key={`c1_${i}`} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{t(sk)}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.col}>
                {skills.filter((_, idx) => idx % 2 === 1).map((sk, i) => (
                  <View key={`c2_${i}`} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{t(sk)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
