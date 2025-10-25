// src/pdf/templates/modern.jsx
import React from 'react';
import { View, Text, StyleSheet, Image } from '@react-pdf/renderer';

/** ВХОД:
 *  props: { profile, theme, pageInsets, flags, hints }
 *  Этот компонент РЕНДЕРИТ ТОЛЬКО ВНУТРЕННОСТИ страницы (без <Document>/<Page>).
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
const LEFT_W = 170;

const styles = StyleSheet.create({
  layout: {
    flexDirection: 'row',
    gap: 18,
  },
  left: {
    width: LEFT_W,
    backgroundColor: '#243447', // тёмная колонка (можно заменить на #111827 если хочется ещё темнее)
    color: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    paddingTop: 16,
  },
  right: {
    flex: 1,
    paddingTop: 4,
  },

  // фото
  avatarWrap: { alignItems: 'center', marginBottom: 14 },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    objectFit: 'cover',
    borderWidth: 2,
    borderColor: '#ffffff44',
  },

  // заголовки секций в левой колонке
  sideTitle: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
    color: '#E5E7EB',
  },
  sideBlock: { marginBottom: 14 },
  sideLine: { height: 1, backgroundColor: '#ffffff33', marginBottom: 8 },

  // строки контактов/образования/языков
  sideRow: { marginBottom: 6 },
  sideLabel: { fontSize: 9, color: '#D1D5DB' },
  sideText: { fontSize: 10, color: '#FFFFFF' },
  sideSmall: { fontSize: 9, color: '#E5E7EB' },

  // правая часть — шапка
  name: { fontSize: 22, fontWeight: 700, textTransform: 'uppercase' },
  position: { fontSize: 11, color: '#6B7280', marginTop: 3, marginBottom: 12 },
  topRule: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 10 },

  // заголовки секций справа
  h2: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  accentRule: { height: 2, width: 36, marginBottom: 10 },

  // профиль
  paragraph: { fontSize: 10, lineHeight: 1.35, color: '#111827' },

  // опыт
  xpItem: { marginBottom: 12 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  xpTitle: { fontSize: 11, fontWeight: 700 },
  xpCompany: { fontSize: 10, color: '#6B7280' },
  xpPeriod: { fontSize: 9, color: '#6B7280' },
  xpBullets: { marginTop: 4 },
  bulletRow: { flexDirection: 'row', gap: 6, marginBottom: 2 },
  bulletDot: { fontSize: 10, lineHeight: 1.35 },
  bulletText: { fontSize: 10, lineHeight: 1.35, color: '#111827', flex: 1 },

  // навыки
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skill: {
    fontSize: 9,
    color: '#1F2937',
    backgroundColor: '#F3F4F6',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
});

/* ---------- маленькие секции ---------- */
const SideSection = ({ title, children }) =>
  !children ? null : (
    <View style={styles.sideBlock}>
      <Text style={styles.sideTitle}>{title}</Text>
      <View style={styles.sideLine} />
      {children}
    </View>
  );

const Row = ({ label, text, small }) =>
  !has(text) ? null : (
    <View style={styles.sideRow}>
      {has(label) ? <Text style={styles.sideLabel}>{label}</Text> : null}
      <Text style={small ? styles.sideSmall : styles.sideText}>{t(text)}</Text>
    </View>
  );

/* ---------- основной компонент ---------- */
export default function ModernTemplate({ profile, theme, pageInsets }) {
  const accent = (theme && theme.accent) || '#1E90FF';

  const name = t(profile?.fullName) || 'ИМЯ ФАМИЛИЯ';
  const position = t(profile?.position || profile?.title || profile?.professionalTitle);
  const email = t(profile?.email);
  const phone = t(profile?.phone);
  const location = t(profile?.location);
  const summary = normalizeMultiline(profile?.summary);
  const summaryBullets = bullets(profile?.summary);

  const skills = Array.isArray(profile?.skills) ? profile.skills.filter(has) : [];
  const languages = Array.isArray(profile?.languages) ? profile.languages : [];

  const education = Array.isArray(profile?.education) ? profile.education : [];
  const experience = Array.isArray(profile?.experience) ? profile.experience : [];

  return (
    <View style={styles.layout}>
      {/* LEFT: тёмная колонка */}
      <View style={styles.left}>
        {/* Фото */}
        {has(profile?.photoUrl || profile?.photo) ? (
          <View style={styles.avatarWrap}>
            <Image src={profile.photoUrl || profile.photo} style={styles.avatar} />
          </View>
        ) : null}

        {/* Контакты */}
        <SideSection title="Contact">
          <Row label="Адрес" text={location} />
          <Row label="Телефон" text={phone} />
          <Row label="Email" text={email} />
        </SideSection>

        {/* Образование */}
        {education.length ? (
          <SideSection title="Education">
            {education.map((ed, i) => {
              const degree = t(ed.level || ed.degree);
              const inst = t(ed.institution || ed.university);
              const spec = t(ed.specialization || ed.major);
              const period = t(ed.period) || t(ed.year) || '';
              return (
                <View key={ed.id || i} style={{ marginBottom: 8 }}>
                  {has(degree) ? <Text style={styles.sideText}>{degree}</Text> : null}
                  {has(period) ? <Text style={styles.sideSmall}>{period}</Text> : null}
                  {has(inst) ? <Text style={styles.sideSmall}>{inst}</Text> : null}
                  {has(spec) ? <Text style={styles.sideSmall}>{spec}</Text> : null}
                </View>
              );
            })}
          </SideSection>
        ) : null}

        {/* Языки */}
        {languages.length ? (
          <SideSection title="Languages">
            {languages.map((l, i) => {
              const lang = t(l?.language || l?.name);
              const lvl = t(l?.level);
              return (
                <View key={l.id || i} style={{ marginBottom: 6 }}>
                  <Text style={styles.sideText}>{lang}</Text>
                  {has(lvl) ? <Text style={styles.sideSmall}>{lvl}</Text> : null}
                </View>
              );
            })}
          </SideSection>
        ) : null}
      </View>

      {/* RIGHT: контент */}
      <View style={styles.right}>
        {/* Шапка */}
        <Text style={styles.name}>{name}</Text>
        {has(position) ? <Text style={styles.position}>{position}</Text> : null}
        <View style={styles.topRule} />

        {/* PROFILE */}
        {(has(summary) || summaryBullets.length) && (
          <View style={{ marginBottom: 14 }}>
            <Text style={styles.h2}>Profile</Text>
            <View style={[styles.accentRule, { backgroundColor: accent }]} />
            {has(summary) ? <Text style={styles.paragraph}>{summary}</Text> : null}
            {!has(summary) && summaryBullets.length ? (
              <View style={{ marginTop: 2 }}>
                {summaryBullets.map((b, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        )}

        {/* WORK EXPERIENCE */}
        {experience.length ? (
          <View style={{ marginBottom: 14 }}>
            <Text style={styles.h2}>Work Experience</Text>
            <View style={[styles.accentRule, { backgroundColor: accent }]} />
            {experience.map((ex, i) => {
              const pos = t(ex.position);
              const comp = t(ex.company);
              const loc = t(ex.location);
              const right = fmtPeriod(ex.startDate || ex.start, ex.endDate || ex.end, ex.currentlyWorking, ex.period);
              const lines = bullets(ex.responsibilities || ex.description);

              return (
                <View key={ex.id || i} style={styles.xpItem} break={false}>
                  <View style={styles.xpRow}>
                    <View>
                      {has(pos) ? <Text style={styles.xpTitle}>{pos}</Text> : null}
                      <Text style={styles.xpCompany}>
                        {has(comp) ? comp : ''}{has(comp) && has(loc) ? ' • ' : ''}{has(loc) ? loc : ''}
                      </Text>
                    </View>
                    {has(right) ? <Text style={styles.xpPeriod}>{right}</Text> : null}
                  </View>

                  {lines.length ? (
                    <View style={styles.xpBullets}>
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

        {/* SKILLS */}
        {skills.length ? (
          <View style={{ marginBottom: 6 }}>
            <Text style={styles.h2}>Skills</Text>
            <View style={[styles.accentRule, { backgroundColor: accent }]} />
            <View style={styles.skillsWrap}>
              {skills.map((sk, i) => (
                <Text key={`${sk}_${i}`} style={styles.skill}>{t(sk)}</Text>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
