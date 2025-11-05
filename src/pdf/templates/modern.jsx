import React from 'react';
import { View, Text, StyleSheet, Image } from '@react-pdf/renderer';
import { pdfLabels } from '../pdfLabels';

/**
 * Modern Resume Template
 * 
 * Двухколоночный дизайн:
 * - Левая колонка (темная): фото, контакты, личная информация, образование, языки
 * - Правая колонка: имя, должность, о себе, опыт работы, навыки
 * 
 * Props:
 * - profile: объект с данными резюме
 * - theme: { accent: string } - цвет акцента
 * - language: 'en' | 'kk' | 'ru' - язык документа
 */

/* ===== Helpers ===== */
const s = (v) => (v == null ? '' : String(v));
const t = (v) => s(v).trim();
const has = (v) => !!t(v);

// Нормализация многострочного текста
const normalizeMultiline = (v) =>
  s(v)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .join('\n')
    .trim();

/**
 * Преобразование текста в список пунктов (bullets)
 * Поддерживает маркеры: •, -, *, 1., 2. и т.д.
 */
function bulletsPlus(text) {
  if (!text) return [];
  
  const lines = normalizeMultiline(text)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const out = [];
  let current = '';

  const isMarker = (line) => /^([•\-\*\u2022\u2023\u25E6\u2043]|\d+[.)])\s+/.test(line);

  for (const line of lines) {
    if (isMarker(line)) {
      if (current.trim()) out.push(current.trim());
      const cleaned = line
        .replace(/^([•\-\*\u2022\u2023\u25E6\u2043]|\d+[.)])\s+/, '')
        .replace(/^[-–—]\s*/, '');
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

/**
 * Форматирование периода работы/учебы
 */
const formatPeriod = (start, end, current, fallback, labels) => {
  if (has(fallback)) return t(fallback);
  
  const st = t(start);
  const en = current ? labels.present : t(end);
  
  if (!st && !en) return '';
  return `${st || '—'} — ${en || '—'}`;
};

/**
 * Форматирование даты в формате YYYY-MM
 */
const formatMonth = (dateStr, language = 'ru') => {
  if (!dateStr) return '';
  
  const match = /^(\d{4})-(\d{2})/.exec(dateStr);
  if (!match) return dateStr;
  
  const [, year, month] = match;
  
  const monthNames = {
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    kk: ['Қаң', 'Ақп', 'Нау', 'Сәу', 'Мам', 'Мау', 'Шіл', 'Там', 'Қыр', 'Қаз', 'Қар', 'Жел'],
    ru: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
  };
  
  const monthIndex = parseInt(month, 10) - 1;
  const monthName = (monthNames[language] || monthNames.ru)[monthIndex];
  
  return `${monthName} ${year}`;
};

/* ===== Styles ===== */
const LEFT_WIDTH = 180;
const PAGE_PADDING = 40;

const styles = StyleSheet.create({
  page: {
    padding: PAGE_PADDING,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Inter',
  },
  
  layout: {
    flexDirection: 'row',
    gap: 20,
  },
  
  /* Левая колонка */
  left: {
    width: LEFT_WIDTH,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 16,
    paddingTop: 20,
  },
  
  /* Правая колонка */
  right: {
    flex: 1,
    paddingTop: 4,
  },

  /* Фото профиля */
  avatarWrap: {
    alignItems: 'center',
    marginBottom: 18,
  },
  
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    objectFit: 'cover',
    borderWidth: 3,
    borderColor: '#FFFFFF33',
  },

  /* Секции левой колонки */
  sideSection: {
    marginBottom: 16,
  },
  
  sideTitle: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    color: '#F3F4F6',
  },
  
  sideDivider: {
    height: 1,
    backgroundColor: '#FFFFFF22',
    marginBottom: 10,
  },
  
  sideRow: {
    marginBottom: 8,
  },
  
  sideLabel: {
    fontSize: 8,
    color: '#9CA3AF',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  sideText: {
    fontSize: 9.5,
    color: '#FFFFFF',
    lineHeight: 1.3,
  },
  
  sideTextSmall: {
    fontSize: 8.5,
    color: '#E5E7EB',
    lineHeight: 1.3,
  },

  /* Образование в левой колонке */
  eduItem: {
    marginBottom: 10,
  },
  
  eduDegree: {
    fontSize: 9.5,
    fontWeight: 600,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  
  eduDetails: {
    fontSize: 8,
    color: '#D1D5DB',
    lineHeight: 1.3,
  },

  /* Языки в левой колонке */
  langItem: {
    marginBottom: 8,
  },
  
  langName: {
    fontSize: 9.5,
    fontWeight: 600,
    color: '#FFFFFF',
    marginBottom: 1,
  },
  
  langLevel: {
    fontSize: 8,
    color: '#D1D5DB',
  },

  /* Шапка правой колонки */
  name: {
    fontSize: 28,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#111827',
    letterSpacing: 1,
    marginBottom: 4,
  },
  
  position: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: 500,
    marginBottom: 16,
  },
  
  topDivider: {
    height: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
  },

  /* Секции правой колонки */
  section: {
    marginBottom: 18,
  },
  
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
    color: '#111827',
  },
  
  accentBar: {
    height: 3,
    width: 40,
    marginBottom: 12,
  },

  /* О себе */
  summaryText: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#374151',
    textAlign: 'justify',
  },

  /* Опыт работы */
  experienceItem: {
    marginBottom: 14,
  },
  
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  
  experienceLeft: {
    flex: 1,
  },
  
  experienceTitle: {
    fontSize: 11.5,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 2,
  },
  
  experienceCompany: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 1,
  },
  
  experiencePeriod: {
    fontSize: 9,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  
  bulletsList: {
    marginTop: 6,
    paddingLeft: 4,
  },
  
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  
  bulletDot: {
    fontSize: 10,
    lineHeight: 1.4,
    color: '#374151',
    width: 12,
  },
  
  bulletText: {
    fontSize: 10,
    lineHeight: 1.4,
    color: '#374151',
    flex: 1,
  },

  /* Навыки */
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  
  skillBadge: {
    fontSize: 9,
    color: '#1F2937',
    backgroundColor: '#F3F4F6',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  /* Образование (детальное) */
  educationItem: {
    marginBottom: 12,
  },
  
  educationDegree: {
    fontSize: 11.5,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 2,
  },
  
  educationInstitution: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 2,
  },
  
  educationField: {
    fontSize: 9.5,
    color: '#374151',
    lineHeight: 1.3,
  },
});

/* ===== Компоненты ===== */

/**
 * Секция левой колонки
 */
const SideSection = ({ title, children }) => {
  if (!children) return null;
  
  return (
    <View style={styles.sideSection}>
      <Text style={styles.sideTitle}>{title}</Text>
      <View style={styles.sideDivider} />
      {children}
    </View>
  );
};

/**
 * Строка данных в левой колонке
 */
const SideRow = ({ label, text, small }) => {
  if (!has(text)) return null;
  
  return (
    <View style={styles.sideRow}>
      {has(label) && <Text style={styles.sideLabel}>{label}</Text>}
      <Text style={small ? styles.sideTextSmall : styles.sideText}>
        {t(text)}
      </Text>
    </View>
  );
};

/**
 * Секция правой колонки
 */
const Section = ({ title, accentColor, children }) => {
  if (!children) return null;
  
  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      {children}
    </View>
  );
};

/* ===== Основной компонент ===== */
export default function ModernTemplate({ profile, theme, language = 'ru' }) {
  const labels = pdfLabels[language] || pdfLabels.ru;
  const accentColor = (theme && theme.accent) || '#3B82F6';

  // Извлечение данных профиля
  const name = t(profile?.fullName) || labels.defaultName || 'FULL NAME';
  const position = t(profile?.position || profile?.title || profile?.professionalTitle);
  
  const email = t(profile?.email);
  const phone = t(profile?.phone);
  const location = t(profile?.location);
  const website = t(profile?.website);
  const linkedin = t(profile?.linkedin);
  
  const age = t(profile?.age);
  const maritalStatus = t(profile?.maritalStatus);
  const children = t(profile?.children);
  const driversLicense = t(profile?.driversLicense);
  
  const summary = normalizeMultiline(profile?.summary);
  
  const experience = Array.isArray(profile?.experience) ? profile.experience : [];
  const education = Array.isArray(profile?.education) ? profile.education : [];
  const languages = Array.isArray(profile?.languages) ? profile.languages : [];
  const skills = Array.isArray(profile?.skills)
    ? profile.skills.filter((x) => has(x)).slice(0, 24)
    : [];

  const photoUrl = profile?.photoUrl || profile?.photo;

  return (
    <View style={styles.page}>
      <View style={styles.layout}>
        {/* ===== ЛЕВАЯ КОЛОНКА ===== */}
        <View style={styles.left}>
          {/* Фото */}
          {has(photoUrl) && (
            <View style={styles.avatarWrap}>
              <Image src={photoUrl} style={styles.avatar} />
            </View>
          )}

          {/* Контакты */}
          {(has(email) || has(phone) || has(location) || has(website) || has(linkedin)) && (
            <SideSection title={labels.contact}>
              <SideRow text={location} />
              <SideRow text={phone} />
              <SideRow text={email} />
              {has(website) && <SideRow text={website} />}
              {has(linkedin) && <SideRow text={linkedin} />}
            </SideSection>
          )}

          {/* Личная информация */}
          {(has(age) || has(maritalStatus) || has(children) || has(driversLicense)) && (
            <SideSection title={labels.personalInfo || 'Personal Info'}>
              {has(age) && (
                <SideRow 
                  label={labels.age || 'Age'} 
                  text={age} 
                />
              )}
              {has(maritalStatus) && (
                <SideRow 
                  label={labels.maritalStatus || 'Status'} 
                  text={maritalStatus} 
                  small 
                />
              )}
              {has(children) && (
                <SideRow 
                  label={labels.children || 'Children'} 
                  text={children} 
                  small 
                />
              )}
              {has(driversLicense) && (
                <SideRow 
                  label={labels.license || 'License'} 
                  text={driversLicense} 
                  small 
                />
              )}
            </SideSection>
          )}

          {/* Образование (краткое) */}
          {education.length > 0 && (
            <SideSection title={labels.education}>
              {education.map((edu, index) => {
                const degree = t(edu.level || edu.degree);
                const institution = t(edu.institution || edu.university);
                const field = t(edu.specialization || edu.major || edu.field);
                const year = t(edu.year || edu.graduationYear);

                return (
                  <View key={edu.id || index} style={styles.eduItem}>
                    {has(degree) && (
                      <Text style={styles.eduDegree}>{degree}</Text>
                    )}
                    {has(year) && (
                      <Text style={styles.eduDetails}>{year}</Text>
                    )}
                    {has(institution) && (
                      <Text style={styles.eduDetails}>{institution}</Text>
                    )}
                    {has(field) && (
                      <Text style={styles.eduDetails}>{field}</Text>
                    )}
                  </View>
                );
              })}
            </SideSection>
          )}

          {/* Языки */}
          {languages.length > 0 && (
            <SideSection title={labels.languages}>
              {languages.map((lang, index) => {
                const langName = t(lang?.language || lang?.name);
                const langLevel = t(lang?.level || lang?.proficiency);

                return (
                  <View key={lang.id || index} style={styles.langItem}>
                    {has(langName) && (
                      <Text style={styles.langName}>{langName}</Text>
                    )}
                    {has(langLevel) && (
                      <Text style={styles.langLevel}>{langLevel}</Text>
                    )}
                  </View>
                );
              })}
            </SideSection>
          )}
        </View>

        {/* ===== ПРАВАЯ КОЛОНКА ===== */}
        <View style={styles.right}>
          {/* Шапка */}
          <Text style={styles.name}>{name}</Text>
          {has(position) && <Text style={styles.position}>{position}</Text>}
          <View style={styles.topDivider} />

          {/* О себе */}
          {has(summary) && (
            <Section title={labels.summary} accentColor={accentColor}>
              <Text style={styles.summaryText}>{summary}</Text>
            </Section>
          )}

          {/* Опыт работы */}
          {experience.length > 0 && (
            <Section title={labels.experience} accentColor={accentColor}>
              {experience.map((exp, index) => {
                const expPosition = t(exp.position || exp.title);
                const company = t(exp.company || exp.employer);
                const expLocation = t(exp.location);
                
                const periodText = formatPeriod(
                  formatMonth(exp.startDate || exp.start, language),
                  formatMonth(exp.endDate || exp.end, language),
                  exp.currentlyWorking || exp.current,
                  exp.period,
                  labels
                );

                const bullets = bulletsPlus(
                  exp.responsibilities || exp.description || exp.duties
                );

                return (
                  <View key={exp.id || index} style={styles.experienceItem} wrap={false}>
                    <View style={styles.experienceHeader}>
                      <View style={styles.experienceLeft}>
                        {has(expPosition) && (
                          <Text style={styles.experienceTitle}>{expPosition}</Text>
                        )}
                        <Text style={styles.experienceCompany}>
                          {has(company) ? company : ''}
                          {has(company) && has(expLocation) ? ' • ' : ''}
                          {has(expLocation) ? expLocation : ''}
                        </Text>
                      </View>
                      {has(periodText) && (
                        <Text style={styles.experiencePeriod}>{periodText}</Text>
                      )}
                    </View>

                    {bullets.length > 0 && (
                      <View style={styles.bulletsList}>
                        {bullets.map((bullet, bulletIndex) => (
                          <View key={bulletIndex} style={styles.bulletItem}>
                            <Text style={styles.bulletDot}>•</Text>
                            <Text style={styles.bulletText}>{bullet}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </Section>
          )}

          {/* Навыки */}
          {skills.length > 0 && (
            <Section title={labels.skills} accentColor={accentColor}>
              <View style={styles.skillsContainer}>
                {skills.map((skill, index) => (
                  <Text key={`skill-${index}`} style={styles.skillBadge}>
                    {t(skill)}
                  </Text>
                ))}
              </View>
            </Section>
          )}

          {/* Образование (детальное - опционально) */}
          {education.length > 0 && (
            <Section title={labels.educationDetails || labels.education} accentColor={accentColor}>
              {education.map((edu, index) => {
                const degree = t(edu.level || edu.degree);
                const institution = t(edu.institution || edu.university);
                const field = t(edu.specialization || edu.major || edu.field);
                const year = t(edu.year || edu.graduationYear);
                const gpa = t(edu.gpa);

                return (
                  <View key={edu.id || index} style={styles.educationItem} wrap={false}>
                    {has(degree) && (
                      <Text style={styles.educationDegree}>{degree}</Text>
                    )}
                    <Text style={styles.educationInstitution}>
                      {has(institution) ? institution : ''}
                      {has(institution) && has(year) ? ' • ' : ''}
                      {has(year) ? year : ''}
                    </Text>
                    {has(field) && (
                      <Text style={styles.educationField}>{field}</Text>
                    )}
                    {has(gpa) && (
                      <Text style={styles.educationField}>GPA: {gpa}</Text>
                    )}
                  </View>
                );
              })}
            </Section>
          )}

          {/* Сертификаты (если есть) */}
          {Array.isArray(profile?.certifications) && profile.certifications.length > 0 && (
            <Section title={labels.certifications} accentColor={accentColor}>
              {profile.certifications.map((cert, index) => (
                <View key={index} style={styles.educationItem} wrap={false}>
                  <Text style={styles.educationDegree}>
                    {t(cert.name || cert.title)}
                  </Text>
                  <Text style={styles.educationInstitution}>
                    {has(cert.issuer) ? t(cert.issuer) : ''}
                    {has(cert.issuer) && has(cert.date) ? ' • ' : ''}
                    {has(cert.date) ? t(cert.date) : ''}
                  </Text>
                </View>
              ))}
            </Section>
          )}

          {/* Проекты (если есть) */}
          {Array.isArray(profile?.projects) && profile.projects.length > 0 && (
            <Section title={labels.projects} accentColor={accentColor}>
              {profile.projects.map((project, index) => {
                const projectBullets = bulletsPlus(project.description);
                
                return (
                  <View key={index} style={styles.experienceItem} wrap={false}>
                    <Text style={styles.experienceTitle}>
                      {t(project.name || project.title)}
                    </Text>
                    {has(project.role) && (
                      <Text style={styles.experienceCompany}>{t(project.role)}</Text>
                    )}
                    {projectBullets.length > 0 && (
                      <View style={styles.bulletsList}>
                        {projectBullets.map((bullet, bulletIndex) => (
                          <View key={bulletIndex} style={styles.bulletItem}>
                            <Text style={styles.bulletDot}>•</Text>
                            <Text style={styles.bulletText}>{bullet}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </Section>
          )}
        </View>
      </View>
    </View>
  );
}