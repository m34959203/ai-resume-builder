import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

export async function exportToWord(resumeData, language = 'ru') {
  const translations = {
    ru: {
      experience: 'Опыт работы',
      education: 'Образование',
      skills: 'Навыки'
    },
    kz: {
      experience: 'Жұмыс тәжірибесі',
      education: 'Білім',
      skills: 'Дағдылар'
    },
    en: {
      experience: 'Work Experience',
      education: 'Education',
      skills: 'Skills'
    }
  };

  const t = translations[language];

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Имя
        new Paragraph({
          text: resumeData.fullName,
          heading: HeadingLevel.HEADING_1,
        }),
        
        // Должность
        new Paragraph({
          text: resumeData.position,
          heading: HeadingLevel.HEADING_2,
        }),

        // Опыт
        new Paragraph({
          text: t.experience,
          heading: HeadingLevel.HEADING_2,
        }),
        
        ...resumeData.experience.map(exp => [
          new Paragraph({
            children: [
              new TextRun({ text: exp.position, bold: true }),
              new TextRun(` - ${exp.company}`),
            ],
          }),
          new Paragraph({ text: exp.description }),
        ]).flat(),

        // Навыки
        new Paragraph({
          text: t.skills,
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          text: resumeData.skills.join(', '),
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `resume_${language}.docx`);
}