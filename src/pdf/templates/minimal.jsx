import React from "react";
import { View, Text, StyleSheet, Image } from "@react-pdf/renderer";
import { pdfLabels } from '../pdfLabels';

/* ===== Утилиты ===== */

const safe = (v) => (v !== undefined && v !== null ? String(v) : "");

const trim = (v) => safe(v).trim();

const has = (v) => !!trim(v);

/**
 * Разделение имени на две строки
 */
function splitNameTwoLines(fullName) {
  const parts = (safe(fullName).trim() || "FULL NAME").split(/\s+/);
  
  if (parts.length === 1) {
    return [parts[0].toUpperCase(), ""];
  }
  
  if (parts.length === 2) {
    return [parts[0].toUpperCase(), parts[1].toUpperCase()];
  }
  
  // Имя на первой строке, остальное на второй
  return [parts[0].toUpperCase(), parts.slice(1).join(" ").toUpperCase()];
}

/**
 * Форматирование даты в зависимости от языка
 */
const formatMonth = (dateStr, language = 'ru') => {
  if (!dateStr) return "";
  
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

/**
 * Форматирование периода работы/учебы
 */
const formatPeriod = (entry, labels, language) => {
  const start = formatMonth(entry?.startDate || entry?.start, language);
  const end = entry?.currentlyWorking || entry?.current 
    ? labels.present 
    : formatMonth(entry?.endDate || entry?.end, language);
  
  if (!start && !end) return "";
  
  return `${start || "—"} — ${end || "—"}`;
};

/**
 * Объединение массива в строку с разделителем
 */
const joinList = (arr, separator = " • ") => {
  if (!Array.isArray(arr)) return safe(arr);
  return arr.map((x) => safe(x)).filter(Boolean).join(separator);
};

/**
 * Нормализация строки (убираем лишние пробелы, исправляем пунктуацию)
 */
function normalizeInline(str) {
  let s = safe(str)
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
  
  s = s
    .replace(/\s*—\s*/g, " — ")
    .replace(/\s*-\s*/g, " — ")
    .replace(/;\s*/g, ". ")
    .replace(/\s+,\s+/g, ", ")
    .replace(/\s+\.\s+/g, ". ")
    .replace(/\s+\.\s*$/g, ".");
  
  return s.trim();
}

/**
 * Преобразование текста в список пунктов (bullets)
 */
function toBullets(text) {
  const raw = safe(text);
  if (!raw) return [];
  
  // Разбиваем на строки
  let lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[\u2022\-–—•*]\s*/, "").trim())
    .flatMap((l) => {
      // Разбиваем длинные строки на предложения
      return l.split(/(?<=[.!?])\s+(?=[А-ЯA-ZЁ])/);
    });
  
  // Нормализуем и фильтруем
  lines = lines
    .map(normalizeInline)
    .filter((l) => l.length > 0);
  
  // Убираем дубликаты
  const seen = new Set();
  const out = [];
  
  for (const line of lines) {
    const key = line.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(line);
    }
  }
  
  return out;
}

/**
 * Уникальные элементы массива
 */
function uniqKeep(arr) {
  const out = [];
  const seen = new Set();
  
  for (const v of Array.isArray(arr) ? arr : []) {
    const s = safe(v).trim();
    if (!s) continue;
    
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    
    seen.add(k);
    out.push(s);
  }
  
  return out;
}

/* ===== Стили ===== */

function buildStyles(accentColor = "#16a34a") {
  const colorText = "#1F2937";
  const colorIcon = "#9CA3AF";
  const colorPosition = "#374151";
  const colorMuted = "#6B7280";
  const colorBorder = "#E5E7EB";
  const colorLight = "#F9FAFB";

  return StyleSheet.create({
    page: {
      fontFamily: "Inter",
      fontSize: 10.5,
      color: colorText,
      padding: 32,
      lineHeight: 1.5,
      flexDirection: "column",
      backgroundColor: "#FFFFFF",
    },

    /* Шапка */
    header: {
      flexDirection: "row",
      marginBottom: 16,
      paddingBottom: 16,
      borderBottomWidth: 2,
      borderBottomColor: accentColor,
    },
    
    headerLeft: {
      width: "68%",
      paddingRight: 16,
      justifyContent: "center",
    },
    
    headerRight: {
      width: "32%",
      alignItems: "flex-end",
      justifyContent: "center",
    },

    fullNameLine: {
      fontFamily: "NotoSerif",
      fontSize: 24,
      fontWeight: 700,
      lineHeight: 1.15,
      color: colorText,
      letterSpacing: 0.5,
    },
    
    fullNameLine2: {
      fontFamily: "NotoSerif",
      fontSize: 24,
      fontWeight: 700,
      lineHeight: 1.15,
      marginTop: 2,
      color: colorText,
      letterSpacing: 0.5,
    },

    position: {
      fontSize: 11,
      fontWeight: 600,
      color: colorPosition,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginTop: 8,
      paddingTop: 8,
      paddingBottom: 8,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colorIcon,
    },

    photo: {
      width: 120,
      height: 120,
      borderRadius: 60,
      objectFit: "cover",
      borderWidth: 3,
      borderColor: accentColor,
    },

    contacts: {
      marginTop: 12,
    },
    
    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
    },
    
    contactIcon: {
      fontSize: 9,
      color: colorIcon,
      width: 14,
      marginRight: 6,
    },
    
    contactText: {
      fontSize: 10,
      color: colorText,
    },

    /* Основной layout */
    main: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 20,
    },
    
    leftCol: {
      width: "32%",
    },
    
    rightCol: {
      width: "68%",
    },

    /* Заголовки секций */
    sectionTitle: {
      fontFamily: "NotoSerif",
      fontWeight: 700,
      textTransform: "uppercase",
      fontSize: 12,
      color: colorText,
      paddingBottom: 6,
      borderBottomWidth: 2,
      borderBottomColor: accentColor,
      marginBottom: 12,
      marginTop: 0,
      letterSpacing: 1,
    },

    /* Левая колонка - блоки */
    sideBlock: {
      marginBottom: 16,
      backgroundColor: colorLight,
      padding: 10,
      borderRadius: 4,
    },
    
    sideBlockTitle: {
      fontSize: 10,
      fontWeight: 700,
      textTransform: "uppercase",
      marginBottom: 6,
      color: colorPosition,
      letterSpacing: 0.5,
    },
    
    sideText: {
      fontSize: 9.5,
      lineHeight: 1.4,
      textAlign: "left",
      color: colorText,
    },
    
    skillsList: {
      fontSize: 9.5,
      lineHeight: 1.5,
      textAlign: "left",
      color: colorText,
    },
    
    langRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    
    langName: {
      fontSize: 9.5,
      fontWeight: 600,
      color: colorText,
    },
    
    langLevel: {
      fontSize: 8.5,
      color: colorMuted,
    },

    /* Буллеты */
    bulletItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 3,
    },
    
    bulletMarker: {
      width: 12,
      fontSize: 10,
      lineHeight: 1.4,
      textAlign: "center",
      color: accentColor,
      fontWeight: 700,
    },
    
    bulletText: {
      flex: 1,
      fontSize: 9.5,
      lineHeight: 1.4,
      textAlign: "left",
      color: colorText,
    },

    /* Правая колонка - записи */
    entryBox: {
      marginBottom: 14,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colorBorder,
    },
    
    entryTitle: {
      fontSize: 11,
      fontWeight: 700,
      lineHeight: 1.3,
      color: colorText,
    },
    
    entryOrganization: {
      fontSize: 10,
      fontWeight: 600,
      lineHeight: 1.3,
      color: colorPosition,
      marginTop: 2,
    },
    
    entryMeta: {
      fontSize: 9,
      color: colorMuted,
      lineHeight: 1.3,
      marginTop: 2,
      marginBottom: 6,
      fontStyle: "italic",
    },
    
    entryText: {
      fontSize: 9.5,
      lineHeight: 1.5,
      textAlign: "justify",
      color: colorText,
    },
    
    subLabel: {
      fontSize: 9,
      fontWeight: 700,
      textTransform: "uppercase",
      marginTop: 6,
      marginBottom: 4,
      color: colorPosition,
      letterSpacing: 0.3,
    },

    /* Дополнительная информация */
    infoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 8,
    },
    
    infoItem: {
      fontSize: 9,
      color: colorText,
      paddingVertical: 3,
      paddingHorizontal: 8,
      backgroundColor: colorLight,
      borderRadius: 4,
    },
  });
}

/* ===== Компоненты ===== */

/**
 * Компонент списка с буллетами
 */
const BulletList = ({ items, styles }) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return null;
  }
  
  return (
    <View>
      {items.map((text, index) => (
        <View key={index} style={styles.bulletItem} wrap={false}>
          <Text style={styles.bulletMarker}>•</Text>
          <Text style={styles.bulletText}>{text}</Text>
        </View>
      ))}
    </View>
  );
};

/**
 * Компонент блока в левой колонке
 */
const SideBlock = ({ title, children, styles }) => {
  if (!children) return null;
  
  return (
    <View style={styles.sideBlock} wrap={false}>
      {title && <Text style={styles.sideBlockTitle}>{title}</Text>}
      {children}
    </View>
  );
};

/**
 * Компонент записи (опыт/образование)
 */
const Entry = ({ 
  title, 
  organization, 
  meta, 
  description, 
  bullets, 
  styles,
  bulletsTitle 
}) => {
  return (
    <View style={styles.entryBox} wrap={false}>
      {has(title) && (
        <Text style={styles.entryTitle}>{title}</Text>
      )}
      
      {has(organization) && (
        <Text style={styles.entryOrganization}>{organization}</Text>
      )}
      
      {has(meta) && (
        <Text style={styles.entryMeta}>{meta}</Text>
      )}
      
      {has(description) && (
        <Text style={styles.entryText}>{description}</Text>
      )}
      
      {bullets && bullets.length > 0 && (
        <View>
          {bulletsTitle && (
            <Text style={styles.subLabel}>{bulletsTitle}</Text>
          )}
          <BulletList items={bullets} styles={styles} />
        </View>
      )}
    </View>
  );
};

/* ===== Основной компонент ===== */

export default function MinimalTemplate({ 
  profile = {}, 
  theme = { accent: "#16a34a" },
  language = "ru" 
}) {
  const labels = pdfLabels[language] || pdfLabels.ru;
  const accentColor = theme?.accent || "#16a34a";
  const styles = buildStyles(accentColor);

  // Извлечение данных
  const fullName = safe(profile.fullName) || labels.defaultName || "FULL NAME";
  const [nameLine1, nameLine2] = splitNameTwoLines(fullName);
  
  const position = safe(
    profile.position || 
    profile.targetPosition || 
    profile.title || 
    profile.professionalTitle
  );

  const email = safe(profile.email);
  const phone = safe(profile.phone);
  const location = safe(profile.location);
  const website = safe(profile.website);
  const linkedin = safe(profile.linkedin);

  const age = safe(profile.age);
  const maritalStatus = safe(profile.maritalStatus);
  const children = safe(profile.children);
  const driversLicense = safe(profile.driversLicense);

  const summary = safe(profile.summary);
  const photoUrl = safe(profile.photoUrl || profile.photo);

  // Массивы данных
  const experience = Array.isArray(profile.experience) ? profile.experience : [];
  const education = Array.isArray(profile.education) ? profile.education : [];
  const skills = Array.isArray(profile.skills) ? profile.skills.filter(has) : [];
  const languages = Array.isArray(profile.languages) ? profile.languages : [];
  const certifications = Array.isArray(profile.certifications) ? profile.certifications : [];

  // Уникальные языки
  const uniqueLanguages = [];
  const seenLangs = new Set();
  
  for (const lang of languages) {
    const langName = typeof lang === "string" ? lang : safe(lang?.language || lang?.name);
    const langLevel = typeof lang === "string" ? "" : safe(lang?.level || lang?.proficiency);
    const key = `${langName}__${langLevel}`.toLowerCase();
    
    if (!seenLangs.has(key) && langName) {
      seenLangs.add(key);
      uniqueLanguages.push({ language: langName, level: langLevel });
    }
  }

  const hasContacts = has(email) || has(phone) || has(location) || has(website) || has(linkedin);
  const hasPersonalInfo = has(age) || has(maritalStatus) || has(children) || has(driversLicense);

  return (
    <View style={styles.page}>
      {/* ===== ШАПКА ===== */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.fullNameLine}>{nameLine1}</Text>
          {nameLine2 && <Text style={styles.fullNameLine2}>{nameLine2}</Text>}
          
          {has(position) && (
            <Text style={styles.position}>{position}</Text>
          )}

          {hasContacts && (
            <View style={styles.contacts}>
              {has(email) && (
                <View style={styles.contactRow}>
                  <Text style={styles.contactIcon}>✉</Text>
                  <Text style={styles.contactText}>{email}</Text>
                </View>
              )}
              
              {has(phone) && (
                <View style={styles.contactRow}>
                  <Text style={styles.contactIcon}>☎</Text>
                  <Text style={styles.contactText}>{phone}</Text>
                </View>
              )}
              
              {has(location) && (
                <View style={styles.contactRow}>
                  <Text style={styles.contactIcon}>📍</Text>
                  <Text style={styles.contactText}>{location}</Text>
                </View>
              )}
              
              {has(website) && (
                <View style={styles.contactRow}>
                  <Text style={styles.contactIcon}>🌐</Text>
                  <Text style={styles.contactText}>{website}</Text>
                </View>
              )}
              
              {has(linkedin) && (
                <View style={styles.contactRow}>
                  <Text style={styles.contactIcon}>in</Text>
                  <Text style={styles.contactText}>{linkedin}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
          {has(photoUrl) && (
            <Image src={photoUrl} style={styles.photo} />
          )}
        </View>
      </View>

      {/* ===== ОСНОВНОЙ КОНТЕНТ ===== */}
      <View style={styles.main}>
        {/* ЛЕВАЯ КОЛОНКА */}
        <View style={styles.leftCol}>
          <Text style={styles.sectionTitle}>{labels.profile || 'Profile'}</Text>

          {/* О себе */}
          {has(summary) && (
            <SideBlock title={labels.summary} styles={styles}>
              {toBullets(summary).length > 1 ? (
                <BulletList items={toBullets(summary)} styles={styles} />
              ) : (
                <Text style={styles.sideText}>{normalizeInline(summary)}</Text>
              )}
            </SideBlock>
          )}

          {/* Навыки */}
          {skills.length > 0 && (
            <SideBlock title={labels.skills} styles={styles}>
              <Text style={styles.skillsList}>{joinList(skills, " • ")}</Text>
            </SideBlock>
          )}

          {/* Языки */}
          {uniqueLanguages.length > 0 && (
            <SideBlock title={labels.languages} styles={styles}>
              {uniqueLanguages.map((lang, index) => (
                <View key={index} style={styles.langRow}>
                  <Text style={styles.langName}>{lang.language}</Text>
                  {has(lang.level) && (
                    <Text style={styles.langLevel}>{lang.level}</Text>
                  )}
                </View>
              ))}
            </SideBlock>
          )}

          {/* Личная информация */}
          {hasPersonalInfo && (
            <SideBlock title={labels.personalInfo || 'Personal Info'} styles={styles}>
              {has(age) && (
                <Text style={styles.sideText}>
                  {labels.age || 'Age'}: {age}
                </Text>
              )}
              {has(maritalStatus) && (
                <Text style={styles.sideText}>
                  {labels.maritalStatus || 'Status'}: {maritalStatus}
                </Text>
              )}
              {has(children) && (
                <Text style={styles.sideText}>
                  {labels.children || 'Children'}: {children}
                </Text>
              )}
              {has(driversLicense) && (
                <Text style={styles.sideText}>
                  {labels.license || 'License'}: {driversLicense}
                </Text>
              )}
            </SideBlock>
          )}
        </View>

        {/* ПРАВАЯ КОЛОНКА */}
        <View style={styles.rightCol}>
          {/* Опыт работы */}
          {experience.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>{labels.experience}</Text>
              
              {experience.map((exp, index) => {
                const expPosition = safe(exp?.position || exp?.title);
                const company = safe(exp?.company || exp?.employer);
                const expLocation = safe(exp?.location);
                
                const period = safe(exp?.period) || formatPeriod(exp, labels, language);
                const metaRow = [period, expLocation].filter(Boolean).join(" • ");

                // Буллеты: используем готовые или генерируем
                const bullets = Array.isArray(exp?.bullets) && exp.bullets.length > 0
                  ? exp.bullets
                  : uniqKeep([
                      ...toBullets(exp?.responsibilities),
                      ...toBullets(exp?.description),
                      ...toBullets(exp?.duties),
                    ]);

                return (
                  <Entry
                    key={exp?.id || index}
                    title={expPosition || labels.position}
                    organization={company}
                    meta={metaRow}
                    bullets={bullets}
                    bulletsTitle={labels.responsibilities || 'Responsibilities'}
                    styles={styles}
                  />
                );
              })}
            </View>
          )}

          {/* Образование */}
          {education.length > 0 && (
            <View style={{ marginTop: experience.length > 0 ? 8 : 0 }}>
              <Text style={styles.sectionTitle}>{labels.education}</Text>
              
              {education.map((edu, index) => {
                const degree = safe(edu?.degree || edu?.level);
                const field = safe(edu?.specialization || edu?.major || edu?.field);
                const title = [degree, field].filter(Boolean).join(" • ");

                const institution = safe(edu?.institution || edu?.university);
                const eduLocation = safe(edu?.location);
                const year = safe(edu?.year || edu?.graduationYear);
                
                const period = safe(edu?.period) || year || [
                  formatMonth(edu?.startDate, language),
                  formatMonth(edu?.endDate, language)
                ].filter(Boolean).join(" — ");
                
                const metaRow = [period, eduLocation].filter(Boolean).join(" • ");

                const eduBullets = uniqKeep([
                  ...toBullets(edu?.description),
                  ...toBullets(edu?.achievements),
                ]);

                return (
                  <Entry
                    key={edu?.id || index}
                    title={title || labels.degree}
                    organization={institution}
                    meta={metaRow}
                    bullets={eduBullets}
                    styles={styles}
                  />
                );
              })}
            </View>
          )}

          {/* Сертификаты */}
          {certifications.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.sectionTitle}>{labels.certifications}</Text>
              
              {certifications.map((cert, index) => {
                const certName = safe(cert?.name || cert?.title);
                const issuer = safe(cert?.issuer || cert?.organization);
                const date = safe(cert?.date || cert?.year);
                const metaRow = [issuer, date].filter(Boolean).join(" • ");

                return (
                  <Entry
                    key={index}
                    title={certName}
                    meta={metaRow}
                    description={safe(cert?.description)}
                    styles={styles}
                  />
                );
              })}
            </View>
          )}

          {/* Проекты */}
          {Array.isArray(profile?.projects) && profile.projects.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.sectionTitle}>{labels.projects}</Text>
              
              {profile.projects.map((project, index) => {
                const projectName = safe(project?.name || project?.title);
                const role = safe(project?.role);
                const tech = Array.isArray(project?.technologies)
                  ? project.technologies.join(", ")
                  : "";
                
                const projectBullets = toBullets(project?.description);

                return (
                  <Entry
                    key={index}
                    title={projectName}
                    organization={role}
                    meta={tech}
                    bullets={projectBullets}
                    styles={styles}
                  />
                );
              })}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}