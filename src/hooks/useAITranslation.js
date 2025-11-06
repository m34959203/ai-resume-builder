import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function useAITranslation() {
  const { i18n } = useTranslation();
  const [isTranslating, setIsTranslating] = useState(false);

  const translateContent = async (content, context = '') => {
    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: content,
          targetLang: i18n.language,
          context
        })
      });
      const data = await response.json();
      return data.translation;
    } catch (error) {
      console.error('Translation failed:', error);
      return content;
    } finally {
      setIsTranslating(false);
    }
  };

  const translateResume = async (resumeData) => {
    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData,
          targetLang: i18n.language
        })
      });
      const data = await response.json();
      return data.resume;
    } finally {
      setIsTranslating(false);
    }
  };

  return { translateContent, translateResume, isTranslating };
}