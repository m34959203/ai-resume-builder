// src/components/ResumePDF.jsx
import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import "../pdf/fonts";
import { DEFAULT_PDF_FONT } from "../pdf/fonts";
import TEMPLATES from "../pdf/templates";
// ⚠️ Для PDF используем прямой доступ к словарю, без React-хуков
import { translations } from "../locales/translations";

/* ---------- language normalize ---------- */
const SUPPORTED_LANGS = ["ru", "kk", "en"];
const NORM_MAP = {
  kz: "kk",
  "kk-kz": "kk",
  "ru-ru": "ru",
  "en-us": "en",
};
function normLang(input) {
  const raw = String(input || "").trim().toLowerCase();
  if (!raw) return "ru";
  const mapped = NORM_MAP[raw] || raw.split(/[-_]/)[0];
  return SUPPORTED_LANGS.includes(mapped) ? mapped : "ru";
}

/* ---------- i18n helpers (без react hooks) ---------- */
const getByPath = (obj, path) =>
  String(path || "")
    .split(".")
    .reduce((acc, k) => (acc && Object.prototype.hasOwnProperty.call(acc, k) ? acc[k] : undefined), obj);

const format = (str, params) =>
  !params || typeof str !== "string"
    ? str
    : str.replace(/\{(\w+)\}/g, (_, k) =>
        Object.prototype.hasOwnProperty.call(params, k) ? String(params[k]) : `{${k}}`
      );

function makeT(lang = "ru") {
  const l = normLang(lang);
  const dict = translations?.[l] || translations?.ru || {};
  return (key, params) => {
    if (!key) return "";
    let val = getByPath(dict, key);
    if (val == null && translations?.ru) val = getByPath(translations.ru, key);
    if (val == null && translations?.en) val = getByPath(translations.en, key);
    if (typeof val === "string") return format(val, params);
    return key;
  };
}

/* ---------- utils ---------- */
const safe = (v) => (v === undefined || v === null ? "" : String(v));
const trim = (v) => safe(v).trim();
const hasText = (x) => !!trim(x);

/** Нормализация переносов строк и хвостовых пробелов */
function normalizeMultiline(v) {
  const s = safe(v).replace(/\r\n?/g, "\n");
  return s
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""))
    .join("\n")
    .trim();
}

/** Выделяем пункты списка из многострочного текста */
function extractBullets(text) {
  const lines = normalizeMultiline(text)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const bullets = [];
  for (const line of lines) {
    const m = /^([•\-\*\u2022]|\d+[.)])\s+(.+)$/.exec(line);
    bullets.push(m ? m[2].trim() : line);
  }
  return bullets;
}

/** Уникальные значения (без регистра), с тримом */
function uniqCaseInsensitive(arr = []) {
  const out = [];
  const seen = new Set();
  for (const item of arr) {
    const s = trim(item);
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

/** YYYY-MM / YYYY-MM-DD -> MM.YYYY, YYYY -> YYYY */
function fmtMonth(val) {
  const v = trim(val);
  if (!v) return "";
  let m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(v);
  if (m) return `${m[2]}.${m[1]}`;
  m = /^(\d{4})-(0[1-9]|1[0-2])-\d{2}$/.exec(v);
  if (m) return `${m[2]}.${m[1]}`;
  m = /^(\d{4})$/.exec(v);
  if (m) return m[1];
  return v;
}

/** Темы: цвет + включение общей шапки/футера оболочки */
const THEMES = {
  minimal: { accent: "#16a34a", header: false, footer: false },
  modern: { accent: "#1E90FF", header: false, footer: true },
};

/** Нормализация профиля под шаблоны */
function normalizeProfile(input, { currentLabel = "настоящее время" } = {}) {
  const p = input || {};

  // Базовые поля
  const fullName = trim(p.fullName);
  const position = trim(p.position || p.title || p.professionalTitle);
  const email = trim(p.email);
  const phone = trim(p.phone);
  const location = trim(p.location);

  // Доп.личные поля
  const age = trim(p.age);
  const maritalStatus = trim(p.maritalStatus);
  const children = trim(p.children);
  const driversLicense = trim(p.driversLicense || p.driverLicense);

  // Саммари
  const summaryRaw = normalizeMultiline(p.summary);
  const summaryBullets = extractBullets(summaryRaw);

  // Фото
  const photoUrl = p.photoUrl || p.photo || null;

  // Навыки / компетенции
  const skills = uniqCaseInsensitive(
    Array.isArray(p.keyCompetencies) && p.keyCompetencies.length
      ? p.keyCompetencies
      : Array.isArray(p.skills)
      ? p.skills
      : []
  );

  // Опыт
  const experience = Array.isArray(p.experience)
    ? p.experience
        .map((e) => {
          if (!e || typeof e !== "object") return null;
          const anyVal =
            hasText(e.position) ||
            hasText(e.company) ||
            hasText(e.responsibilities) ||
            hasText(e.description) ||
            hasText(e.startDate) ||
            hasText(e.endDate) ||
            hasText(e.period);
          if (!anyVal) return null;

          const start = fmtMonth(e.startDate || e.start || e.dateStart);
          const end = e.currentlyWorking ? currentLabel : fmtMonth(e.endDate || e.end || e.dateEnd);
          const period = trim(e.period) || (!start && !end ? "" : `${start || "—"} — ${end || "—"}`);

          const responsibilities = normalizeMultiline(e.responsibilities || e.description);
          const description = normalizeMultiline(e.description || e.responsibilities);
          const bullets = extractBullets(responsibilities || description);

          return {
            id: e.id || undefined,
            position: trim(e.position || e.title || e.role),
            company: trim(e.company || e.employer || e.org),
            location: trim(e.location || e.city),
            responsibilities,
            description,
            bullets,
            startDate: safe(e.startDate || e.start || e.dateStart),
            endDate: safe(e.endDate || e.end || e.dateEnd),
            currentlyWorking: !!e.currentlyWorking,
            period,
          };
        })
        .filter(Boolean)
    : [];

  // Образование
  const education = Array.isArray(p.education)
    ? p.education
        .map((ed) => {
          if (!ed || typeof ed !== "object") return null;
          const anyVal =
            hasText(ed.institution || ed.university || ed.school) ||
            hasText(ed.level || ed.degree) ||
            hasText(ed.year) ||
            hasText(ed.specialization || ed.major) ||
            hasText(ed.startDate) ||
            hasText(ed.endDate) ||
            hasText(ed.period);
          if (!anyVal) return null;

          const degree = trim(ed.level || ed.degree);
          const institution = trim(ed.institution || ed.university || ed.school);
          const specialization = trim(ed.specialization || ed.major || ed.faculty || ed.program);
          const period =
            trim(ed.year) ||
            trim(ed.period) ||
            [fmtMonth(ed.startDate), fmtMonth(ed.endDate)].filter(Boolean).join(" — ");

          return {
            id: ed.id || undefined,
            degree,
            institution,
            specialization,
            year: safe(ed.year),
            startDate: safe(ed.startDate),
            endDate: safe(ed.endDate),
            period: trim(period),
            description: normalizeMultiline(ed.description),
          };
        })
        .filter(Boolean)
    : [];

  // Языки
  const langSeen = new Set();
  const languages = (Array.isArray(p.languages) ? p.languages : [])
    .map((l) =>
      typeof l === "string"
        ? { language: trim(l), level: "" }
        : { language: trim(l?.language || l?.name || l?.lang), level: trim(l?.level || l?.proficiency) }
    )
    .filter((l) => {
      const key = `${l.language}__${l.level}`.toLowerCase();
      if (!l.language || langSeen.has(key)) return false;
      langSeen.add(key);
      return true;
    });

  // Флаги для шаблонов
  const hasExperience = experience.length > 0;
  const hasEducation = education.length > 0;
  const studentMode = !hasExperience && hasEducation;

  const hints = { hideEmptyExperience: true, preferEducationFirst: studentMode };

  return {
    fullName,
    position,
    email,
    phone,
    location,
    age,
    maritalStatus,
    children,
    driversLicense,
    summary: summaryRaw,
    summaryBullets,
    photoUrl,
    skills,
    experience,
    education,
    languages,
    flags: { hasExperience, hasEducation, studentMode },
    hints,
    ...p,
  };
}

/* ---------- константы оболочки ---------- */
const COLORS = {
  blue: "#1E90FF",
  gray500: "#6B7280",
  blueLightText: "#EAF2FF",
  white: "#FFFFFF",
};
const INSET_X = 26; // горизонтальные поля
const HEADER_H = 84; // высота общей шапки
const FOOTER_H = 24; // высота общего футера

/* ---------- стили оболочки ---------- */
const styles = StyleSheet.create({
  page: {
    // ВАЖНО: верх/низ задаём динамически, здесь только базовое
    paddingHorizontal: INSET_X,
    fontSize: 10,
  },
  root: {
    fontFamily: DEFAULT_PDF_FONT || "Inter",
    color: "#111827",
  },
  // Шапка (fixed)
  headerWrap: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 14,
    paddingHorizontal: INSET_X,
  },
  headerBar: {
    backgroundColor: COLORS.blue,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  headName: {
    fontSize: 18,
    color: COLORS.white,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  headTitle: {
    fontSize: 11,
    color: COLORS.blueLightText,
    marginTop: 2,
  },
  // Футер (fixed)
  footer: {
    position: "fixed",
    left: INSET_X,
    right: INSET_X,
    bottom: 10,
    textAlign: "right",
    color: COLORS.gray500,
    fontSize: 9,
  },
});

/* ---------- Header / Footer ---------- */
function Header({ profile, accent }) {
  const name = trim(profile?.fullName) || "ИМЯ ФАМИЛИЯ";
  const title = trim(profile?.position || profile?.title || profile?.professionalTitle);
  return (
    <View style={styles.headerWrap} fixed>
      <View style={{ ...styles.headerBar, backgroundColor: accent || COLORS.blue }}>
        <Text style={styles.headName}>{name}</Text>
        {title ? <Text style={styles.headTitle}>{title}</Text> : null}
      </View>
    </View>
  );
}

const Footer = () => (
  <Text
    style={styles.footer}
    fixed
    render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
  />
);

/* ---------- PDF оболочка ---------- */
/**
 * Многоязычный PDF. ВАЖНО: передавайте lang из UI:
 *   pdf(<ResumePDF profile={exportProfile} template={selectedTemplate} lang={lang} />)
 */
export default function ResumePDF({
  profile = {},
  template: templateProp = "minimal",
  lang: langProp = "ru",
}) {
  // ✅ сначала нормализуем, затем строим t()
  const lang = normLang(langProp);
  const t = makeT(lang);

  // Локализованные метки разделов для шаблонов
  const labels = {
    personal: t("pdf.sections.personal"),
    contacts: t("pdf.sections.contacts"),
    summary: t("pdf.sections.summary"),
    experience: t("pdf.sections.experience"),
    education: t("pdf.sections.education"),
    skills: t("pdf.sections.skills"),
    projects: t("pdf.sections.projects"),
    certificates: t("pdf.sections.certificates"),
    courses: t("pdf.sections.courses"),
    languages: t("pdf.sections.languages"),
    links: t("pdf.sections.links"),
    achievements: t("pdf.sections.achievements"),
  };

  const currentLabel =
    t("pdf.meta.present") ||
    t("builder.experience.current") ||
    (lang === "kk" ? "қазіргі уақыт" : lang === "en" ? "Present" : "настоящее время");

  const tplKey = typeof templateProp === "string" ? templateProp : "minimal";
  const TemplateComp =
    (TEMPLATES && TEMPLATES[tplKey]) || (TEMPLATES && TEMPLATES.minimal) || null;
  const theme = THEMES[tplKey] || THEMES.minimal;

  const normalized = normalizeProfile(profile, { currentLabel });
  const fullName = normalized.fullName;

  const subjectI18n = lang === "kk" ? "Түйіндеме" : lang === "en" ? "Resume" : "Резюме";
  const titleSuffix = lang === "kk" ? " — түйіндеме" : lang === "en" ? " — resume" : " — резюме";
  const docTitle = fullName ? `${fullName}${titleSuffix}` : subjectI18n;

  // Динамические поля страницы под шапку/футер
  const showHeader = !!theme.header;
  const showFooter = !!theme.footer;
  const padTop = showHeader ? HEADER_H + 12 : 26;
  const padBottom = showFooter ? FOOTER_H + 12 : 26;
  const pageInsets = { header: padTop, footer: padBottom, horizontal: INSET_X };

  // Метаданные документа
  const meta = {
    title: docTitle,
    author: fullName || "Candidate",
    subject: subjectI18n,
    keywords: (normalized.skills || []).join(", "),
    producer: "AI Resume Builder",
    creator: "AI Resume Builder",
  };

  return (
    <Document {...meta}>
      <Page size="A4" style={{ ...styles.page, paddingTop: padTop, paddingBottom: padBottom }} wrap>
        {/* Фиксированные колонтитулы (включаем по теме) */}
        {showHeader && <Header profile={normalized} accent={theme.accent} />}
        {showFooter && <Footer />}

        {/* Контент */}
        <View style={styles.root}>
          {TemplateComp ? (
            <TemplateComp
              profile={normalized}
              theme={theme}
              labels={labels}
              // передаём t/lang, если шаблон их использует
              t={t}
              lang={lang}
              studentMode={normalized.flags?.studentMode}
              flags={normalized.flags}
              hints={normalized.hints}
              pageInsets={pageInsets}
            />
          ) : null}
        </View>

        {/* Dev-подпись активного шаблона (только в dev) */}
        {process.env.NODE_ENV !== "production" ? (
          <Text
            style={{
              position: "absolute",
              bottom: 6,
              left: INSET_X,
              fontSize: 8,
              color: "#9CA3AF",
            }}
          >
            tpl: {tplKey}
          </Text>
        ) : null}
      </Page>
    </Document>
  );
}
