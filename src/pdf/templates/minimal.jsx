import React from "react";
import { View, Text, StyleSheet, Image } from "@react-pdf/renderer";

/* ---------- utils ---------- */
const safe = (v) => (v !== undefined && v !== null ? String(v) : "");
function splitNameTwoLines(fullName) {
  const parts = (safe(fullName).trim() || "Ваше имя").split(/\s+/);
  if (parts.length === 1) return [parts[0].toUpperCase(), ""];
  if (parts.length === 2) return [parts[0].toUpperCase(), parts[1].toUpperCase()];
  return [parts[0].toUpperCase(), parts.slice(1).join(" ").toUpperCase()];
}
const fmtMonth = (m) => {
  if (!m) return "";
  const t = /^(\d{4})-(\d{2})$/.exec(m);
  if (!t) return m;
  const [, y, mo] = t;
  return `${mo}.${y}`;
};
const expPeriod = (e) => {
  const start = fmtMonth(e?.startDate);
  const end = e?.currentlyWorking ? "настоящее время" : fmtMonth(e?.endDate);
  if (!start && !end) return "";
  return `${start || "—"} — ${end || "—"}`;
};
const joinList = (v, sep = " • ") =>
  Array.isArray(v) ? v.map((x) => safe(x)).filter(Boolean).join(sep) : safe(v);

function normalizeInline(str) {
  let s = safe(str).replace(/\u00A0/g, " ").replace(/[ \t]+/g, " ").trim();
  s = s
    .replace(/\s*—\s*/g, " — ")
    .replace(/\s*-\s*/g, " — ")
    .replace(/;\s*/g, ". ")
    .replace(/\s+,\s+/g, ", ")
    .replace(/\s+\.\s+/g, ". ")
    .replace(/\s+\.\s*$/g, ".");
  s = s.replace(/реения/gi, "решения");
  return s.trim();
}
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
/* uniq helper for merging bullet sources */
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
        <View key={i} style={s.bulletItem}>
          <Text style={s.bulletMarker}>•</Text>
          <Text style={s.bulletText}>{t}</Text>
        </View>
      ))}
    </View>
  );
};

/* ---------- Template ---------- */
export default function Minimal({ profile = {}, theme = { accent: "#16a34a" } }) {
  const s = buildStyles();

  const fullName = safe(profile.fullName) || "Ваше имя";
  const [nameLine1, nameLine2] = splitNameTwoLines(fullName);
  const position =
    safe(profile.position) ||
    safe(profile.targetPosition) ||
    safe(profile.title) ||
    "";

  const hasContacts = profile.email || profile.phone || profile.location;

  const languages = Array.isArray(profile.languages) ? profile.languages : [];
  const uniqueLangs = [];
  const seen = new Set();
  for (const l of languages) {
    const nm = typeof l === "string" ? l : safe(l?.language || l?.name);
    const lv = typeof l === "string" ? "" : safe(l?.level);
    const key = `${nm}__${lv}`.toLowerCase();
    if (!seen.has(key) && nm) {
      seen.add(key);
      uniqueLangs.push({ language: nm, level: lv });
    }
  }

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
              {profile.email ? <Text style={s.contact}>{safe(profile.email)}</Text> : null}
              {profile.phone ? <Text style={s.contact}>{safe(profile.phone)}</Text> : null}
              {profile.location ? <Text style={s.contact}>{safe(profile.location)}</Text> : null}
            </View>
          ) : null}
        </View>

        <View style={s.headerRight}>
          {profile.photoUrl ? <Image src={safe(profile.photoUrl)} style={s.photo} /> : null}
        </View>
      </View>

      {/* Две колонки */}
      <View style={s.main}>
        {/* Левый сайдбар */}
        <View style={s.leftCol}>
          <Text style={s.sectionTitle}>Профиль</Text>

          {safe(profile.summary) ? (
            <View style={s.aboutBlock}>
              <Text style={s.aboutTitle}>О себе</Text>
              {toBullets(profile.summary).length > 1 ? (
                <BulletList items={toBullets(profile.summary)} s={s} />
              ) : (
                <Text style={s.aboutText}>{normalizeInline(profile.summary)}</Text>
              )}
            </View>
          ) : null}

          {Array.isArray(profile.skills) && profile.skills.length ? (
            <View style={s.aboutBlock}>
              <Text style={s.aboutTitle}>Навыки</Text>
              <Text style={s.skills}>{joinList(profile.skills, " • ")}</Text>
            </View>
          ) : null}

          {uniqueLangs.length ? (
            <View style={s.aboutBlock}>
              <Text style={s.aboutTitle}>Языки</Text>
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
              <Text style={s.sectionTitle}>Опыт</Text>
              {profile.experience.map((e, idx) => {
                const pos = safe(e?.position);
                const org = safe(e?.company);
                const where = safe(e?.location);
                const period = safe(e?.period) || expPeriod(e);
                const metaRow = [period, where].filter(Boolean).join(" • ");

                // ✅ приоритет: уже подготовленные bullets из оболочки → иначе собираем из responsibilities/description
                const mergedBullets =
                  (Array.isArray(e?.bullets) && e.bullets.length
                    ? e.bullets
                    : uniqKeep([
                        ...toBullets(e?.responsibilities),
                        ...toBullets(e?.description),
                      ]));

                return (
                  <View key={e?.id || idx} style={s.entryBox}>
                    <Text style={s.pos}>{pos || "Должность"}</Text>
                    {org ? <Text style={s.org}>{org}</Text> : null}
                    {metaRow ? <Text style={s.date}>{metaRow}</Text> : null}

                    {mergedBullets.length > 0 ? (
                      <View>
                        <Text style={s.subLabel}>Обязанности и достижения</Text>
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
              <Text style={s.sectionTitle}>Образование</Text>
              {profile.education.map((ed, idx) => {
                const degreeOrLevel = safe(ed?.degree || ed?.level);
                const spec = safe(ed?.specialization || ed?.major);
                const title = [degreeOrLevel, spec].filter(Boolean).join(" • ");

                const inst = safe(ed?.institution || ed?.university);
                const where = safe(ed?.location);
                const period =
                  safe(ed?.period) ||
                  safe(ed?.year) ||
                  [fmtMonth(ed?.startDate), fmtMonth(ed?.endDate)].filter(Boolean).join(" — ");
                const metaRow = [period, where].filter(Boolean).join(" • ");

                const eduBullets = uniqKeep([
                  ...toBullets(ed?.description),
                ]);

                return (
                  <View key={ed?.id || idx} style={s.entryBox}>
                    <Text style={s.pos}>{title || "Степень / Специальность"}</Text>
                    {inst ? <Text style={s.org}>{inst}</Text> : null}
                    {metaRow ? <Text style={s.date}>{metaRow}</Text> : null}

                    {eduBullets.length > 0 ? (
                      <BulletList items={eduBullets} s={s} />
                    ) : null}

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
