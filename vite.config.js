// vite.config.js — единый конфиг для dev/prod (Windows/Pages-friendly)
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = 'ai-resume-builder'; // имя репозитория на GitHub

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
function normalizeBase(b) {
  if (!b) return '/';
  try {
    new URL(b); // абсолютный URL — не трогаем
    return b.endsWith('/') ? b : `${b}/`;
  } catch {
    const s = String(b).trim();
    if (!s) return '/';
    const withLeading = s.startsWith('/') ? s : `/${s}`;
    return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
  }
}

function findLocalHttpsConfig(rootDir) {
  const candidates = [
    ['certs/localhost-key.pem', 'certs/localhost.pem'],
    ['certs/localhost-key.key', 'certs/localhost.crt'],
    ['.cert/localhost-key.pem', '.cert/localhost.pem'],
    ['.cert/localhost+2-key.pem', '.cert/localhost+2.pem'],
  ];
  for (const [keyRel, certRel] of candidates) {
    const keyPath = path.resolve(rootDir, keyRel);
    const certPath = path.resolve(rootDir, certRel);
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
    }
  }
  return null;
}

const escRe = (s) => String(s).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

// ────────────────────────────────────────────────────────────
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';

  // ===== Base (важно для GitHub Pages/подкаталогов) =====
  const base =
    process.env.GITHUB_ACTIONS === 'true'
      ? `/${REPO}/`
      : normalizeBase(env.VITE_BASE || '/');

  // ===== Backend / Proxy =====
  const apiUrlRaw = env.VITE_API_URL || env.VITE_BACKEND_URL || 'http://localhost:8000';
  const apiUrl = apiUrlRaw.replace(/\/$/, '');
  const rawPrefix = env.VITE_API_PREFIX || '/api';
  const apiPrefix = rawPrefix.startsWith('/') ? rawPrefix : `/${rawPrefix}`;
  const shouldStripPrefix = String(env.VITE_PROXY_STRIP_PREFIX || '').trim() === '1';
  const insecure = String(env.VITE_PROXY_INSECURE || '').trim() === '1';

  // ===== Plugins =====
  const plugins = [react()];

  // Управление PWA: по умолчанию включаем в prod, можно отключить переменной
  const enablePWA = String(env.VITE_ENABLE_PWA ?? (isProd ? '1' : '0')).trim() === '1';

  if (isProd) {
    try {
      const { default: compression } = await import('vite-plugin-compression');
      plugins.push(
        compression({ algorithm: 'gzip', ext: '.gz', threshold: 10_240 }),
        compression({ algorithm: 'brotliCompress', ext: '.br', threshold: 10_240 })
      );
    } catch {
      console.warn('vite-plugin-compression не установлен — пропускаю.');
    }

    if (enablePWA) {
      try {
        const { VitePWA } = await import('vite-plugin-pwa');

        // Детектируем origin BFF (если задан абсолютным URL)
        const bffOrigin = (() => {
          try {
            const u = new URL(apiUrl);
            return u.origin; // напр., https://ai-resume-bff-nepa.onrender.com
          } catch {
            return null;
          }
        })();

        // Для navigateFallback запретим SW перехватывать навигацию на API/служебные пути
        const navigateDenylist = [
          /^\/api\//i,
          /^\/admin\//i,
          /^\/socket\.io\//i,
          /^\/vite\//i,
          /\/assets\/.*\.map$/i,
        ];

        // Для runtimeCaching нам нужны паттерны полного URL (а не path!)
        // 1) Любой /api/** на текущем домене: https?://<host>/api/...
        const apiPrefixEsc = escRe(apiPrefix);
        const sameOriginApiRe = new RegExp(`^https?:\\/\\/[^/]+${apiPrefixEsc}\\/?.*`, 'i');

        // 2) Внешний BFF-ориджин (если определён): отключаем кеш полностью
        const bffOriginRe = bffOrigin
          ? new RegExp(`^${escRe(bffOrigin)}\\/?.*`, 'i')
          : null;

        plugins.push(
          VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            workbox: {
              navigationPreload: true,
              cleanupOutdatedCaches: true,
              skipWaiting: true,
              clientsClaim: true,
              navigateFallback: 'index.html',
              navigateFallbackDenylist: navigateDenylist,
              globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

              // ВАЖНО: полностью отключаем кеширование API-запросов (NetworkOnly)
              runtimeCaching: [
                // 1) Локальный /api/**
                {
                  urlPattern: sameOriginApiRe,
                  handler: 'NetworkOnly',
                },
                // 2) Внешний BFF (Render) — тоже нет кеша
                ...(bffOriginRe
                  ? [{
                      urlPattern: bffOriginRe,
                      handler: 'NetworkOnly',
                    }]
                  : []),

                // 3) Популярные CDN — можно кешировать
                {
                  urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'cdn-cache',
                    expiration: { maxEntries: 50, maxAgeSeconds: 86_400 },
                  },
                },
              ],
            },
            includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
            manifest: {
              name: env.VITE_APP_NAME || 'AI Resume Builder',
              short_name: 'AI Resume',
              description: 'Create professional resumes with AI assistance',
              theme_color: '#2563eb',
              background_color: '#ffffff',
              display: 'standalone',
              // ВАЖНО: без ведущего "/" — иконки резолвятся относительно base
              icons: [
                { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
              ],
            },
            devOptions: { enabled: false }, // в dev PWA выключен
          })
        );
      } catch {
        console.warn('vite-plugin-pwa не установлен — пропускаю.');
      }
    }

    try {
      const { visualizer } = await import('rollup-plugin-visualizer');
      plugins.push(
        visualizer({
          filename: './dist/stats.html',
          open: false,
          gzipSize: true,
          brotliSize: true,
        })
      );
    } catch {
      console.warn('rollup-plugin-visualizer не установлен — пропускаю.');
    }
  }

  // Условный алиас для base64-js (только если шим существует)
  const base64ShimPath = path.resolve(__dirname, 'src/shims/base64js-default.js');
  const hasBase64Shim = fs.existsSync(base64ShimPath);

  // Безопасное получение версии
  let pkgVersion = process.env.npm_package_version;
  if (!pkgVersion) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));
      pkgVersion = pkg.version || '0.0.0';
    } catch {
      pkgVersion = '0.0.0';
    }
  }

  // «Умный» выбор минификатора
  let minifier = 'terser';
  try {
    await import('terser');
  } catch {
    minifier = 'esbuild';
  }

  // ===== Dev HTTPS (опционально) =====
  const useHttps = String(env.VITE_HTTPS || '').trim() === '1';
  const httpsConfig = useHttps ? findLocalHttpsConfig(__dirname) : null;

  return {
    base,
    plugins,

    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        ...(hasBase64Shim
          ? {
              'base64-js': base64ShimPath,
              'base64-js-real': path.resolve(__dirname, 'node_modules/base64-js/index.js'),
            }
          : {}),
      },
    },

    server: {
      host: true,
      port: 5173,
      strictPort: true,
      https: httpsConfig || undefined,
      headers: { 'Access-Control-Allow-Origin': '*' },
      hmr: { overlay: true },
      open: false,
      proxy: {
        [apiPrefix]: {
          target: apiUrl,
          changeOrigin: true,
          ws: true,
          secure: !insecure,
          ...(shouldStripPrefix
            ? { rewrite: (p) => p.replace(new RegExp(`^${escRe(apiPrefix)}`), '') }
            : {}),
          configure: (proxy) => {
            proxy.on('error', (err, req, res) => {
              console.error('[proxy:error]', err?.message || err);
              if (!res.headersSent) res.setHeader('x-proxy-error', '1');
            });
            proxy.on('proxyRes', (proxyRes, req) => {
              const code = proxyRes.statusCode;
              const retryAfter = proxyRes.headers?.['retry-after'];
              if (code >= 400) {
                console.warn(
                  `[proxy:res] ${req.method} ${req.url} → ${code}${retryAfter ? ` (Retry-After: ${retryAfter})` : ''}`
                );
              }
            });
          },
        },
      },
    },

    preview: {
      port: 4173,
      host: true,
    },

    build: {
      target: 'es2020',
      outDir: 'dist',
      assetsDir: 'assets',
      minify: minifier,
      sourcemap: isProd ? false : true,
      cssCodeSplit: true,
      cssMinify: true,
      ...(minifier === 'terser'
        ? {
            terserOptions: {
              compress: {
                drop_console: isProd,
                drop_debugger: isProd,
                pure_funcs: isProd ? ['console.log', 'console.info'] : [],
              },
              format: { comments: false },
            },
          }
        : {}),
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-icons': ['lucide-react'],
          },
        },
      },
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
      },
    },

    // Даём Vite заранее «переварить» CJS-цепочку PDF
    optimizeDeps: {
      include: [
        '@react-pdf/renderer',
        '@react-pdf/font',
        '@react-pdf/pdfkit',
        'fontkit',
        'unicode-properties',
        'unicode-trie',
        'brotli',
        'linebreak',
      ],
      exclude: [],
      esbuildOptions: { target: 'es2020' },
    },

    define: {
      __APP_VERSION__: JSON.stringify(pkgVersion),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
  };
});
