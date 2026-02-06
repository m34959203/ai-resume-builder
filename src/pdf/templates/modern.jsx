// src/pdf/templates/modern.jsx
import React from 'react';
import { View, Text, StyleSheet, Image } from '@react-pdf/renderer';

/*
  Шаблон "modern" — двухколоночный:
  Слева: светлый сайдбар (фото, имя, должность, контакты, навыки, языки)
  Справа: Profile, Experience, Education
  Стиль: чистый, профессиональный, синий акцент
*/

const s = (v) => (v == null ? '' : String(v));
const tr = (v) => s(v).trim();
const has = (v) => !!tr(v);

const normalizeMultiline = (v) =>
  s(v).replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/\s+$/g, '')).join('\n').trim();

function bulletsPlus(text) {
  const lines = normalizeMultiline(text).split('\n').map((l) => l.trim()).filter(Boolean);
  const out = [];
  let current = '';
  const isMarker = (line) => /^([•\-\*\u2022]|\d+[.)])\s+/.test(line);
  for (const line of lines) {
    if (isMarker(line)) {
      if (current.trim()) out.push(current.trim());
      current = line.replace(/^([•\-\*\u2022]|\d+[.)])\s+/, '').replace(/^[-–—]\s*/, '');
    } else {
      if (current) current += ' ' + line;
      else current = line.replace(/^[-–—]\s*/, '');
    }
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

const buildPeriod = (start, end, currentlyWorking, fallback, presentWord) => {
  if (has(fallback)) return tr(fallback);
  const st = tr(start);
  const en = currentlyWorking ? presentWord : tr(end);
  if (!st && !en) return '';
  return `${st || '—'} — ${en || '—'}`;
};

/* ===== layout ===== */
const LEFT_W = 190;
const ACCENT = '#2563EB';

const styles = StyleSheet.create({
  layout: { flexDirection: 'row', minHeight: '100%' },

  /* LEFT — light sidebar */
  left: {
    width: LEFT_W,
    backgroundColor: '#F1F5F9',
    padding: 18,
    paddingTop: 24,
    borderRight: '1px solid #E2E8F0',
  },
  right: { flex: 1, padding: 24, paddingLeft: 28 },

  /* Photo + Name */
  avatarWrap: { alignItems: 'center', marginBottom: 6 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, objectFit: 'cover',
    borderWidth: 3, borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#CBD5E1', borderWidth: 3, borderColor: '#FFFFFF',
  },
  nameCenter: { textAlign: 'center', marginBottom: 2 },
  nameText: {
    fontSize: 14, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: 1.2, color: '#1E293B',
  },
  roleText: {
    fontSize: 8.5, fontWeight: 600, textTransform: 'uppercase',
    color: ACCENT, textAlign: 'center', marginBottom: 16,
  },

  /* Sidebar sections */
  sideBlock: { marginBottom: 14 },
  sideTitle: {
    fontSize: 8, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase',
    letterSpacing: 2, marginBottom: 5,
  },
  sideLine: { height: 0.5, backgroundColor: '#CBD5E1', marginBottom: 8 },

  contactRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5, gap: 6 },
  contactIcon: { fontSize: 8, color: ACCENT, marginTop: 1 },
  contactText: { fontSize: 8.5, color: '#334155', flex: 1 },

  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  skill: {
    fontSize: 7.5, color: '#334155', backgroundColor: '#FFFFFF',
    paddingVertical: 2.5, paddingHorizontal: 6, borderRadius: 3,
    borderWidth: 0.5, borderColor: '#E2E8F0',
  },

  langRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  langName: { fontSize: 8.5, color: '#334155' },
  langLevel: { fontSize: 8, color: '#94A3B8' },

  personalLabel: { fontSize: 7.5, color: '#94A3B8' },
  personalValue: { fontSize: 8.5, color: '#334155', marginBottom: 5 },

  /* Right — sections */
  name: { fontSize: 20, fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.5 },
  position: { fontSize: 10, color: '#64748B', marginTop: 2, marginBottom: 10 },
  topRule: { height: 0.5, backgroundColor: '#E2E8F0', marginBottom: 14 },

  sectionWrap: { marginBottom: 16 },
  h2: {
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: 1.5, color: '#0F172A', marginBottom: 6,
  },
  accentRule: { height: 2, width: 30, backgroundColor: ACCENT, marginBottom: 10 },

  paragraph: { fontSize: 9, lineHeight: 1.5, color: '#475569' },

  /* Experience */
  xpItem: { marginBottom: 10 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  xpTitle: { fontSize: 10, fontWeight: 700, color: '#0F172A' },
  xpCompany: { fontSize: 8.5, color: '#64748B', fontStyle: 'italic', marginBottom: 3 },
  xpPeriod: { fontSize: 7.5, fontWeight: 600, color: '#64748B' },
  xpPeriodCurrent: { fontSize: 7.5, fontWeight: 600, color: ACCENT },
  xpBullets: { marginTop: 3 },
  bulletRow: { flexDirection: 'row', gap: 5, marginBottom: 2 },
  bulletDot: { fontSize: 9, lineHeight: 1.4, color: '#475569' },
  bulletText: { fontSize: 9, lineHeight: 1.4, color: '#475569', flex: 1 },

  /* Education right */
  eduItem: { marginBottom: 8 },
  eduRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eduTitle: { fontSize: 10, fontWeight: 700, color: '#0F172A' },
  eduInst: { fontSize: 8.5, color: '#64748B', fontStyle: 'italic' },
  eduPeriod: { fontSize: 7.5, fontWeight: 600, color: '#94A3B8' },
  eduSpec: { fontSize: 8.5, color: '#475569', marginTop: 1 },
});

/* Section title resolver */
const secTitle = (key, labels, t, lang) => {
  const L = labels || {};
  return (
    L[key] || L.sections?.[key] || (t && t(`pdf.sections.${key}`)) ||
    ({ summary: { ru: 'О себе', kk: 'Өзім туралы', en: 'Profile' },
       experience: { ru: 'Опыт работы', kk: 'Жұмыс тәжірибесі', en: 'Experience' },
       education: { ru: 'Образование', kk: 'Білім', en: 'Education' },
       skills: { ru: 'Навыки', kk: 'Дағдылар', en: 'Skills' },
       contacts: { ru: 'Контакты', kk: 'Байланыс', en: 'Contact' },
       personal: { ru: 'Личная информация', kk: 'Жеке мәліметтер', en: 'Personal' },
       languages: { ru: 'Языки', kk: 'Тілдер', en: 'Languages' },
    }[key]?.[lang] || key)
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

export default function ModernTemplate({ profile = {}, theme, labels, t, lang, pageInsets }) {
  const accent = theme?.accent || ACCENT;

  const presentWord =
    labels?.present || (t && t('builder.experience.current')) ||
    (lang === 'kk' ? 'қазіргі уақыт' : lang === 'en' ? 'Present' : 'настоящее время');

  const TITLE = {
    contacts: secTitle('contacts', labels, t, lang),
    personal: secTitle('personal', labels, t, lang),
    summary: secTitle('summary', labels, t, lang),
    experience: secTitle('experience', labels, t, lang),
    skills: secTitle('skills', labels, t, lang),
    education: secTitle('education', labels, t, lang),
    languages: secTitle('languages', labels, t, lang),
  };

  const name = tr(profile.fullName) || (lang === 'en' ? 'YOUR NAME' : lang === 'kk' ? 'СІЗДІҢ АТЫҢЫЗ' : 'ВАШЕ ИМЯ');
  const position = tr(profile.position || profile.title || profile.professionalTitle);
  const email = tr(profile.email);
  const phone = tr(profile.phone);
  const location = tr(profile.location);
  const website = tr(profile.website || profile.portfolio);
  const age = tr(profile.age);
  const maritalStatus = tr(profile.maritalStatus);
  const children_ = tr(profile.children);
  const driversLicense = tr(profile.driversLicense);
  const summary = normalizeMultiline(profile.summary);
  const experience = Array.isArray(profile.experience) ? profile.experience : [];
  const education = Array.isArray(profile.education) ? profile.education : [];
  const languagesArr = Array.isArray(profile.languages) ? profile.languages : [];
  const skills = Array.isArray(profile.skills) ? profile.skills.filter(has).slice(0, 20) : [];

  const LBL = {
    city: (t && t('builder.personal.location')) || (lang === 'kk' ? 'Қала' : lang === 'en' ? 'Location' : 'Город'),
    phone: (t && t('builder.personal.phone')) || (lang === 'kk' ? 'Телефон' : lang === 'en' ? 'Phone' : 'Телефон'),
    email: 'Email',
    website: (t && t('builder.personal.website')) || 'Web',
    age: (t && (t('pdf.age') || t('builder.personal.age'))) || (lang === 'kk' ? 'Жасы' : lang === 'en' ? 'Age' : 'Возраст'),
    marital: (t && (t('pdf.marital') || t('builder.personal.maritalStatus'))) || (lang === 'kk' ? 'Отбасылық жағдайы' : lang === 'en' ? 'Marital status' : 'Семейное положение'),
    children: (t && (t('pdf.children') || t('builder.personal.children'))) || (lang === 'kk' ? 'Балалар' : lang === 'en' ? 'Children' : 'Дети'),
    license: (t && (t('pdf.license') || t('builder.personal.driversLicense'))) || (lang === 'kk' ? 'Жүргізуші куәлігі' : lang === 'en' ? "Driver's license" : 'Водительские права'),
  };

  return (
    <View style={[styles.layout, { paddingTop: pageInsets?.header || 0, paddingBottom: pageInsets?.footer || 0 }]}>

      {/* ===== LEFT SIDEBAR ===== */}
      <View style={styles.left}>
        {/* Photo */}
        <View style={styles.avatarWrap}>
          {has(profile.photoUrl || profile.photo) ? (
            <Image src={profile.photoUrl || profile.photo} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
        </View>

        {/* Name + Role */}
        <View style={styles.nameCenter}>
          <Text style={styles.nameText}>{name}</Text>
        </View>
        {has(position) && <Text style={styles.roleText}>{position}</Text>}

        {/* Contact */}
        {(has(phone) || has(email) || has(location) || has(website)) && (
          <SideSection title={TITLE.contacts}>
            {has(phone) && (
              <View style={styles.contactRow}>
                <Text style={styles.contactIcon}>tel</Text>
                <Text style={styles.contactText}>{phone}</Text>
              </View>
            )}
            {has(email) && (
              <View style={styles.contactRow}>
                <Text style={styles.contactIcon}>@</Text>
                <Text style={styles.contactText}>{email}</Text>
              </View>
            )}
            {has(location) && (
              <View style={styles.contactRow}>
                <Text style={styles.contactIcon}>loc</Text>
                <Text style={styles.contactText}>{location}</Text>
              </View>
            )}
            {has(website) && (
              <View style={styles.contactRow}>
                <Text style={styles.contactIcon}>web</Text>
                <Text style={styles.contactText}>{website}</Text>
              </View>
            )}
          </SideSection>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <SideSection title={TITLE.skills}>
            <View style={styles.skillsWrap}>
              {skills.map((sk, i) => (
                <Text key={`${sk}_${i}`} style={styles.skill}>{tr(sk)}</Text>
              ))}
            </View>
          </SideSection>
        )}

        {/* Languages */}
        {languagesArr.length > 0 && (
          <SideSection title={TITLE.languages}>
            {languagesArr.map((l, i) => {
              const langName = tr(l?.language || l?.name);
              const lvl = tr(l?.level);
              return (
                <View key={l?.id || i} style={styles.langRow}>
                  <Text style={styles.langName}>{langName}</Text>
                  {has(lvl) && <Text style={styles.langLevel}>{lvl}</Text>}
                </View>
              );
            })}
          </SideSection>
        )}

        {/* Personal info */}
        {(has(age) || has(maritalStatus) || has(children_) || has(driversLicense)) && (
          <SideSection title={TITLE.personal}>
            {has(age) && (<><Text style={styles.personalLabel}>{LBL.age}</Text><Text style={styles.personalValue}>{age}</Text></>)}
            {has(maritalStatus) && (<><Text style={styles.personalLabel}>{LBL.marital}</Text><Text style={styles.personalValue}>{maritalStatus}</Text></>)}
            {has(children_) && (<><Text style={styles.personalLabel}>{LBL.children}</Text><Text style={styles.personalValue}>{children_}</Text></>)}
            {has(driversLicense) && (<><Text style={styles.personalLabel}>{LBL.license}</Text><Text style={styles.personalValue}>{driversLicense}</Text></>)}
          </SideSection>
        )}
      </View>

      {/* ===== RIGHT CONTENT ===== */}
      <View style={styles.right}>
        {/* Name + position header */}
        <Text style={styles.name}>{name}</Text>
        {has(position) && <Text style={styles.position}>{position}</Text>}
        <View style={styles.topRule} />

        {/* Profile / Summary */}
        {has(summary) && (
          <View style={styles.sectionWrap}>
            <Text style={styles.h2}>{TITLE.summary}</Text>
            <View style={[styles.accentRule, { backgroundColor: accent }]} />
            <Text style={styles.paragraph}>{summary}</Text>
          </View>
        )}

        {/* Experience */}
        {experience.length > 0 && (
          <View style={styles.sectionWrap}>
            <Text style={styles.h2}>{TITLE.experience}</Text>
            <View style={[styles.accentRule, { backgroundColor: accent }]} />
            {experience.map((ex, i) => {
              const pos = tr(ex.position);
              const comp = tr(ex.company);
              const loc = tr(ex.location);
              const isCurrent = ex.currentlyWorking;
              const periodText = buildPeriod(ex.startDate || ex.start, ex.endDate || ex.end, isCurrent, ex.period, presentWord);
              const pts = bulletsPlus(ex.responsibilities || ex.description);

              return (
                <View key={ex.id || i} style={styles.xpItem} break={false}>
                  <View style={styles.xpRow}>
                    <Text style={styles.xpTitle}>{pos || '—'}</Text>
                    {has(periodText) && (
                      <Text style={isCurrent ? styles.xpPeriodCurrent : styles.xpPeriod}>{periodText}</Text>
                    )}
                  </View>
                  <Text style={styles.xpCompany}>
                    {[comp, loc].filter(Boolean).join(' \u2022 ')}
                  </Text>
                  {pts.length > 0 && (
                    <View style={styles.xpBullets}>
                      {pts.map((line, j) => (
                        <View key={j} style={styles.bulletRow}>
                          <Text style={styles.bulletDot}>{'\u2022'}</Text>
                          <Text style={styles.bulletText}>{line}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Skills (right side) */}
        {skills.length > 0 && (
          <View style={styles.sectionWrap}>
            <Text style={styles.h2}>{TITLE.skills}</Text>
            <View style={[styles.accentRule, { backgroundColor: accent }]} />
            <View style={styles.skillsWrap}>
              {skills.map((sk, i) => (
                <Text key={`r_${sk}_${i}`} style={styles.skill}>{tr(sk)}</Text>
              ))}
            </View>
          </View>
        )}

        {/* Education */}
        {education.length > 0 && (
          <View style={styles.sectionWrap}>
            <Text style={styles.h2}>{TITLE.education}</Text>
            <View style={[styles.accentRule, { backgroundColor: accent }]} />
            {education.map((ed, i) => {
              const degree = tr(ed.level || ed.degree);
              const inst = tr(ed.institution || ed.university);
              const spec = tr(ed.specialization || ed.major);
              const year = tr(ed.year || ed.period);
              return (
                <View key={ed.id || i} style={styles.eduItem}>
                  <View style={styles.eduRow}>
                    <Text style={styles.eduTitle}>{degree || inst || '—'}</Text>
                    {has(year) && <Text style={styles.eduPeriod}>{year}</Text>}
                  </View>
                  {has(degree) && has(inst) && (
                    <Text style={styles.eduInst}>{inst}{has(year) && !tr(ed.year) ? '' : ''}</Text>
                  )}
                  {has(spec) && <Text style={styles.eduSpec}>{spec}</Text>}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}
