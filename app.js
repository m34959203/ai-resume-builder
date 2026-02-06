// app.js — Entry point for Plesk / Phusion Passenger on hoster.kz
// package.json has "type": "module", but server/index.js is CommonJS
// → bridge via createRequire

import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('[app.js] Starting AI Resume Builder...');
console.log('[app.js] NODE_ENV:', process.env.NODE_ENV);
console.log('[app.js] PORT:', process.env.PORT);

const serverPath = join(__dirname, 'server', 'index.js');
console.log('[app.js] Looking for server at:', serverPath);

if (!existsSync(serverPath)) {
  console.error('[app.js] ERROR: server/index.js not found!');
  console.error('[app.js] Current directory:', __dirname);
  try {
    console.error('[app.js] Files:', readdirSync(__dirname));
  } catch (e) {
    console.error('[app.js] Cannot read directory:', e.message);
  }
  process.exit(1);
}

let app;
try {
  app = require('./server/index.js');
  console.log('[app.js] Server module loaded successfully');
} catch (error) {
  console.error('[app.js] ERROR loading server/index.js:', error);
  process.exit(1);
}

// server/index.js already calls app.listen() — Phusion Passenger intercepts this
// ESM default export for compatibility
export default app;
