// src/pdf/templates/modern.jsx
import React from 'react';
import { View, Text, StyleSheet, Image } from '@react-pdf/renderer';

/**
 * ВХОД:
 * props: { profile, theme, pageInsets, flags, hints }
 * Этот компонент рендерит ТОЛЬКО внутренность страницы (без <Document>/<Page>).
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

/** Разбиваем многострочный текст на маркеры */
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

/** Форматируем период работы */
const fmtPeriod = (start, end, current, fallback) => {
  if (has(fallback)) return t(fallback);
  const st = t(start);
  const en = current ? 'настоящее время' : t(end);
  if (!st && !en) return '';
  return `${st || '—'} — ${en || '—'}`;
};

/* ---------- layout & styles ---------- */
const LEFT_W = 170;

const styles = StyleSheet.create({
  layout: {
    flexDirection: 'row',
    gap: 18,
  },
  left: {
    width: LEFT_W,
    backgroundColor: '#243447', // тёмная колонка
    color: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    paddingTop: 16,
  },
  right: {
    flex: 1,
    paddingTop: 4,
  },

  /* Фото */
  avatarWrap: { alignItems: 'center', marginBottom: 14 },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    objectFit: 'cover',
    borderWidth: 2,
    borderColor: '#ffffff44',
  },

  /* Заголовки секций в левой колонке */
  sideBlock: { marginBottom: 14 },
  sideTitle: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
    color: '#E5E7EB',
  },
  sideLine: {
    height: 1,
    backgroundColor: '#ffffff33',
    marginBottom: 8,
  },

  /* Строки внутри левой колонки */
  sideRow: { marginBottom: 6 },
  sideLabel: { fontSize: 9, color: '#D1D5DB' },
  sideText: { fontSize: 10, color: '#FFFFFF' },
  sideSmall: { fontSize: 9, color: '#E5E7EB' },

  /* Шапка справа */
  name: {
    fontSize: 22,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  position: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 3,
    marginBottom: 12,
  },
  topRule: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },

  /* Заголовки секций справа */
  h2: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  accentRule: {
    height: 2,
    width: 36,
    marginBottom: 10,
  },

  /* Описание / профиль */
  paragraph: {
    fontSize: 10,
    lineHeight: 1.35,
    color: '#111827',
  },

  /* Опыт работы */
  xpItem: { marginBottom: 12 },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  xpTitle: { fontSize: 11, fontWeight: 700 },
  xpCompany: { fontSize: 10, color: '#6B7280' },
  xpPeriod: { fontSize: 9, color: '#6B7280' },
  xpBullets: { marginTop: 4 },
  bulletRow: { flexDirection: 'row', gap: 6, marginBottom: 2 },
  bulletDot: { fontSize: 10, lineHeight: 1.35 },
  bulletText: {
    fontSize: 10,
    lineHeight: 1.35,
    color: '#111827',
    flex: 1,
  },

  /* Навыки */
  skillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skill: {
    fontSize: 9,
    color: '#1F2937',
    backgroundColor: '#F3F4F6',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
});

/* ---------- маленькие переиспользуемые блоки ---------- */
const SideSection = ({ title, children }) => {
  // children может быть массивом из null, отфильтруем пустое
  const normalized = Array.isArray(children)
    ? children.filter(Boolean)
    : children;

  if (
    normalized == null ||
    (Array.isArray(normalized) && normalized.length === 0)
  ) {
    return null;
  }

  return (
    <View style={styles.sideBlock}>
      <Text style={styles.sideTitle}>{title}</Text>
      <View style={styles.sideLine} />
      {normalized}
    </View>
  );
};

const Row = ({ label, text, small }) =>
  !has(text) ? null : (
    <View style={styles.sideRow}>
      {has(label) ? <Text style={styles.sideLabel}>{label}</Text> : null}
      <Text style={small ? styles.sideSmall : styles.sideText}>{t(text)}</Text>
    </View>
  );

/* ---------- основной компонент ---------- */
export default function ModernTemplate({ profile, theme }) {
  const accent = (theme && theme.accent) || '#1E90FF';

  /* основные поля профиля */
  const fullName = t(profile?.fullName) || 'ИМЯ ФАМИЛИЯ';
  const position =
    t(profile?.position || profile?.title || profile?.professionalTitle) || '';
  const email = t(profile?.email);
  const phone = t(profile?.phone);
  const location = t(profile?.location);

  /* новые поля личного блока */
  const age = t(profile?.age);
  const maritalStatus = t(profile?.maritalStatus);
  const children = t(profile?.children);
  const driverLicense = t(profile?.driverLicense);

  /* секция "о себе" */
  const summaryText = normalizeMultiline(profile?.summary);
  const summaryBulletList = bullets(profile?.summary);

  /* массивы */
  const skills = Array.isArray(profile?.skills)
    ? profile.skills.filter(has)
    : [];
  const languages = Array.isArray(profile?.languages)
    ? profile.languages
    : [];
  const education = Array.isArray(profile?.education)
    ? profile.education
    : [];
  const experience = Array.isArray(profile?.experience)
    ? profile.experience
    : [];

  return (
    <View style={styles.layout}>
      {/* ===== LEFT COLUMN (dark) ===== */}
      <View style={styles.left}>
        {/* Фото */}
        {has(profile?.photoUrl || profile?.photo) ? (
          <View style={styles.avatarWrap}>
            <Image
              src={profile.photoUrl || profile.photo}
              style={styles.avatar}
            />
          </View>
        ) : null}

        {/* Личная информация */}
        <SideSection title="Личная информация">
          <Row label="Возраст" text={age} />
          <Row label="Семейное положение" text={maritalStatus} />
          <Row label="Дети" text={children} />
          <Row label="Водительские права" text={driverLicense} />
        </SideSection>

        {/* Контакты */}
        <SideSection title="Контакты">
          <Row label="Город" text={location} />
          <Row label="Телефон" text={phone} />
          <Row label="Email" text={email} />
        </SideSection>

        {/* Образование */}
        {education.length ? (
          <SideSection title="Образование">
            {education.map((ed, i) => {
              const degree = t(ed.level || ed.degree);
              const inst = t(ed.institution || ed.university);
              const spec = t(ed.specialization || ed.major);
              const period = t(ed.period) || t(ed.year) || '';
              return (
                <View key={ed.id || i} style={{ marginBottom: 8 }}>
                  {has(degree) ? (
                    <Text style={styles.sideText}>{degree}</Text>
                  ) : null}
                  {has(period) ? (
                    <Text style={styles.sideSmall}>{period}</Text>
                  ) : null}
                  {has(inst) ? (
                    <Text style={styles.sideSmall}>{inst}</Text>
                  ) : null}
                  {has(spec) ? (
                    <Text style={styles.sideSmall}>{spec}</Text>
                  ) : null}
                </View>
              );
            })}
          </SideSection>
        ) : null}

        {/* Языки */}
        {languages.length ? (
          <SideSection title="Языки">
            {languages.map((l, i) => {
              const lang = t(l?.language || l?.name);
              const lvl = t(l?.level);
              return (
                <View key={l.id || i} style={{ marginBottom: 6 }}>
                  <Text style={styles.sideText}>{lang}</Text>
                  {has(lvl) ? (
                    <Text style={styles.sideSmall}>{lvl}</Text>
                  ) : null}
                </View>
              );
            })}
          </SideSection>
        ) : null}
      </View>

      {/* ===== RIGHT COLUMN (main content) ===== */}
      <View style={styles.right}>
        {/* Шапка с именем и позицией */}
        <Text style={styles.name}>{fullName}</Text>
        {has(position) ? (
          <Text style={styles.position}>{position}</Text>
        ) : null}
        <View style={styles.topRule} />

        {/* О себе / Профиль */}
        {(has(summaryText) || summaryBulletList.length) && (
          <View style={{ marginBottom: 14 }}>
            <Text style={styles.h2}>О себе</Text>
            <View
              style={[styles.accentRule, { backgroundColor: accent }]}
            />
            {has(summaryText) ? (
              <Text style={styles.paragraph}>{summaryText}</Text>
            ) : null}

            {!has(summaryText) && summaryBulletList.length ? (
              <View style={{ marginTop: 2 }}>
                {summaryBulletList.map((b, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        )}

        {/* Опыт работы */}
        {experience.length ? (
          <View style={{ marginBottom: 14 }}>
            <Text style={styles.h2}>Опыт работы</Text>
            <View
              style={[styles.accentRule, { backgroundColor: accent }]}
            />
            {experience.map((ex, i) => {
              const pos = t(ex.position);
              const comp = t(ex.company);
              const loc = t(ex.location);
              const periodRight = fmtPeriod(
                ex.startDate || ex.start,
                ex.endDate || ex.end,
                ex.currentlyWorking,
                ex.period
              );

              const lines = bullets(
                ex.responsibilities || ex.description
              );

              return (
                <View
                  key={ex.id || i}
                  style={styles.xpItem}
                  break={false}
                >
                  <View style={styles.xpRow}>
                    <View>
                      {has(pos) ? (
                        <Text style={styles.xpTitle}>{pos}</Text>
                      ) : null}
                      <Text style={styles.xpCompany}>
                        {has(comp) ? comp : ''}
                        {has(comp) && has(loc) ? ' • ' : ''}
                        {has(loc) ? loc : ''}
                      </Text>
                    </View>
                    {has(periodRight) ? (
                      <Text style={styles.xpPeriod}>{periodRight}</Text>
                    ) : null}
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

        {/* Навыки */}
        {skills.length ? (
          <View style={{ marginBottom: 6 }}>
            <Text style={styles.h2}>Навыки</Text>
            <View
              style={[styles.accentRule, { backgroundColor: accent }]}
            />
            <View style={styles.skillsWrap}>
              {skills.map((sk, i) => (
                <Text key={`${sk}_${i}`} style={styles.skill}>
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
