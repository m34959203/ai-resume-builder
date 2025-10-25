# 🚀 AI Resume Builder - Production Ready

[![Deploy Status](https://github.com/your-username/ai-resume-builder/workflows/Production%20Deploy/badge.svg)](https://github.com/your-username/ai-resume-builder/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

**Production-ready AI-powered resume builder** with HeadHunter integration, PDF export, and personalized career recommendations.

🌐 **Live Demo**: [https://your-username.github.io/ai-resume-builder](https://your-username.github.io/ai-resume-builder)

---

## ✨ Features

### 🤖 AI-Powered
- **Smart Recommendations**: Personalized career advice using OpenRouter AI
- **Auto-suggestions**: AI-powered skill recommendations
- **Profile Analysis**: Intelligent profile scoring and feedback

### 📄 Resume Builder
- **Step-by-step Wizard**: Intuitive 5-step resume creation
- **Multiple Templates**: Modern, Creative, Professional, Minimal designs
- **PDF Export**: High-quality PDF generation with @react-pdf/renderer
- **Real-time Preview**: Live preview as you build

### 🔍 Job Search
- **HeadHunter Integration**: Direct job search from hh.ru/hh.kz
- **Smart Filters**: Filter by experience, salary, location
- **One-click Apply**: Quick application with your resume

### 🔐 Security & Performance
- **Rate Limiting**: Protection against abuse
- **CSRF Protection**: Secure OAuth flow
- **Optimized Bundle**: Code splitting, lazy loading
- **PWA Support**: Offline capabilities

---

## 🏗️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **@react-pdf/renderer** - PDF generation
- **Lucide React** - Icons

### Backend (BFF)
- **Node.js 18+** - Runtime
- **Express** - Web framework
- **Helmet** - Security headers
- **express-rate-limit** - Rate limiting
- **express-validator** - Input validation

### AI & APIs
- **OpenRouter** - AI recommendations (Gemma 3 12B, DeepSeek R1)
- **HeadHunter API** - Job search and OAuth

---

## 📦 Installation

### Prerequisites
```bash
node >= 18.0.0
npm >= 9.0.0
```

### 1. Clone Repository
```bash
git clone https://github.com/your-username/ai-resume-builder.git
cd ai-resume-builder
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
cp .env.example .env.production
```

Edit `.env.production` with your credentials:
```env
# OpenRouter API Key (required)
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# HeadHunter OAuth (optional)
HH_CLIENT_ID=your-hh-client-id
HH_CLIENT_SECRET=your-hh-client-secret

# Public URL
PUBLIC_URL=https://your-domain.com
```

### 4. Development Mode
```bash
# Start both frontend and backend
npm run dev:all

# Or separately:
npm run dev      # Frontend only (port 5173)
npm run server   # Backend only (port 8787)
```

### 5. Production Build
```bash
npm run build
npm start
```

---

## 🚀 Deployment

### GitHub Pages (Recommended)
1. **Enable GitHub Pages** in repository settings
2. **Set base path** in `vite.config.js`:
   ```js
   base: '/ai-resume-builder/'
   ```
3. **Push to main branch** - automatic deployment via GitHub Actions

### Docker
```bash
# Build image
docker build -t ai-resume-builder .

# Run container
docker run -p 8787:8787 \
  -e OPENROUTER_API_KEY=your-key \
  ai-resume-builder
```

### Heroku
```bash
heroku create ai-resume-builder
heroku config:set OPENROUTER_API_KEY=your-key
git push heroku main
```

### Vercel
```bash
npm i -g vercel
vercel --prod
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | ✅ Yes | OpenRouter API key for AI features |
| `HH_CLIENT_ID` | ❌ No | HeadHunter OAuth client ID |
| `HH_CLIENT_SECRET` | ❌ No | HeadHunter OAuth secret |
| `PUBLIC_URL` | ✅ Yes | Your app's public URL |
| `ALLOWED_ORIGINS` | ❌ No | CORS allowed origins (comma-separated) |
| `PORT` | ❌ No | Server port (default: 8787) |
| `NODE_ENV` | ❌ No | Environment (development/production) |
| `GA_MEASUREMENT_ID` | ❌ No | Google Analytics ID |
| `SENTRY_DSN` | ❌ No | Sentry error tracking DSN |

### Feature Flags
```env
ENABLE_AI_RECOMMENDATIONS=true
ENABLE_HH_INTEGRATION=true
ENABLE_PDF_EXPORT=true
ENABLE_ANALYTICS=true
```

---

## 📚 API Documentation

### Backend Endpoints

#### Health Check
```http
GET /health
```
Returns server health status and service availability.

#### AI Chat
```http
POST /api/ai/chat
Content-Type: application/json

{
  "messages": [
    { "role": "system", "content": "You are a career advisor" },
    { "role": "user", "content": "Help me improve my resume" }
  ],
  "complexity": "auto",
  "temperature": 0.3
}
```

#### Job Search
```http
GET /api/jobs/search?text=developer&experience=junior&salary=200000&page=0
```

#### HeadHunter OAuth
```http
GET /api/auth/hh/start
GET /api/auth/hh/callback?code=...&state=...
```

---

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

---

## 🎨 Customization

### Templates
Add custom resume templates in `src/components/ResumePDF.jsx`:
```jsx
const templates = {
  custom: {
    name: 'My Template',
    color: 'indigo',
    // ... template config
  }
};
```

### Styling
Modify Tailwind config in `tailwind.config.js`:
```js
theme: {
  extend: {
    colors: {
      primary: '#your-color'
    }
  }
}
```

---

## 📊 Performance

### Bundle Size
- **Initial**: ~150KB gzipped
- **Vendor (React)**: ~45KB gzipped
- **PDF Renderer**: Lazy loaded on demand
- **Total (loaded)**: ~200KB gzipped

### Lighthouse Score
- **Performance**: 95+
- **Accessibility**: 100
- **Best Practices**: 100
- **SEO**: 100

### Core Web Vitals
- **LCP**: < 2.5s
- **FID**: < 100ms
- **CLS**: < 0.1

---

## 🔒 Security

### Implemented Measures
- ✅ Helmet.js security headers
- ✅ Rate limiting (100 req/15min, 10 AI req/min)
- ✅ Input validation (express-validator)
- ✅ CSRF protection in OAuth
- ✅ Secure cookies (httpOnly, secure in prod)
- ✅ No localStorage for sensitive data
- ✅ Content Security Policy

### Security Checklist
- [ ] Enable HTTPS (required for production)
- [ ] Rotate API keys regularly
- [ ] Monitor rate limit violations
- [ ] Set up error tracking (Sentry)
- [ ] Enable security headers
- [ ] Regular dependency updates

---

## 🐛 Troubleshooting

### Common Issues

**1. AI Recommendations not working**
```bash
# Check API key
echo $OPENROUTER_API_KEY

# Test API endpoint
curl -X POST http://localhost:8787/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}]}'
```

**2. HeadHunter OAuth fails**
- Verify redirect URI matches HH app settings
- Check client ID and secret
- Ensure cookies are enabled

**3. PDF Export not working**
- Clear browser cache
- Check console for @react-pdf errors
- Verify profile data is complete

**4. Build fails**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 📈 Monitoring

### Metrics to Track
- API response times
- AI request success rate
- PDF generation success rate
- User session duration
- Conversion rate (resume downloads)

### Recommended Tools
- **Google Analytics** - User behavior
- **Sentry** - Error tracking
- **Uptime Robot** - Availability monitoring
- **Lighthouse CI** - Performance tracking

---

## 🤝 Contributing

Contributions welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
```bash
npm run lint:fix
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenRouter** - AI model API
- **HeadHunter** - Job search API
- **React PDF** - PDF generation
- **Tailwind CSS** - Styling framework
- **Lucide** - Icon library

---

## 📞 Support

- **Documentation**: [https://github.com/your-username/ai-resume-builder/wiki](https://github.com/your-username/ai-resume-builder/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-username/ai-resume-builder/issues)
- **Email**: support@airesume.com

---

## 🗺️ Roadmap

- [ ] Multi-language support (EN, KZ, RU)
- [ ] More resume templates
- [ ] Cover letter generator
- [ ] LinkedIn integration
- [ ] Mobile app (React Native)
- [ ] Resume analytics dashboard
- [ ] Interview preparation tips
- [ ] Salary insights

---

**Made with ❤️ by [Your Name](https://github.com/your-username)**
