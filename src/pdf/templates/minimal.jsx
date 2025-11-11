// src/pdf/templates/minimal.jsx
import React from "react";
import { View, Text, StyleSheet, Image } from "@react-pdf/renderer";

/* ---------- utils ---------- */
const safe = (v) => (v !== undefined && v !== null ? String(v) : "");

const trim = (v) => safe(v).trim();
const has = (v) => !!trim(v);

function splitNameTwoLines(fullName, lang = "ru") {
  const placeholder =
    lang === "kk" ? "СІЗДІҢ АТЫҢЫЗ" : lang === "en" ? "YOUR NAME" : "ВАШЕ ИМЯ";
  const parts = (trim(fullName) || placeholder).split(/\s+/);
  if (parts.length === 1) return [parts[0].toUpperCase(), ""];
  if (parts.length === 2) return [parts[0].toUpperCase(), parts[1].toUpperCase()];
  return [parts[0].toUpperCase(), parts.slice(1).join(" ").toUpperCase()];
}

/** YYYY-MM -> MM.YYYY (fallback: return as-is) */
const fmtMonth = (m) => {
  const v = trim(m);
  if (!v) return "";
  const t = /^(\d{4})-(\d{2})$/.exec(v);
  if (!t) return v;
  const [, y, mo] = t;
  return `${mo}.${y}`;
};

const joinList = (v, sep = " • ") =>
  Array.isArray(v) ? v.map((x) => safe(x)).filter(Boolean).join(sep) : trim(v);

function normalizeInline(str) {
  let s = safe(str).replace(/\u00A0/g, " ").replace(/[ \t]+/g, " ").trim();
  s = s
    .replace(/\s*—\s*/g, " — ")
    .replace(/\s*-\s*/g, " — ")
    .replace(/;\s*/g, ". ")
    .replace(/\s+,\s+/g, ", ")
    .replace(/\s+\.\s+/g, ". ")
    .replace(/\s+\.\s*$/g, ".");
  // частая опечатка
  s = s.replace(/реения/gi, "решения");
  return s.trim();
}

/** Разбить на пункты: по строкам, маркерам и по предложениям (с заглавной) */
function toBullets(text) {
  const raw = safe(text);
  if (!raw) return [];
  let lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[\u2022\-–•]\s*/, "").trim())
    .flatMap((l) => l.split(/(?<=[.!?])\s+(?=[А-ЯA-ZЁ])/));
  lines = lines.map(normalizeInline).filter((l) => l.length > 0);
  const seen = new Set();
  const out = [];
  for (const l of lines) {
    const key = l.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(l);
    }
  }
  return out;
}

/** uniq helper for merging bullet sources */
function uniqKeep(arr) {
  const out = [];
  const seen = new Set();
  for (const v of Array.isArray(arr) ? arr : []) {
    const s = trim(v);
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

/* ---------- i18n helpers ---------- */
const pick = (obj, key, fb) => (obj && obj[key]) || fb;

function i18nStrings(lang, L = {}, F = {}) {
  const S = L.sections || {};
  const fields = L.fields || F || {};

  return {
    // sections
    personal: pick(S, "personal", lang === "kk" ? "Жеке ақпарат" : lang === "en" ? "Personal Info" : "Личная информация"),
    summary: pick(S, "summary", lang === "kk" ? "Өзім туралы" : lang === "en" ? "Summary" : "О себе"),
    skills: pick(S, "skills", lang === "kk" ? "Дағдылар" : lang === "en" ? "Skills" : "Навыки"),
    languages: pick(S, "languages", lang === "kk" ? "Тілдер" : lang === "en" ? "Languages" : "Языки"),
    experience: pick(S, "experience", lang === "kk" ? "Жұмыс тәжірибесі" : lang === "en" ? "Work Experience" : "Опыт"),
    education: pick(S, "education", lang === "kk" ? "Білім" : lang === "en" ? "Education" : "Образование"),
    contacts: pick(S, "contacts", lang === "kk" ? "Байланыс" : lang === "en" ? "Contacts" : "Контакты"),

    // labels
    bulletsTitle:
      L.experienceBullets ||
      (lang === "kk"
        ? "Міндеттер мен жетістіктер"
        : lang === "en"
        ? "Responsibilities & Achievements"
        : "Обязанности и достижения"),
    degreeSpec:
      L.degreeSpec ||
      (lang === "kk" ? "Дәреже / Мамандық" : lang === "en" ? "Degree / Major" : "Степень / Специальность"),
    positionFallback: lang === "kk" ? "Лауазым" : lang === "en" ? "Position" : "Должность",

    // personal field names
    age: pick(fields, "age", lang === "kk" ? "Жасы" : lang === "en" ? "Age" : "Возраст"),
    maritalStatus: pick(fields, "maritalStatus", lang === "kk" ? "Отбасылық жағдайы" : lang === "en" ? "Marital status" : "Семейное положение"),
    children: pick(fields, "children", lang === "kk" ? "Балалар" : lang === "en" ? "Children" : "Дети"),
    driversLicense: pick(fields, "driversLicense", lang === "kk" ? "Жүргізуші куәлігі" : lang === "en" ? "Driver’s license" : "Водительские права"),

    present:
      L.present ||
      (lang === "kk" ? "Қазір" : lang === "en" ? "Present" : "настоящее время"),
  };
}

/* ---------- стили под образец ---------- */
function buildStyles() {
  const colorText = "#2F2F2E";
  const colorIcon = "#A1AAB3";
  const colorPosition = "#2B3A45";
  const muted = "#6B7280";
  const border = "#E5E7EB";

  return StyleSheet.create({
    page: {
      fontFamily: "Inter",
      fontSize: 11,
      color: colorText,
      padding: 28,
      lineHeight: 1.45,
      flexDirection: "column",
    },

    /* Шапка */
    header: { flexDirection: "row", marginBottom: 10 },
    headerLeft: { width: "70%", paddingRight: 12 },
    headerRight: { width: "30%", alignItems: "flex-end" },

    fullNameLine: { fontFamily: "NotoSerif", fontSize: 20, fontWeight: 700, lineHeight: 1.2 },
    fullNameLine2: { fontFamily: "NotoSerif", fontSize: 20, fontWeight: 700, lineHeight: 1.2, marginTop: 2 },

    position: {
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderStyle: "solid",
      borderColor: colorIcon,
      paddingTop: 8,
      paddingBottom: 8,
      fontSize: 10,
      fontWeight: 600,
      color: colorPosition,
      textTransform: "uppercase",
      marginTop: 8,
    },

    photo: { width: 140, height: 140, borderRadius: 999 },

    contacts: { marginTop: 10, marginBottom: 0 },
    contact: { fontSize: 10.5, marginBottom: 4, color: colorText },

    /* Колонки */
    main: { flexDirection: "row", alignItems: "flex-start" },
    leftCol: { width: "30%", paddingRight: "5%" },
    rightCol: { width: "65%" },

    /* Заголовки секций */
    sectionTitle: {
      fontFamily: "NotoSerif",
      fontWeight: 700,
      textTransform: "uppercase",
      fontSize: 11,
      paddingBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: colorIcon,
      borderBottomStyle: "solid",
      marginBottom: 10,
      marginTop: 0,
    },

    /* Левый сайдбар */
    aboutBlock: { marginBottom: 12 },
    aboutTitle: { fontSize: 10, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 },
    aboutText: { fontSize: 10, lineHeight: 1.35, textAlign: "left" },
    skills: { fontSize: 10, lineHeight: 1.35, textAlign: "left" },
    langLine: { fontSize: 10, lineHeight: 1.35, marginBottom: 2 },
    smallLine: { fontSize: 10, lineHeight: 1.35, marginBottom: 2, color: "#374151" },

    /* Маркированные списки */
    bulletItem: { flexDirection: "row", alignItems: "flex-start", marginBottom: 2 },
    bulletMarker: { width: 10, fontSize: 10, lineHeight: 1.35, textAlign: "center", marginTop: 1 },
    bulletText: { flex: 1, fontSize: 10, lineHeight: 1.35, textAlign: "left" },

    /* Правые секции */
    entryBox: { marginBottom: 10 },
    pos: { fontSize: 10.5, fontWeight: 700, lineHeight: 1.33 },
    org: { fontSize: 10, fontWeight: 600, lineHeight: 1.33 },
    date: { fontSize: 9, color: muted, lineHeight: 1.33, marginTop: 2, marginBottom: 4 },
    text: { fontSize: 10, lineHeight: 1.5, textAlign: "justify" },

    subLabel: { fontSize: 10, fontWeight: 600, textTransform: "uppercase", marginTop: 2, marginBottom: 2 },

    hrThin: { height: 1, backgroundColor: border, marginTop: 6 },
  });
}

const BulletList = ({ items, s }) => {
  if (!items?.length) return null;
  return (
    <View>
      {items.map((t, i) => (
        <View key={i} style={s.bulletItem} wrap={false}>
          <Text style={s.bulletMarker}>•</Text>
          <Text style={s.bulletText}>{t}</Text>
        </View>
      ))}
    </View>
  );
};

/* ---------- Template ---------- */
/**
 * Props (aligned with other templates):
 * - profile      : normalized profile from ResumePDF (backwards-compatible with raw)
 * - theme        : { accent }
 * - labels       : i18n labels from ResumePDF (sections.*, present, fields.*)
 * - t, lang      : translator and current language (optional)
 * - hints, flags : optional hints (unused here)
 * - pageInsets   : optional (unused here)
 */
export default function MinimalTemplate({
  profile = {},
  theme = { accent: "#16a34a" },
  labels = {},
  t, // not required, we use labels + lang
  lang = "ru",
}) {
  const s = buildStyles();
  const I = i18nStrings(lang, labels);

  const fullName = safe(profile.fullName);
  const [nameLine1, nameLine2] = splitNameTwoLines(fullName, lang);
  const position =
    trim(profile.position) ||
    trim(profile.targetPosition) ||
    trim(profile.title) ||
    "";

  const email = trim(profile.email);
  const phone = trim(profile.phone);
  const location = trim(profile.location);
  const hasContacts = email || phone || location;

  const age = trim(profile.age);
  const maritalStatus = trim(profile.maritalStatus);
  const children = trim(profile.children);
  const driversLicense = trim(profile.driversLicense || profile.driverLicense);

  // languages (unique)
  const languages = Array.isArray(profile.languages) ? profile.languages : [];
  const uniqueLangs = [];
  const seen = new Set();
  for (const l of languages) {
    const nm = typeof l === "string" ? trim(l) : trim(l?.language || l?.name || l?.lang);
    const lv = typeof l === "string" ? "" : trim(l?.level || l?.proficiency);
    const key = `${nm}__${lv}`.toLowerCase();
    if (!seen.has(key) && nm) {
      seen.add(key);
      uniqueLangs.push({ language: nm, level: lv });
    }
  }

  // helper: employment period (prefer prepared, else compute)
  const expPeriod = (e) => {
    const pre = trim(e?.period);
    if (pre) return pre;
    const start = fmtMonth(e?.startDate || e?.start);
    const end = e?.currentlyWorking ? I.present : fmtMonth(e?.endDate || e?.end);
    if (!start && !end) return "";
    return `${start || "—"} — ${end || "—"}`;
  };

  return (
    <View style={s.page}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.fullNameLine}>{nameLine1}</Text>
          {nameLine2 ? <Text style={s.fullNameLine2}>{nameLine2}</Text> : null}
          {position ? <Text style={s.position}>{position}</Text> : null}

          {hasContacts ? (
            <View style={s.contacts}>
              {email ? <Text style={s.contact}>{email}</Text> : null}
              {phone ? <Text style={s.contact}>{phone}</Text> : null}
              {location ? <Text style={s.contact}>{location}</Text> : null}
            </View>
          ) : null}
        </View>

        <View style={s.headerRight}>
          {profile.photoUrl || profile.photo ? (
            <Image src={trim(profile.photoUrl || profile.photo)} style={s.photo} />
          ) : null}
        </View>
      </View>

      {/* Две колонки */}
      <View style={s.main}>
        {/* Левый сайдбар */}
        <View style={s.leftCol}>
          <Text style={s.sectionTitle}>{I.personal}</Text>

          {/* О себе / Summary */}
          {has(profile.summary) ? (
            <View style={s.aboutBlock}>
              <Text style={s.aboutTitle}>{I.summary}</Text>
              {toBullets(profile.summary).length > 1 ? (
                <BulletList items={toBullets(profile.summary)} s={s} />
              ) : (
                <Text style={s.aboutText}>{normalizeInline(profile.summary)}</Text>
              )}
            </View>
          ) : null}

          {/* Доп. персональные поля — по строкам, если заполнены */}
          {has(age) || has(maritalStatus) || has(children) || has(driversLicense) ? (
            <View style={s.aboutBlock}>
              {has(age) && <Text style={s.smallLine}>{I.age}: {age}</Text>}
              {has(maritalStatus) && <Text style={s.smallLine}>{I.maritalStatus}: {maritalStatus}</Text>}
              {has(children) && <Text style={s.smallLine}>{I.children}: {children}</Text>}
              {has(driversLicense) && <Text style={s.smallLine}>{I.driversLicense}: {driversLicense}</Text>}
            </View>
          ) : null}

          {/* Навыки */}
          {Array.isArray(profile.skills) && profile.skills.length ? (
            <View style={s.aboutBlock}>
              <Text style={s.aboutTitle}>{I.skills}</Text>
              <Text style={s.skills}>{joinList(profile.skills, " • ")}</Text>
            </View>
          ) : null}

          {/* Языки */}
          {uniqueLangs.length ? (
            <View style={s.aboutBlock}>
              <Text style={s.aboutTitle}>{I.languages}</Text>
              {uniqueLangs.map((lng, i) => (
                <Text key={i} style={s.langLine}>
                  {lng.language}{lng.level ? ` — ${lng.level}` : ""}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        {/* Правая колонка */}
        <View style={s.rightCol}>
          {/* Опыт */}
          {Array.isArray(profile.experience) && profile.experience.length ? (
            <View>
              <Text style={s.sectionTitle}>{I.experience}</Text>
              {profile.experience.map((e, idx) => {
                const pos = trim(e?.position || e?.title || e?.role);
                const org = trim(e?.company || e?.employer);
                const where = trim(e?.location || e?.city);
                const period = expPeriod(e);
                const metaRow = [period, where].filter(Boolean).join(" • ");

                // приоритет: уже подготовленные bullets → иначе из responsibilities/description
                const mergedBullets =
                  (Array.isArray(e?.bullets) && e.bullets.length
                    ? e.bullets
                    : uniqKeep([
                        ...toBullets(e?.responsibilities),
                        ...toBullets(e?.description),
                      ]));

                return (
                  <View key={e?.id || idx} style={s.entryBox}>
                    <Text style={s.pos}>{pos || I.positionFallback}</Text>
                    {org ? <Text style={s.org}>{org}</Text> : null}
                    {metaRow ? <Text style={s.date}>{metaRow}</Text> : null}

                    {mergedBullets.length > 0 ? (
                      <View>
                        <Text style={s.subLabel}>{I.bulletsTitle}</Text>
                        <BulletList items={mergedBullets} s={s} />
                      </View>
                    ) : null}

                    <View style={s.hrThin} />
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* Образование */}
          {Array.isArray(profile.education) && profile.education.length ? (
            <View style={{ marginTop: 4 }}>
              <Text style={s.sectionTitle}>{I.education}</Text>
              {profile.education.map((ed, idx) => {
                const degreeOrLevel = trim(ed?.degree || ed?.level);
                const spec = trim(ed?.specialization || ed?.major);
                const title = [degreeOrLevel, spec].filter(Boolean).join(" • ") || I.degreeSpec;

                const inst = trim(ed?.institution || ed?.university);
                const where = trim(ed?.location);
                const period =
                  trim(ed?.period) ||
                  trim(ed?.year) ||
                  [fmtMonth(ed?.startDate), fmtMonth(ed?.endDate)].filter(Boolean).join(" — ");
                const metaRow = [period, where].filter(Boolean).join(" • ");

                const eduBullets = uniqKeep(toBullets(ed?.description));

                return (
                  <View key={ed?.id || idx} style={s.entryBox}>
                    <Text style={s.pos}>{title}</Text>
                    {inst ? <Text style={s.org}>{inst}</Text> : null}
                    {metaRow ? <Text style={s.date}>{metaRow}</Text> : null}

                    {eduBullets.length > 0 ? <BulletList items={eduBullets} s={s} /> : null}

                    <View style={s.hrThin} />
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
