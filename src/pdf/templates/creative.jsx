// src/pdf/templates/creative.jsx
import React from 'react';
import { View, Text, StyleSheet, Image } from '@react-pdf/renderer';

/**
 * props: { profile, theme }
 * Рендерит ТОЛЬКО внутренность страницы (без <Document>/<Page>).
 */

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
  colTime: { width: 70, color: '#6B7280', fontSize: 9, paddingTop: 2 },
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

/* ---------- маленькие элементы ---------- */
const SideTitle = ({ children }) => (
  <View style={styles.sideTitleRow}>
    <Text style={styles.sideTitle}>{children}</Text>
    <View style={styles.dashRule} />
  </View>
);

const SideRow = ({ primary, secondary }) =>
  !has(primary) && !has(secondary) ? null : (
    <View style={styles.sideRow}>
      {has(primary) ? <Text style={styles.sideText}>{t(primary)}</Text> : null}
      {has(secondary) ? <Text style={styles.sideSmall}>{t(secondary)}</Text> : null}
    </View>
  );

/* ---------- основной компонент ---------- */
export default function CreativeTemplate({ profile, theme }) {
  const accent = (theme && theme.accent) || '#8b5cf6';

  // базовые поля
  const fullName = t(profile?.fullName) || 'ИМЯ ФАМИЛИЯ';
  const title = t(profile?.position || profile?.title || profile?.professionalTitle);
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
      {/* ===== LEFT COLUMN ===== */}
      <View style={styles.left}>
        {has(profile?.photoUrl || profile?.photo) ? (
          <Image src={profile.photoUrl || profile.photo} style={styles.photo} />
        ) : null}

        <View style={styles.nameCard}>
          <Text style={styles.name}>{fullName}</Text>
          {has(title) ? <Text style={styles.subTitle}>{title}</Text> : null}
        </View>

        {/* Личная информация */}
        {(has(age) || has(maritalStatus) || has(children) || has(driverLicense)) && (
          <View style={styles.sideSection}>
            <SideTitle>Личная информация</SideTitle>
            {has(age) && <SideRow primary={`Возраст: ${age}`} />}
            {has(maritalStatus) && <SideRow primary={`Семейное положение: ${maritalStatus}`} />}
            {has(children) && <SideRow primary={`Дети: ${children}`} />}
            {has(driverLicense) && <SideRow primary={`Водительские права: ${driverLicense}`} />}
          </View>
        )}

        {/* Контакты */}
        {(has(location) || has(phone) || has(email)) && (
          <View style={styles.sideSection}>
            <SideTitle>Контакты</SideTitle>
            {has(location) ? <SideRow primary={location} /> : null}
            {has(email) ? <SideRow primary={email} /> : null}
            {has(phone) ? <SideRow primary={phone} /> : null}
          </View>
        )}

        {/* Навыки */}
        {skills.length ? (
          <View style={styles.sideSection}>
            <SideTitle>Навыки</SideTitle>
            {skills.map((sk, i) => (
              <View key={`${sk}_${i}`} style={styles.skillRow}>
                <Text style={styles.skillName}>{t(sk)}</Text>
                <Text style={styles.skillDash}> — — — — — —</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Языки */}
        {languages.length ? (
          <View style={styles.sideSection}>
            <SideTitle>Языки</SideTitle>
            {languages.map((l, i) => {
              const lang = t(l?.language || l?.name);
              const lvl = t(l?.level);
              return (
                <View key={l.id || i} style={styles.langRow}>
                  <Text style={styles.sideText}>{lang}</Text>
                  {has(lvl) ? <Text style={styles.sideSmall}>{lvl}</Text> : null}
                </View>
              );
            })}
          </View>
        ) : null}
      </View>

      {/* ===== RIGHT COLUMN ===== */}
      <View style={styles.right}>
        {/* Образование */}
        {education.length ? (
          <View style={styles.block}>
            <Text style={styles.h2}>Образование</Text>
            <View style={styles.hRuleWrap}>
              <View style={styles.hRule} />
              <View style={[styles.hDot, { backgroundColor: accent }]} />
            </View>

            {education.map((ed, i) => {
              const period = t(ed.period) || t(ed.year) || '';
              const degree = t(ed.level || ed.degree);
              const inst = t(ed.institution || ed.university);
              const spec = t(ed.specialization || ed.major);

              return (
                <View key={ed.id || i} style={styles.twoCol}>
                  <Text style={styles.colTime}>{period}</Text>
                  <View style={styles.colBody}>
                    {has(degree) ? <Text style={styles.em}>{degree}</Text> : null}
                    {has(inst) ? <Text style={styles.muted}>{inst}</Text> : null}
                    {has(spec) ? <Text style={styles.paragraph}>{spec}</Text> : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Опыт работы */}
        {experience.length ? (
          <View style={styles.block}>
            <Text style={styles.h2}>Опыт работы</Text>
            <View style={styles.hRuleWrap}>
              <View style={styles.hRule} />
              <View style={[styles.hDot, { backgroundColor: accent }]} />
            </View>

            {experience.map((ex, i) => {
              const left = fmtPeriod(
                ex.startDate || ex.start,
                ex.endDate || ex.end,
                ex.currentlyWorking,
                ex.period
              );
              const pos = t(ex.position);
              const comp = t(ex.company);
              const loc = t(ex.location);
              const lines = bullets(ex.responsibilities || ex.description);

              return (
                <View key={ex.id || i} style={styles.twoCol} break={false}>
                  <Text style={styles.colTime}>{left}</Text>
                  <View style={styles.colBody}>
                    {has(pos) ? <Text style={styles.em}>{pos}</Text> : null}
                    <Text style={styles.muted}>
                      {has(comp) ? comp : ''}
                      {has(comp) && has(loc) ? ' • ' : ''}
                      {has(loc) ? loc : ''}
                    </Text>

                    {lines.length ? (
                      <View style={{ marginTop: 4 }}>
                        {lines.map((line, j) => (
                          <View key={j} style={styles.bulletRow}>
                            <Text style={styles.bulletDot}>•</Text>
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
        ) : null}

        {/* Профиль / О себе */}
        {has(summary) ? (
          <View style={styles.block}>
            <Text style={styles.h2}>О себе</Text>
            <View style={styles.hRuleWrap}>
              <View style={styles.hRule} />
              <View style={[styles.hDot, { backgroundColor: accent }]} />
            </View>
            <Text style={styles.paragraph}>{summary}</Text>
          </View>
        ) : null}

        {/* Навыки (теги справа, если нужно продублировать) */}
        {skills.length ? (
          <View style={[styles.block, { marginTop: 4 }]}>
            <Text style={styles.h2}>Навыки</Text>
            <View style={styles.hRuleWrap}>
              <View style={styles.hRule} />
              <View style={[styles.hDot, { backgroundColor: accent }]} />
            </View>
            <View style={styles.skillsWrap}>
              {skills.map((sk, i) => (
                <Text key={`${sk}_${i}`} style={styles.skillTag}>
                  {t(sk)}
                </Text>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
