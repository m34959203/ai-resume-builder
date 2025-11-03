// src/pdf/templates/modern.jsx
import React from 'react';
import { View, Text, StyleSheet, Image } from '@react-pdf/renderer';

/*
  props: { profile, theme, dict }

  Шаблон:
  - двухколоночный: слева тёмный сайдбар (контакты, личные данные, краткое образование, языки),
    справа контент (имя, ABOUT, EXPERIENCE, SKILLS, EDUCATION).
  - поддерживает новые поля: возраст, семейное положение, дети, права.
  - аккуратно чистит bullets в опыте.
  - лейблы секций берутся из dict: about, experience, education, skills, contacts (+ personalInfo, languages).
*/

/* ===== helpers ===== */
const s = (v) => (v == null ? '' : String(v));
const t = (v) => s(v).trim();
const has = (v) => !!t(v);

// normalize textarea
const normalizeMultiline = (v) =>
  s(v)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .join('\n')
    .trim();

/**
 * bulletsPlus:
 * - режем на строки
 * - строки с маркером (•, -, *, 1.) — новый пункт
 * - прочие строки — продолжение предыдущего пункта
 */
function bulletsPlus(text) {
  const lines = normalizeMultiline(text)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const out = [];
  let current = '';
  const isMarker = (line) => /^([•\-\*\u2022]|\d+[.)])\s+/.test(line);

  for (const line of lines) {
    if (isMarker(line)) {
      if (current.trim()) out.push(current.trim());
      const cleaned = line.replace(/^([•\-\*\u2022]|\d+[.)])\s+/, '').replace(/^[-–—]\s*/, '');
      current = cleaned;
    } else {
      if (current) {
        current += ' ' + line;
      } else {
        current = line.replace(/^[-–—]\s*/, '');
      }
    }
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

// период: "start — end | настоящее время"
const fmtPeriod = (start, end, current, fallback) => {
  if (has(fallback)) return t(fallback);
  const st = t(start);
  const en = current ? 'настоящее время' : t(end);
  if (!st && !en) return '';
  return `${st || '—'} — ${en || '—'}`;
};

/* ===== layout/styles ===== */
const LEFT_W = 170;

const styles = StyleSheet.create({
  layout: {
    flexDirection: 'row',
    gap: 18,
  },
  left: {
    width: LEFT_W,
    backgroundColor: '#243447', // тёмная боковая колонка
    color: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    paddingTop: 16,
  },
  right: {
    flex: 1,
    paddingTop: 4,
  },

  /* фото */
  avatarWrap: { alignItems: 'center', marginBottom: 14 },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    objectFit: 'cover',
    borderWidth: 2,
    borderColor: '#ffffff44',
  },

  /* заголовки секций в левой колонке */
  sideBlock: { marginBottom: 14 },
  sideTitle: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
    color: '#E5E7EB',
  },
  sideLine: { height: 1, backgroundColor: '#ffffff33', marginBottom: 8 },

  sideRow: { marginBottom: 6 },
  sideLabel: { fontSize: 9, color: '#D1D5DB' },
  sideText: { fontSize: 10, color: '#FFFFFF' },
  sideSmall: { fontSize: 9, color: '#E5E7EB' },

  /* правая часть — шапка */
  name: {
    fontSize: 22,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#111827',
  },
  position: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 3,
    marginBottom: 12,
  },
  topRule: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 10 },

  /* заголовки секций справа */
  h2: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    color: '#111827',
  },
  accentRule: { height: 2, width: 36, marginBottom: 10 },

  paragraph: { fontSize: 10, lineHeight: 1.35, color: '#111827' },

  /* опыт */
  xpItem: { marginBottom: 12 },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  xpTitle: { fontSize: 11, fontWeight: 700, color: '#111827' },
  xpCompany: { fontSize: 10, color: '#6B7280' },
  xpPeriod: { fontSize: 9, color: '#6B7280' },
  xpBullets: { marginTop: 4 },
  bulletRow: { flexDirection: 'row', gap: 6, marginBottom: 2 },
  bulletDot: { fontSize: 10, lineHeight: 1.35, color: '#111827' },
  bulletText: {
    fontSize: 10,
    lineHeight: 1.35,
    color: '#111827',
    flex: 1,
  },

  /* навыки */
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

/* маленькие блоки для левой колонки */
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

/* ===== основной компонент ===== */
export default function ModernTemplate({ profile = {}, theme = {}, dict = {} }) {
  const accent = theme.accent || '#1E90FF';

  // Локализованные подписи (дефолты на русском)
  const L = {
    about: dict.about || 'О себе',
    experience: dict.experience || 'Опыт',
    education: dict.education || 'Образование',
    skills: dict.skills || 'Навыки',
    contacts: dict.contacts || 'Контакты',
    personalInfo: dict.personalInfo || 'Личная информация',
    languages: dict.languages || 'Языки',
    age: dict.age || 'Возраст',
    maritalStatus: dict.maritalStatus || 'Семейное положение',
    children: dict.children || 'Дети',
    driversLicense: dict.driversLicense || 'Права',
    city: dict.city || 'Город',
    phone: dict.phone || 'Телефон',
    email: dict.email || 'Email',
  };

  const name = t(profile.fullName) || 'ИМЯ ФАМИЛИЯ';
  const position = t(profile.position || profile.title || profile.professionalTitle);

  const email = t(profile.email);
  const phone = t(profile.phone);
  const location = t(profile.location);

  const age = t(profile.age);
  const maritalStatus = t(profile.maritalStatus);
  const children = t(profile.children);
  const driversLicense = t(profile.driversLicense);

  const summary = normalizeMultiline(profile.summary);
  const experience = Array.isArray(profile.experience) ? profile.experience : [];
  const education = Array.isArray(profile.education) ? profile.education : [];
  const languages = Array.isArray(profile.languages) ? profile.languages : [];
  const skills = Array.isArray(profile.skills)
    ? profile.skills.filter((x) => has(x)).slice(0, 20)
    : [];

  // Дедуп языков
  const uniqLangs = [];
  const seenLang = new Set();
  for (const l of languages) {
    const nm = t(l?.language || l?.name);
    const lv = t(l?.level);
    if (!nm) continue;
    const key = `${nm}__${lv}`.toLowerCase();
    if (seenLang.has(key)) continue;
    seenLang.add(key);
    uniqLangs.push({ language: nm, level: lv });
  }

  return (
    <View style={styles.layout}>
      {/* LEFT SIDEBAR */}
      <View style={styles.left}>
        {/* Фото */}
        {has(profile.photoUrl || profile.photo) ? (
          <View style={styles.avatarWrap}>
            <Image src={profile.photoUrl || profile.photo} style={styles.avatar} />
          </View>
        ) : null}

        {/* Контакты */}
        {(has(location) || has(phone) || has(email)) && (
          <SideSection title={L.contacts}>
            <Row label={L.city} text={location} />
            <Row label={L.phone} text={phone} />
            <Row label={L.email} text={email} />
          </SideSection>
        )}

        {/* Личная информация */}
        {(has(age) || has(maritalStatus) || has(children) || has(driversLicense)) && (
          <SideSection title={L.personalInfo}>
            <Row label={L.age} text={age} />
            <Row label={L.maritalStatus} text={maritalStatus} />
            <Row label={L.children} text={children} />
            <Row label={L.driversLicense} text={driversLicense} />
          </SideSection>
        )}

        {/* Образование (кратко) */}
        {education.length ? (
          <SideSection title={L.education}>
            {education.map((ed, i) => {
              const degree = t(ed.level || ed.degree);
              const inst = t(ed.institution || ed.university);
              const spec = t(ed.specialization || ed.major);
              const year = t(ed.year || ed.period);
              return (
                <View key={ed.id || i} style={{ marginBottom: 8 }}>
                  {has(degree) ? <Text style={styles.sideText}>{degree}</Text> : null}
                  {has(year) ? <Text style={styles.sideSmall}>{year}</Text> : null}
                  {has(inst) ? <Text style={styles.sideSmall}>{inst}</Text> : null}
                  {has(spec) ? <Text style={styles.sideSmall}>{spec}</Text> : null}
                </View>
              );
            })}
          </SideSection>
        ) : null}

        {/* Языки */}
        {uniqLangs.length ? (
          <SideSection title={L.languages}>
            {uniqLangs.map((l, i) => (
              <View key={l.id || i} style={{ marginBottom: 6 }}>
                {has(l.language) ? <Text style={styles.sideText}>{l.language}</Text> : null}
                {has(l.level) ? <Text style={styles.sideSmall}>{l.level}</Text> : null}
              </View>
            ))}
          </SideSection>
        ) : null}
      </View>

      {/* RIGHT CONTENT */}
      <View style={styles.right}>
        {/* Шапка */}
        <Text style={styles.name}>{name}</Text>
        {has(position) ? <Text style={styles.position}>{position}</Text> : null}
        <View style={styles.topRule} />

        {/* О себе */}
        {has(summary) ? (
          <View style={{ marginBottom: 14 }}>
            <Text style={styles.h2}>{L.about}</Text>
            <View style={[styles.accentRule, { backgroundColor: accent }]} />
            <Text style={styles.paragraph}>{summary}</Text>
          </View>
        ) : null}

        {/* Опыт */}
        {experience.length ? (
          <View style={{ marginBottom: 14 }}>
            <Text style={styles.h2}>{L.experience}</Text>
            <View style={[styles.accentRule, { backgroundColor: accent }]} />
            {experience.map((ex, i) => {
              const pos = t(ex.position);
              const comp = t(ex.company);
              const locTxt = t(ex.location);
              const periodText = fmtPeriod(
                ex.startDate || ex.start,
                ex.endDate || ex.end,
                ex.currentlyWorking,
                ex.period
              );

              const pts = bulletsPlus(ex.responsibilities || ex.description);

              return (
                <View key={ex.id || i} style={styles.xpItem} break={false}>
                  <View style={styles.xpRow}>
                    <View>
                      {has(pos) ? <Text style={styles.xpTitle}>{pos}</Text> : null}
                      <Text style={styles.xpCompany}>
                        {has(comp) ? comp : ''}
                        {has(comp) && has(locTxt) ? ' • ' : ''}
                        {has(locTxt) ? locTxt : ''}
                      </Text>
                    </View>
                    {has(periodText) ? <Text style={styles.xpPeriod}>{periodText}</Text> : null}
                  </View>

                  {pts.length ? (
                    <View style={styles.xpBullets}>
                      {pts.map((line, j) => (
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
          <View style={{ marginBottom: 14 }}>
            <Text style={styles.h2}>{L.skills}</Text>
            <View style={[styles.accentRule, { backgroundColor: accent }]} />
            <View style={styles.skillsWrap}>
              {skills.map((sk, i) => (
                <Text key={`${sk}_${i}`} style={styles.skill}>
                  {t(sk)}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        {/* Образование — детально (по желанию можно убрать дублирование с левым сайдбаром) */}
        {education.length ? (
          <View style={{ marginBottom: 6 }}>
            <Text style={styles.h2}>{L.education}</Text>
            <View style={[styles.accentRule, { backgroundColor: accent }]} />
            {education.map((ed, i) => {
              const degree = t(ed.level || ed.degree);
              const inst = t(ed.institution || ed.university);
              const spec = t(ed.specialization || ed.major);
              const year = t(ed.year || ed.period);

              return (
                <View key={ed.id || i} style={{ marginBottom: 8 }}>
                  {has(degree) ? <Text style={styles.xpTitle}>{degree}</Text> : null}
                  <Text style={styles.xpCompany}>
                    {has(inst) ? inst : ''}
                    {has(inst) && has(year) ? ' • ' : ''}
                    {has(year) ? year : ''}
                  </Text>
                  {has(spec) ? <Text style={styles.paragraph}>{spec}</Text> : null}
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}
