// src/pdf/templates/modern.jsx
import React from 'react';
import { View, Text, StyleSheet, Image } from '@react-pdf/renderer';

/*
  props: { profile, theme }

  Этот шаблон:
  - двухколоночный: слева тёмный сайдбар с контактами и личными данными,
    справа контент: имя, "О себе", "Опыт", "Образование", "Навыки".
  - аккуратно рендерит новые поля (возраст, семейное положение, дети, права).
  - чистит многострочные bullets в опыте.
*/

/* ===== helpers ===== */
const s = (v) => (v == null ? '' : String(v));
const t = (v) => s(v).trim();
const has = (v) => !!t(v);

// приводим textarea к предсказуемому виду
const normalizeMultiline = (v) =>
  s(v)
    .replace(/\r\n?/g, '\n')        // \r\n -> \n
    .split('\n')
    .map((line) => line.replace(/\s+$/g, '')) // убрать пробелы в конце строки
    .join('\n')
    .trim();

/**
 * bulletsPlus:
 * - режем текст на строки
 * - если строка начинается с маркера (•, -, *, 1.), создаём новый пункт
 * - если НЕ начинается, но уже есть активный пункт, то это продолжение предыдущего: склеиваем
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
      // пушим предыдущий пункт
      if (current.trim()) out.push(current.trim());
      // срезаем маркер
      const cleaned = line.replace(/^([•\-\*\u2022]|\d+[.)])\s+/, '');
      // иногда люди пишут "• – Текст"; уберём ведущие тире/длинное тире
      const cleaned2 = cleaned.replace(/^[-–—]\s*/, '');
      current = cleaned2;
    } else {
      // просто продолжение предыдущего буллета
      if (current) {
        current += ' ' + line;
      } else {
        // не было маркера до этого — значит новая "сырая" строка, создаём пункт
        current = line.replace(/^[-–—]\s*/, '');
      }
    }
  }
  if (current.trim()) out.push(current.trim());

  return out;
}

// формат "Май.2021 — Настоящее время"
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
export default function ModernTemplate({ profile, theme }) {
  const accent = (theme && theme.accent) || '#1E90FF';

  const name = t(profile?.fullName) || 'ИМЯ ФАМИЛИЯ';
  const position = t(profile?.position || profile?.title || profile?.professionalTitle);

  const email = t(profile?.email);
  const phone = t(profile?.phone);
  const location = t(profile?.location);

  const age = t(profile?.age);
  const maritalStatus = t(profile?.maritalStatus);
  const children = t(profile?.children);
  const driversLicense = t(profile?.driversLicense);

  const summary = normalizeMultiline(profile?.summary);
  const experience = Array.isArray(profile?.experience) ? profile.experience : [];
  const education = Array.isArray(profile?.education) ? profile.education : [];
  const languages = Array.isArray(profile?.languages) ? profile.languages : [];
  const skills = Array.isArray(profile?.skills)
    ? profile.skills.filter((x) => has(x)).slice(0, 20)
    : [];

  return (
    <View style={styles.layout}>
      {/* LEFT SIDEBAR */}
      <View style={styles.left}>
        {/* Фото */}
        {has(profile?.photoUrl || profile?.photo) ? (
          <View style={styles.avatarWrap}>
            <Image src={profile.photoUrl || profile.photo} style={styles.avatar} />
          </View>
        ) : null}

        {/* Контакты */}
        {(has(location) || has(phone) || has(email)) && (
          <SideSection title="Контакты">
            <Row label="Город" text={location} />
            <Row label="Телефон" text={phone} />
            <Row label="Email" text={email} />
          </SideSection>
        )}

        {/* Личная информация */}
        {(has(age) || has(maritalStatus) || has(children) || has(driversLicense)) && (
          <SideSection title="Личная информация">
            <Row label="Возраст" text={age} />
            <Row label="Семейное положение" text={maritalStatus} />
            <Row label="Дети" text={children} />
            <Row label="Права" text={driversLicense} />
          </SideSection>
        )}

        {/* Образование (кратко, год + вуз + спец) */}
        {education.length ? (
          <SideSection title="Образование">
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
        {languages.length ? (
          <SideSection title="Языки">
            {languages.map((l, i) => {
              const lang = t(l?.language || l?.name);
              const lvl = t(l?.level);
              return (
                <View key={l.id || i} style={{ marginBottom: 6 }}>
                  {has(lang) ? <Text style={styles.sideText}>{lang}</Text> : null}
                  {has(lvl) ? <Text style={styles.sideSmall}>{lvl}</Text> : null}
                </View>
              );
            })}
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
            <Text style={styles.h2}>О себе</Text>
            <View style={[styles.accentRule, { backgroundColor: accent }]} />
            <Text style={styles.paragraph}>{summary}</Text>
          </View>
        ) : null}

        {/* Опыт работы */}
        {experience.length ? (
          <View style={{ marginBottom: 14 }}>
            <Text style={styles.h2}>Опыт работы</Text>
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
                    {has(periodText) ? (
                      <Text style={styles.xpPeriod}>{periodText}</Text>
                    ) : null}
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
            <Text style={styles.h2}>Навыки</Text>
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

        {/* Образование (расширенный блок дублируем справа только если хотим подробно).
            Если не нужно дублировать, эту секцию можно убрать. */}
        {education.length ? (
          <View style={{ marginBottom: 6 }}>
            <Text style={styles.h2}>Образование</Text>
            <View style={[styles.accentRule, { backgroundColor: accent }]} />
            {education.map((ed, i) => {
              const degree = t(ed.level || ed.degree);
              const inst = t(ed.institution || ed.university);
              const spec = t(ed.specialization || ed.major);
              const year = t(ed.year || ed.period);

              return (
                <View key={ed.id || i} style={{ marginBottom: 8 }}>
                  {has(degree) ? (
                    <Text style={styles.xpTitle}>{degree}</Text>
                  ) : null}
                  <Text style={styles.xpCompany}>
                    {has(inst) ? inst : ''}
                    {has(inst) && has(year) ? ' • ' : ''}
                    {has(year) ? year : ''}
                  </Text>
                  {has(spec) ? (
                    <Text style={styles.paragraph}>{spec}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}
