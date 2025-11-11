// src/pdf/templates/modern.jsx
import React from 'react';
import { View, Text, StyleSheet, Image } from '@react-pdf/renderer';

/*
  props: { profile, theme, labels, t, lang, pageInsets, flags, hints }

  Шаблон "modern":
  - двухколоночный макет: слева тёмный сайдбар (контакты/личное/краткое образование/языки),
    справа — имя, "О себе", "Опыт", "Навыки", "Образование".
  - никакого хардкода строк: все заголовки и подписи — через labels/t/lang.
*/

/* ===== helpers (без перезаписи переводчика t) ===== */
const s = (v) => (v == null ? '' : String(v));
const tr = (v) => s(v).trim();                 // trim only
const has = (v) => !!tr(v);

// Нормализация многострочных текстов (CRLF → LF, обрезка хвостов)
const normalizeMultiline = (v) =>
  s(v)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .join('\n')
    .trim();

/** Развёрнутый парсер буллетов — маркеры (•, -, *, 1.) → пункты, переносы склеиваются */
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
      if (current) current += ' ' + line;
      else current = line.replace(/^[-–—]\s*/, '');
    }
  }
  if (current.trim()) out.push(current.trim());

  return out;
}

/** Формат периода: используем уже собранный ex.period, иначе собираем start—end с учётом "Present" */
const buildPeriod = (start, end, currentlyWorking, fallback, presentWord) => {
  if (has(fallback)) return tr(fallback);
  const st = tr(start);
  const en = currentlyWorking ? presentWord : tr(end);
  if (!st && !en) return '';
  return `${st || '—'} — ${en || '—'}`;
};

/* ===== layout/styles ===== */
const LEFT_W = 170;

const styles = StyleSheet.create({
  layout: { flexDirection: 'row', gap: 18 },
  left: {
    width: LEFT_W,
    backgroundColor: '#243447',
    color: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    paddingTop: 16,
  },
  right: { flex: 1, paddingTop: 4 },

  /* фото */
  avatarWrap: { alignItems: 'center', marginBottom: 14 },
  avatar: {
    width: 86, height: 86, borderRadius: 43, objectFit: 'cover',
    borderWidth: 2, borderColor: '#ffffff44',
  },

  /* заголовки секций в левой колонке */
  sideBlock: { marginBottom: 14 },
  sideTitle: {
    fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase',
    marginBottom: 6, color: '#E5E7EB',
  },
  sideLine: { height: 1, backgroundColor: '#ffffff33', marginBottom: 8 },

  sideRow: { marginBottom: 6 },
  sideLabel: { fontSize: 9, color: '#D1D5DB' },
  sideText: { fontSize: 10, color: '#FFFFFF' },
  sideSmall: { fontSize: 9, color: '#E5E7EB' },

  /* правая часть — шапка */
  name: { fontSize: 22, fontWeight: 700, textTransform: 'uppercase', color: '#111827' },
  position: { fontSize: 11, color: '#6B7280', marginTop: 3, marginBottom: 12 },
  topRule: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 10 },

  /* заголовки секций справа */
  h2: {
    fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: 0.6, marginBottom: 8, color: '#111827',
  },
  accentRule: { height: 2, width: 36, marginBottom: 10 },

  paragraph: { fontSize: 10, lineHeight: 1.35, color: '#111827' },

  /* опыт */
  xpItem: { marginBottom: 12 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  xpTitle: { fontSize: 11, fontWeight: 700, color: '#111827' },
  xpCompany: { fontSize: 10, color: '#6B7280' },
  xpPeriod: { fontSize: 9, color: '#6B7280' },
  xpBullets: { marginTop: 4 },
  bulletRow: { flexDirection: 'row', gap: 6, marginBottom: 2 },
  bulletDot: { fontSize: 10, lineHeight: 1.35, color: '#111827' },
  bulletText: { fontSize: 10, lineHeight: 1.35, color: '#111827', flex: 1 },

  /* навыки */
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skill: {
    fontSize: 9, color: '#1F2937', backgroundColor: '#F3F4F6',
    paddingVertical: 3, paddingHorizontal: 6, borderRadius: 4,
  },
});

/* Унифицированный аксесс к заголовкам секций: labels.sections.* → t('pdf.sections.*') */
const secTitle = (key, labels, t, lang) => {
  const L = labels || {};
  return (
    L[key] || L.sections?.[key] ||
    (t && t(`pdf.sections.${key}`)) ||
    // безопасные короткие фолбэки
    (key === 'summary' ? (lang === 'kk' ? 'Өзім туралы' : lang === 'en' ? 'Summary' : 'О себе') : '') ||
    (key === 'experience' ? (lang === 'kk' ? 'Жұмыс тәжірибесі' : lang === 'en' ? 'Experience' : 'Опыт работы') : '') ||
    (key === 'education' ? (lang === 'kk' ? 'Білім' : lang === 'en' ? 'Education' : 'Образование') : '') ||
    (key === 'skills' ? (lang === 'kk' ? 'Дағдылар' : lang === 'en' ? 'Skills' : 'Навыки') : '') ||
    (key === 'personal' ? (lang === 'kk' ? 'Жеке мәліметтер' : lang === 'en' ? 'Personal info' : 'Личная информация') : '') ||
    (key === 'contacts' ? (lang === 'kk' ? 'Байланыс' : lang === 'en' ? 'Contacts' : 'Контакты') : '')
  );
};

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
      <Text style={small ? styles.sideSmall : styles.sideText}>{tr(text)}</Text>
    </View>
  );

/* ===== основной компонент ===== */
export default function ModernTemplate({ profile = {}, theme, labels, t, lang, pageInsets }) {
  const accent = (theme && theme.accent) || '#1E90FF';

  // Слово для "Present"
  const presentWord =
    (labels && labels.present) ||
    (t && t('builder.experience.current')) ||
    (lang === 'kk' ? 'қазіргі уақыт' : lang === 'en' ? 'Present' : 'настоящее время');

  // Заголовки секций
  const TITLE = {
    contacts: secTitle('contacts', labels, t, lang),
    personal: secTitle('personal', labels, t, lang),
    summary: secTitle('summary', labels, t, lang),
    experience: secTitle('experience', labels, t, lang),
    skills: secTitle('skills', labels, t, lang),
    education: secTitle('education', labels, t, lang),
    languages: secTitle('languages', labels, t, lang),
  };

  // Поля профиля
  const name = tr(profile.fullName) || (lang === 'en' ? 'NAME SURNAME' : lang === 'kk' ? 'АТЫ ЖӨНІ' : 'ИМЯ ФАМИЛИЯ');
  const position = tr(profile.position || profile.title || profile.professionalTitle);

  const email = tr(profile.email);
  const phone = tr(profile.phone);
  const location = tr(profile.location);

  const age = tr(profile.age);
  const maritalStatus = tr(profile.maritalStatus);
  const children = tr(profile.children);
  const driversLicense = tr(profile.driversLicense);

  const summary = normalizeMultiline(profile.summary);
  const experience = Array.isArray(profile.experience) ? profile.experience : [];
  const education = Array.isArray(profile.education) ? profile.education : [];
  const languagesArr = Array.isArray(profile.languages) ? profile.languages : [];
  const skills = Array.isArray(profile.skills) ? profile.skills.filter(has).slice(0, 20) : [];

  // Локализованные подписи полей сайдбара
  const LBL = {
    city: (t && t('builder.personal.location')) || (lang === 'kk' ? 'Қала' : lang === 'en' ? 'Location' : 'Город'),
    phone: (t && t('builder.personal.phone')) || (lang === 'kk' ? 'Телефон' : lang === 'en' ? 'Phone' : 'Телефон'),
    email: 'Email',
    age: (t && (t('pdf.age') || t('builder.personal.age'))) || (lang === 'kk' ? 'Жасы' : lang === 'en' ? 'Age' : 'Возраст'),
    marital:
      (t && (t('pdf.marital') || t('builder.personal.maritalStatus'))) ||
      (lang === 'kk' ? 'Отбасылық жағдайы' : lang === 'en' ? 'Marital status' : 'Семейное положение'),
    children:
      (t && (t('pdf.children') || t('builder.personal.children'))) ||
      (lang === 'kk' ? 'Балалар' : lang === 'en' ? 'Children' : 'Дети'),
    license:
      (t && (t('pdf.license') || t('builder.personal.driversLicense'))) ||
      (lang === 'kk' ? 'Жүргізуші куәлігі' : lang === 'en' ? "Driver's license" : 'Водительские права'),
  };

  return (
    <View
      style={[
        styles.layout,
        { paddingTop: pageInsets?.header || 0, paddingBottom: pageInsets?.footer || 0 },
      ]}
    >
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
          <SideSection title={TITLE.contacts}>
            <Row label={LBL.city} text={location} />
            <Row label={LBL.phone} text={phone} />
            <Row label={LBL.email} text={email} />
          </SideSection>
        )}

        {/* Личная информация */}
        {(has(age) || has(maritalStatus) || has(children) || has(driversLicense)) && (
          <SideSection title={TITLE.personal}>
            <Row label={LBL.age} text={age} />
            <Row label={LBL.marital} text={maritalStatus} />
            <Row label={LBL.children} text={children} />
            <Row label={LBL.license} text={driversLicense} />
          </SideSection>
        )}

        {/* Образование (кратко) */}
        {education.length ? (
          <SideSection title={TITLE.education}>
            {education.map((ed, i) => {
              const degree = tr(ed.level || ed.degree);
              const inst = tr(ed.institution || ed.university);
              const spec = tr(ed.specialization || ed.major);
              const year = tr(ed.year || ed.period);
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
        {languagesArr.length ? (
          <SideSection title={TITLE.languages}>
            {languagesArr.map((l, i) => {
              const langName = tr(l?.language || l?.name);
              const lvl = tr(l?.level);
              return (
                <View key={l.id || i} style={{ marginBottom: 6 }}>
                  {has(langName) ? <Text style={styles.sideText}>{langName}</Text> : null}
                  {has(lvl) ? <Text style={styles.sideSmall}>— {lvl}</Text> : null}
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
            <Text style={styles.h2}>{TITLE.summary}</Text>
            <View style={[styles.accentRule, { backgroundColor: accent }]} />
            <Text style={styles.paragraph}>{summary}</Text>
          </View>
        ) : null}

        {/* Опыт */}
        {experience.length ? (
          <View style={{ marginBottom: 14 }}>
            <Text style={styles.h2}>{TITLE.experience}</Text>
            <View style={[styles.accentRule, { backgroundColor: accent }]} />
            {experience.map((ex, i) => {
              const pos = tr(ex.position);
              const comp = tr(ex.company);
              const locTxt = tr(ex.location);
              const periodText = buildPeriod(
                ex.startDate || ex.start,
                ex.endDate || ex.end,
                ex.currentlyWorking,
                ex.period,
                presentWord
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
            <Text style={styles.h2}>{TITLE.skills}</Text>
            <View style={[styles.accentRule, { backgroundColor: accent }]} />
            <View style={styles.skillsWrap}>
              {skills.map((sk, i) => (
                <Text key={`${sk}_${i}`} style={styles.skill}>
                  {tr(sk)}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        {/* Образование (подробно справа, по желанию) */}
        {education.length ? (
          <View style={{ marginBottom: 6 }}>
            <Text style={styles.h2}>{TITLE.education}</Text>
            <View style={[styles.accentRule, { backgroundColor: accent }]} />
            {education.map((ed, i) => {
              const degree = tr(ed.level || ed.degree);
              const inst = tr(ed.institution || ed.university);
              const spec = tr(ed.specialization || ed.major);
              const year = tr(ed.year || ed.period);

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
