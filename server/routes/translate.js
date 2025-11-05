const express = require('express');
const router = express.Router();
const { translateWithAI } = require('../services/ai');

router.post('/', async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage = 'auto' } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({ 
        error: 'Text and target language are required' 
      });
    }

    const languageNames = {
      en: 'English',
      kk: 'Kazakh',
      ru: 'Russian'
    };

    const targetLangName = languageNames[targetLanguage] || targetLanguage;
    
    const prompt = `Translate the following text to ${targetLangName}. Return ONLY the translation, without any explanations or additional text:\n\n${text}`;

    const translatedText = await translateWithAI(prompt);

    res.json({ 
      translatedText: translatedText.trim(),
      sourceLanguage,
      targetLanguage 
    });

  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ 
      error: 'Translation failed',
      message: error.message 
    });
  }
});

router.post('/batch', async (req, res) => {
  try {
    const { texts, targetLanguage, sourceLanguage = 'auto' } = req.body;

    if (!texts || !Array.isArray(texts) || !targetLanguage) {
      return res.status(400).json({ 
        error: 'Texts array and target language are required' 
      });
    }

    const languageNames = {
      en: 'English',
      kk: 'Kazakh',
      ru: 'Russian'
    };

    const targetLangName = languageNames[targetLanguage] || targetLanguage;
    
    const translatedTexts = await Promise.all(
      texts.map(async (text) => {
        if (!text) return text;
        
        const prompt = `Translate to ${targetLangName}: ${text}`;
        const translated = await translateWithAI(prompt);
        return translated.trim();
      })
    );

    res.json({ 
      translatedTexts,
      sourceLanguage,
      targetLanguage 
    });

  } catch (error) {
    console.error('Batch translation error:', error);
    res.status(500).json({ 
      error: 'Batch translation failed',
      message: error.message 
    });
  }
});

module.exports = router;