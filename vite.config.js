// vite.config.js — единый конфиг для dev/prod (Windows/Pages-friendly)
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = 'ai-resume-builder'; // имя репозитория на GitHub

// Хелпер: базовый путь должен заканчиваться "/"
function normalizeBase(b) {
  if (!b) return '/';
  try {
    // Абсолютный URL — не трогаем, только закрывающий слэш
    // eslint-disable-next-line no-new
    new URL(b);
    return b.endsWith('/') ? b : `${b}/`;
  } catch {
    const s = String(b).trim();
    if (!s) return '/';
    const withLeading = s.startsWith('/') ? s : `/${s}`;
    return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
  }
}

// Хелпер: пытаемся найти локальные dev-сертификаты (mkcert и т.п.)
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
      return {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
    }
  }
  return null;
}

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ''); // читаем все переменные
  const isProd = mode === 'production';

  // ===== Base (важно для GitHub Pages/подкаталогов) =====
  // Локально: VITE_BASE (например, "/") или дефолт "/"
  // На GitHub Actions: принудительно "/ai-resume-builder/"
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

    try {
      const { VitePWA } = await import('vite-plugin-pwa');
      plugins.push(
        VitePWA({
          registerType: 'autoUpdate',
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
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/api\.hh\.ru\/.*/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'hh-api-cache',
                  expiration: { maxEntries: 50, maxAgeSeconds: 300 },
                },
              },
              {
                urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'cdn-cache',
                  expiration: { maxEntries: 30, maxAgeSeconds: 86_400 },
                },
              },
            ],
          },
        })
      );
    } catch {
      console.warn('vite-plugin-pwa не установлен — пропускаю.');
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
    // eslint-disable-next-line n/no-missing-import
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
      proxy: {
        [apiPrefix]: {
          target: apiUrl,
          changeOrigin: true,
          ws: true,
          secure: !insecure,
          ...(shouldStripPrefix
            ? { rewrite: (p) => p.replace(new RegExp(`^${apiPrefix}`), '') }
            : {}),
          configure: (proxy /*, options */) => {
            proxy.on('error', (err, req, res) => {
              console.error('[proxy:error]', err?.message || err);
              if (!res.headersSent) res.setHeader('x-proxy-error', '1');
            });
            proxy.on('proxyRes', (proxyRes, req) => {
              const code = proxyRes.statusCode;
              const retryAfter = proxyRes.headers?.['retry-after'];
              if (code >= 400) {
                console.warn(
                  `[proxy:res] ${req.method} ${req.url} → ${code}${
                    retryAfter ? ` (Retry-After: ${retryAfter})` : ''
                  }`
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
