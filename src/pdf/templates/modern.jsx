// src/pdf/templates/modern.jsx
import React from 'react';
import { View, Text, StyleSheet, Image } from '@react-pdf/renderer';

/*
  props: { profile, theme, lang }

  Шаблон:
  - Две колонки: слева тёмный сайдбар (контакты, личные данные, образование, языки),
    справа контент (имя, «О себе», «Опыт», «Навыки», «Образование»).
  - Аккуратно рендерит дополнительные поля: возраст, семейное положение, дети, права.
  - Чистит многострочные bullets в опыте.
  - i18n: ru / kk / en (автоопределение по props.lang → profile.lang/language/locale).
*/

/* ===== i18n ===== */
const DICT = {
  ru: {
    nameFallback: 'ИМЯ ФАМИЛИЯ',
    contacts: 'Контакты',
    city: 'Город',
    phone: 'Телефон',
    email: 'Email',
    personal: 'Личная информация',
    age: 'Возраст',
    marital: 'Семейное положение',
    children: 'Дети',
    license: 'Права',
    about: 'О себе',
    experience: 'Опыт работы',
    skills: 'Навыки',
    education: 'Образование',
    languages: 'Языки',
    present: 'настоящее время',
  },
  kk: {
    nameFallback: 'АТЫ ЖӨНІ',
    contacts: 'Байланыс',
    city: 'Қала',
    phone: 'Телефон',
    email: 'Email',
    personal: 'Жеке мәліметтер',
    age: 'Жасы',
    marital: 'Отбасы жағдайы',
    children: 'Балалар',
    license: 'Жүргізуші куәлігі',
    about: 'Өзі туралы',
    experience: 'Еңбек өтілі',
    skills: 'Дағдылар',
    education: 'Білім',
    languages: 'Тілдер',
    present: 'қазіргі уақыт',
  },
  en: {
    nameFallback: 'NAME SURNAME',
    contacts: 'Contacts',
    city: 'City',
    phone: 'Phone',
    email: 'Email',
    personal: 'Personal info',
    age: 'Age',
    marital: 'Marital status',
    children: 'Children',
    license: "Driver's license",
    about: 'About me',
    experience: 'Experience',
    skills: 'Skills',
    education: 'Education',
    languages: 'Languages',
    present: 'present',
  },
};

function pickLang(raw) {
  const v = String(raw || '').toLowerCase();
  if (v.startsWith('ru')) return 'ru';
  if (v.startsWith('kk') || v.startsWith('kz')) return 'kk';
  if (v.startsWith('en')) return 'en';
  return 'ru';
}
function tr(lang, key) {
  const L = DICT[lang] || DICT.ru;
  return L[key] || key;
}

/* ===== helpers ===== */
const toStr = (v) => (v == null ? '' : String(v));
const trimStr = (v) => toStr(v).trim();
const has = (v) => !!trimStr(v);

// приведение textarea к предсказуемому виду
const normalizeMultiline = (v) =>
  toStr(v)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .join('\n')
    .trim();

/**
 * bulletsPlus:
 * - режем на строки
 * - если строка начинается с маркера (•, -, *, 1.), создаём новый пункт
 * - иначе склеиваем с предыдущим
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
      const cleaned = line.replace(/^([•\-\*\u2022]|\d+[.)])\s+/, '');
      const cleaned2 = cleaned.replace(/^[-–—]\s*/, '');
      current = cleaned2;
    } else {
      if (current) current += ' ' + line;
      else current = line.replace(/^[-–—]\s*/, '');
    }
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

// формат "Май.2021 — Настоящее время" (доверяем готовым строкам, иначе собираем)
const fmtPeriod = (start, end, current, fallback, lang = 'ru') => {
  if (has(fallback)) return trimStr(fallback);
  const st = trimStr(start);
  const en = current ? tr(lang, 'present') : trimStr(end);
  if (!st && !en) return '';
  return `${st || '—'} — ${en || '—'}`;
};

/* ===== layout/styles ===== */
const LEFT_W = 170;

const styles = StyleSheet.create({
  layout: {
    flexDirection: 'row',
    // react-pdf не поддерживает gap повсеместно; визуальный отступ зададим справа от левой колонки
  },
  left: {
    width: LEFT_W,
    backgroundColor: '#243447', // тёмная боковая колонка
    color: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    paddingTop: 16,
    marginRight: 18, // вместо gap
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
  bulletRow: { flexDirection: 'row', marginBottom: 2 },
  bulletDot: { fontSize: 10, lineHeight: 1.35, color: '#111827', marginRight: 6 },
  bulletText: {
    fontSize: 10,
    lineHeight: 1.35,
    color: '#111827',
    flex: 1,
  },

  /* навыки */
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  skill: {
    fontSize: 9,
    color: '#1F2937',
    backgroundColor: '#F3F4F6',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 6,
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
      <Text style={small ? styles.sideSmall : styles.sideText}>{trimStr(text)}</Text>
    </View>
  );

/* ===== основной компонент ===== */
export default function ModernTemplate({ profile = {}, theme = {}, lang: langProp }) {
  const lang =
    pickLang(
      langProp ||
        profile.lang ||
        profile.language ||
        profile.locale ||
        (Array.isArray(profile?.i18n?.langs) && profile.i18n.langs[0]) ||
        profile?.i18n?.lang
    ) || 'ru';

  const accent = theme.accent || '#1E90FF';

  const name = trimStr(profile?.fullName) || tr(lang, 'nameFallback');
  const position =
    trimStr(profile?.position || profile?.title || profile?.professionalTitle);

  const email = trimStr(profile?.email);
  const phone = trimStr(profile?.phone);
  const location = trimStr(profile?.location);

  const age = trimStr(profile?.age);
  const maritalStatus = trimStr(profile?.maritalStatus);
  const children = trimStr(profile?.children);
  const driversLicense = trimStr(profile?.driversLicense);

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
          <SideSection title={tr(lang, 'contacts')}>
            <Row label={tr(lang, 'city')} text={location} />
            <Row label={tr(lang, 'phone')} text={phone} />
            <Row label={tr(lang, 'email')} text={email} />
          </SideSection>
        )}

        {/* Личная информация */}
        {(has(age) || has(maritalStatus) || has(children) || has(driversLicense)) && (
          <SideSection title={tr(lang, 'personal')}>
            <Row label={tr(lang, 'age')} text={age} />
            <Row label={tr(lang, 'marital')} text={maritalStatus} />
            <Row label={tr(lang, 'children')} text={children} />
            <Row label={tr(lang, 'license')} text={driversLicense} />
          </SideSection>
        )}

        {/* Образование (кратко) */}
        {education.length ? (
          <SideSection title={tr(lang, 'education')}>
            {education.map((ed, i) => {
              const degree = trimStr(ed.level || ed.degree);
              const inst = trimStr(ed.institution || ed.university);
              const spec = trimStr(ed.specialization || ed.major);
              const year = trimStr(ed.year || ed.period);
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
          <SideSection title={tr(lang, 'languages')}>
            {languages.map((l, i) => {
              const lng = trimStr(l?.language || l?.name);
              const lvl = trimStr(l?.level);
              return (
                <View key={l.id || i} style={{ marginBottom: 6 }}>
                  {has(lng) ? <Text style={styles.sideText}>{lng}</Text> : null}
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
            <Text style={styles.h2}>{tr(lang, 'about')}</Text>
            <View style={[styles.accentRule, { backgroundColor: accent }]} />
            <Text style={styles.paragraph}>{summary}</Text>
          </View>
        ) : null}

        {/* Опыт */}
        {experience.length ? (
          <View style={{ marginBottom: 14 }}>
            <Text style={styles.h2}>{tr(lang, 'experience')}</Text>
            <View style={[styles.accentRule, { backgroundColor: accent }]} />
            {experience.map((ex, i) => {
              const pos = trimStr(ex.position);
              const comp = trimStr(ex.company);
              const locTxt = trimStr(ex.location);
              const periodText = fmtPeriod(
                ex.startDate || ex.start,
                ex.endDate || ex.end,
                ex.currentlyWorking,
                ex.period,
                lang
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
            <Text style={styles.h2}>{tr(lang, 'skills')}</Text>
            <View style={[styles.accentRule, { backgroundColor: accent }]} />
            <View style={styles.skillsWrap}>
              {skills.map((sk, i) => (
                <Text key={`${sk}_${i}`} style={styles.skill}>
                  {trimStr(sk)}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        {/* Образование (подробно — по желанию) */}
        {education.length ? (
          <View style={{ marginBottom: 6 }}>
            <Text style={styles.h2}>{tr(lang, 'education')}</Text>
            <View style={[styles.accentRule, { backgroundColor: accent }]} />
            {education.map((ed, i) => {
              const degree = trimStr(ed.level || ed.degree);
              const inst = trimStr(ed.institution || ed.university);
              const spec = trimStr(ed.specialization || ed.major);
              const year = trimStr(ed.year || ed.period);

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
