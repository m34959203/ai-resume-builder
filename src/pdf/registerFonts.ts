import { jsPDF } from 'jspdf';

// грузим TTF как base64 из /public/fonts
async function toBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// регистрируем Inter (достаточно Regular+Bold; Medium — по желанию)
export async function registerInter(doc: jsPDF) {
  const reg = await toBase64('/fonts/Inter-Regular.ttf');
  const bold = await toBase64('/fonts/Inter-Bold.ttf');

  doc.addFileToVFS('Inter-Regular.ttf', reg);
  doc.addFont('Inter-Regular.ttf', 'Inter', 'normal');

  doc.addFileToVFS('Inter-Bold.ttf', bold);
  doc.addFont('Inter-Bold.ttf', 'Inter', 'bold');

  // если нужен Medium — раскомментируй:
  // const med = await toBase64('/fonts/Inter-Medium.ttf');
  // doc.addFileToVFS('Inter-Medium.ttf', med);
  // doc.addFont('Inter-Medium.ttf', 'Inter', 'medium');
}

// (опционально) регистрируем Noto Serif как запасной набор
export async function registerNotoSerif(doc: jsPDF) {
  const reg = await toBase64('/fonts/NotoSerif-Regular.ttf');
  const bold = await toBase64('/fonts/NotoSerif-Bold.ttf');

  doc.addFileToVFS('NotoSerif-Regular.ttf', reg);
  doc.addFont('NotoSerif-Regular.ttf', 'NotoSerif', 'normal');

  doc.addFileToVFS('NotoSerif-Bold.ttf', bold);
  doc.addFont('NotoSerif-Bold.ttf', 'NotoSerif', 'bold');
}
