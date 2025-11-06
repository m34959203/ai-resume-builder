import express from 'express';
import {
  translateText,
  translateResume,
  translateVacancies,
  translateRecommendations
} from '../services/translation.js';

const router = express.Router();

// Перевод простого текста
router.post('/text', async (req, res) => {
  try {
    const { text, targetLang, context } = req.body;
    const translation = await translateText(text, targetLang, context);
    res.json({ translation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Перевод резюме
router.post('/resume', async (req, res) => {
  try {
    const { resumeData, targetLang } = req.body;
    const translated = await translateResume(resumeData, targetLang);
    res.json({ resume: translated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Перевод вакансий
router.post('/vacancies', async (req, res) => {
  try {
    const { vacancies, targetLang } = req.body;
    const translated = await translateVacancies(vacancies, targetLang);
    res.json({ vacancies: translated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Перевод рекомендаций
router.post('/recommendations', async (req, res) => {
  try {
    const { recommendations, targetLang } = req.body;
    const translated = await translateRecommendations(recommendations, targetLang);
    res.json({ recommendations: translated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;