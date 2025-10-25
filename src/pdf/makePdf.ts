import { jsPDF } from 'jspdf';
import { registerInter /*, registerNotoSerif */ } from './registerFonts';

export async function makePdf() {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  // 1) ВСТРАИВАЕМ ШРИФТЫ
  await registerInter(doc);          // обязательно
  // await registerNotoSerif(doc);   // если хочешь использовать NotoSerif

  // 2) ИСПОЛЬЗУЕМ ШРИФТЫ
  doc.setFont('Inter', 'bold');
  doc.setFontSize(22);
  doc.text('Дмитрий Иванов', 60, 90);

  doc.setFont('Inter', 'normal');
  doc.setFontSize(12);
  doc.text('mdtech@bk.ru   +7 705 623 59 22', 60, 115);

  // (проверка — в списке шрифтов должен быть Inter)
  // console.log(doc.getFontList());

  doc.save('resume.pdf');
}
