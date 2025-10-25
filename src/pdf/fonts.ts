import { Font } from "@react-pdf/renderer";

// Аккуратно строим URL с учётом Vite BASE_URL (напр. "/ai-resume-builder/")
const BASE =
  (typeof window !== "undefined" && (window.__vite_base__ || window.base)) ||
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.BASE_URL) ||
  "/";

const src = (p) => `${BASE.replace(/\/+$/, "/")}fonts/${p}`;

// Inter — основной гротеск (поддерживает кириллицу)
Font.register({
  family: "Inter",
  fonts: [
    { src: src("Inter/Inter-Regular.ttf"), fontStyle: "normal", fontWeight: 400 },
    { src: src("Inter/Inter-Medium.ttf"),  fontStyle: "normal", fontWeight: 500 },
    { src: src("Inter/Inter-Bold.ttf"),    fontStyle: "normal", fontWeight: 700 },
  ],
  fallback: true,
});

// NotoSerif — для заголовков/альтернатив
Font.register({
  family: "NotoSerif",
  fonts: [
    { src: src("NotoSerif/NotoSerif-Regular.ttf"), fontStyle: "normal", fontWeight: 400 },
    { src: src("NotoSerif/NotoSerif-Bold.ttf"),    fontStyle: "normal", fontWeight: 700 },
  ],
  fallback: true,
});

// ВАЖНО: отключаем автоперенос — иначе иногда портит кириллицу
Font.registerHyphenationCallback((word) => [word]);

// Можно импортировать и использовать как "значение по умолчанию"
export const DEFAULT_PDF_FONT = "Inter";
export {};
