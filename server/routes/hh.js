/**
 * HeadHunter API Proxy Routes
 * ES6 Modules version
 */

import express from 'express';

const router = express.Router();

// ============================================
// CONFIGURATION
// ============================================

const HH_API = 'https://api.hh.ru';
const UA = process.env.HH_USER_AGENT || 'AI Resume Builder/1.0';

/**
 * Безопасное преобразование в int
 */
function toInt(v, def) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : def;
}

// ============================================
// GET /api/hh/areas
// Получить список регионов
// ============================================

router.get('/areas', async (req, res) => {
  try {
    const host = String(req.query.host || process.env.HH_HOST || 'hh.kz').trim();
    
    const response = await fetch(`${HH_API}/areas?host=${encodeURIComponent(host)}`, {
      headers: { 
        'HH-User-Agent': UA, 
        'Accept': 'application/json' 
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).send(errorText);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('❌ HH Areas error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch areas',
      message: String(error) 
    });
  }
});

// ============================================
// GET /api/hh/jobs/search
// Поиск вакансий
// ============================================

router.get('/jobs/search', async (req, res) => {
  try {
    const host = String(req.query.host || process.env.HH_HOST || 'hh.kz').trim();
    const text = String(req.query.text || '').trim();
    const page = toInt(req.query.page, 0);
    const per_page = toInt(req.query.per_page, 20);

    // Построение параметров запроса
    const params = new URLSearchParams({ 
      host, 
      page, 
      per_page 
    });

    if (text) {
      params.set('text', text);
    }

    if (req.query.area) {
      params.set('area', String(req.query.area));
    }

    if (req.query.salary) {
      params.set('salary', String(req.query.salary));
    }

    if (req.query.experience) {
      params.set('experience', String(req.query.experience));
    }

    const url = `${HH_API}/vacancies?${params.toString()}`;
    
    const response = await fetch(url, { 
      headers: { 
        'HH-User-Agent': UA, 
        'Accept': 'application/json' 
      } 
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).send(errorText);
    }

    const data = await response.json();

    // Нормализация ответа
    res.json({
      items: Array.isArray(data.items) ? data.items : [],
      found: Number.isFinite(data.found) ? data.found : 0,
      page: data.page ?? page,
      pages: data.pages ?? 0,
      per_page: data.per_page ?? per_page,
    });
  } catch (error) {
    console.error('❌ HH Search error:', error);
    res.status(500).json({ 
      error: 'Failed to search vacancies',
      message: String(error),
      items: [],
      found: 0
    });
  }
});

// ============================================
// GET /api/hh/vacancies/:id
// Получить вакансию по ID
// ============================================

router.get('/vacancies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const host = String(req.query.host || process.env.HH_HOST || 'hh.kz').trim();

    const url = `${HH_API}/vacancies/${id}?host=${encodeURIComponent(host)}`;
    
    const response = await fetch(url, {
      headers: { 
        'HH-User-Agent': UA, 
        'Accept': 'application/json' 
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).send(errorText);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('❌ HH Vacancy error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch vacancy',
      message: String(error) 
    });
  }
});

// ============================================
// GET /api/hh/me
// Информация о текущем пользователе (требует auth)
// ============================================

router.get('/me', async (req, res) => {
  try {
    const authToken = req.headers.authorization;

    if (!authToken) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const response = await fetch(`${HH_API}/me`, {
      headers: { 
        'HH-User-Agent': UA,
        'Authorization': authToken,
        'Accept': 'application/json' 
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).send(errorText);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('❌ HH Me error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user info',
      message: String(error) 
    });
  }
});

// ============================================
// GET /api/hh/resumes
// Список резюме пользователя (требует auth)
// ============================================

router.get('/resumes', async (req, res) => {
  try {
    const authToken = req.headers.authorization;

    if (!authToken) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const response = await fetch(`${HH_API}/resumes/mine`, {
      headers: { 
        'HH-User-Agent': UA,
        'Authorization': authToken,
        'Accept': 'application/json' 
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).send(errorText);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('❌ HH Resumes error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch resumes',
      message: String(error),
      items: []
    });
  }
});

// ============================================
// POST /api/hh/respond
// Откликнуться на вакансию (требует auth)
// ============================================

router.post('/respond', async (req, res) => {
  try {
    const authToken = req.headers.authorization;
    const { vacancy_id, resume_id, message } = req.body;

    if (!authToken) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    if (!vacancy_id || !resume_id) {
      return res.status(400).json({ 
        error: 'vacancy_id and resume_id are required' 
      });
    }

    const response = await fetch(`${HH_API}/negotiations`, {
      method: 'POST',
      headers: { 
        'HH-User-Agent': UA,
        'Authorization': authToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json' 
      },
      body: JSON.stringify({
        vacancy_id,
        resume_id,
        message: message || ''
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).send(errorText);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('❌ HH Respond error:', error);
    res.status(500).json({ 
      error: 'Failed to respond to vacancy',
      message: String(error) 
    });
  }
});

// ============================================
// EXPORT (ES6)
// ============================================

export default router; // ✅ ВАЖНО!