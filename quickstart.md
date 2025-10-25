# ⚡ Quick Start Guide

Get AI Resume Builder running in **5 minutes**!

---

## 🎯 Option 1: Deploy to GitHub Pages (Easiest)

**Perfect for**: Testing, personal use, portfolio

### Step 1: Fork & Clone
```bash
# Fork on GitHub, then:
git clone https://github.com/YOUR-USERNAME/ai-resume-builder.git
cd ai-resume-builder
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Get API Keys

**OpenRouter** (Required for AI features):
1. Go to [openrouter.ai/keys](https://openrouter.ai/keys)
2. Sign up (free)
3. Create API key
4. Copy key: `sk-or-v1-...`

**HeadHunter** (Optional):
1. Go to [dev.hh.ru](https://dev.hh.ru)
2. Register application
3. Get Client ID & Secret

### Step 4: Configure Environment
```bash
# Create production env file
cp .env.example .env.production

# Edit with your keys
nano .env.production
```

Paste:
```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
HH_CLIENT_ID=your-hh-id
HH_CLIENT_SECRET=your-hh-secret
PUBLIC_URL=https://YOUR-USERNAME.github.io/ai-resume-builder
```

### Step 5: Update Config
```bash
# Edit vite.config.js
nano vite.config.js
```

Change `base` to your repo name:
```js
base: '/ai-resume-builder/'
```

### Step 6: Deploy
```bash
git add .
git commit -m "feat: initial deployment"
git push origin main
```

### Step 7: Enable GitHub Pages
1. Go to **Settings** → **Pages**
2. Source: **GitHub Actions**
3. Wait 2-3 minutes
4. Visit: `https://YOUR-USERNAME.github.io/ai-resume-builder/`

✅ **Done!** Your app is live!

---

## 🖥️ Option 2: Run Locally (Development)

### Step 1: Clone & Install
```bash
git clone https://github.com/your-username/ai-resume-builder.git
cd ai-resume-builder
npm install
```

### Step 2: Create Local Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
PORT=8787
PUBLIC_URL=http://localhost:5173
```

### Step 3: Start Development Server
```bash
# Terminal 1: Start backend
npm run server

# Terminal 2: Start frontend
npm run dev
```

Or run both together:
```bash
npm run dev:all
```

### Step 4: Open Browser
Open [http://localhost:5173](http://localhost:5173)

✅ **Done!** Local dev environment ready!

---

## 🐳 Option 3: Docker (One Command)

### Prerequisites
- Docker installed ([get docker](https://docs.docker.com/get-docker/))

### Run
```bash
docker run -p 8787:8787 \
  -e OPENROUTER_API_KEY=sk-or-v1-your-key \
  -e PUBLIC_URL=http://localhost:8787 \
  ghcr.io/your-username/ai-resume-builder:latest
```

Or with docker-compose:

```bash
# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  app:
    image: ghcr.io/your-username/ai-resume-builder:latest
    ports:
      - "8787:8787"
    environment:
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - PUBLIC_URL=http://localhost:8787
EOF

# Run
export OPENROUTER_API_KEY=sk-or-v1-your-key
docker-compose up
```

Visit [http://localhost:8787](http://localhost:8787)

✅ **Done!** Docker container running!

---

## 🌐 Option 4: One-Click Deploy Buttons

### Deploy to Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/ai-resume-builder)

1. Click button above
2. Connect GitHub
3. Add environment variables:
   - `OPENROUTER_API_KEY`
   - `HH_CLIENT_ID` (optional)
   - `HH_CLIENT_SECRET` (optional)
4. Deploy!

### Deploy to Heroku
[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/your-username/ai-resume-builder)

1. Click button above
2. Set app name
3. Add environment variables
4. Deploy!

### Deploy to Railway
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/your-username/ai-resume-builder)

---

## 🧪 Verify Installation

### 1. Health Check
```bash
curl http://localhost:8787/health
```

Expected response:
```json
{
  "status": "ok",
  "uptime": 123.456,
  "services": {
    "openrouter": true,
    "headhunter": true
  }
}
```

### 2. AI Test
```bash
curl -X POST http://localhost:8787/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Say hello"}
    ]
  }'
```

### 3. Job Search Test
```bash
curl "http://localhost:8787/api/jobs/search?text=developer"
```

---

## 🎨 Customize

### Change Colors
Edit `tailwind.config.js`:
```js
theme: {
  extend: {
    colors: {
      primary: '#your-color',
    }
  }
}
```

### Add Templates
Edit `src/components/ResumePDF.jsx`:
```jsx
const templates = {
  myTemplate: {
    name: 'My Template',
    // ... config
  }
};
```

### Modify AI Prompts
Edit `server-production.js`:
```js
const systemPrompt = 'Your custom prompt...';
```

---

## 🐛 Troubleshooting

### Problem: "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Problem: "OPENROUTER_API_KEY not set"
```bash
# Check env file
cat .env

# Restart server
npm run server
```

### Problem: "Port 8787 already in use"
```bash
# Change port
export PORT=3000
npm run server
```

### Problem: "Build fails"
```bash
# Clear Vite cache
rm -rf dist .vite
npm run build
```

### Problem: "CORS error"
```bash
# Check ALLOWED_ORIGINS in .env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 📚 Next Steps

### 1. Explore Features
- ✏️ Create a resume
- 🔍 Search jobs
- 🤖 Get AI recommendations
- 📄 Export to PDF

### 2. Read Documentation
- [Full README](README.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Security Policy](SECURITY.md)

### 3. Join Community
- ⭐ Star the repo
- 🐛 Report issues
- 💡 Suggest features
- 🤝 Contribute

---

## 🆘 Need Help?

### Quick Links
- **Issues**: [GitHub Issues](https://github.com/your-username/ai-resume-builder/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/ai-resume-builder/discussions)
- **Email**: support@airesume.com

### Common Questions

**Q: Is it free?**
A: Yes! The app is open source. You only pay for API usage (OpenRouter has free tier).

**Q: Can I use it commercially?**
A: Yes, under MIT license. See [LICENSE](LICENSE).

**Q: Do I need HeadHunter API?**
A: No, it's optional. App works without HH integration.

**Q: How secure is my data?**
A: Your data stays in your browser. We don't store any personal information. See [SECURITY.md](SECURITY.md).

**Q: Can I deploy to my own server?**
A: Yes! See [DEPLOYMENT.md](DEPLOYMENT.md) for all options.

---

## 🎉 Success!

Your AI Resume Builder is running! 🚀

Share your deployment:
```
🎊 Just deployed AI Resume Builder!
🔗 https://your-url-here.com
⭐ https://github.com/your-username/ai-resume-builder

#opensource #ai #react #resume
```

---

**Built with ❤️ by developers, for developers**

*Star ⭐ the repo if you find it useful!*
