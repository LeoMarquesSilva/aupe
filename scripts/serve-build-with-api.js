/**
 * Serve a pasta build/ com POST /api/facebook-oauth-token (mesma lógica da Vercel).
 * Use em vez de `serve -s build`, que não tem API e ainda devolve index.html em /api/* (200).
 */
const path = require('path');
const root = path.join(__dirname, '..');

for (const k of [
  'REACT_APP_FACEBOOK_APP_SECRET',
  'REACT_APP_META_APP_SECRET',
  'REACT_APP_INSTAGRAM_APP_SECRET',
]) {
  const v = process.env[k];
  if (v !== undefined && String(v).trim() === '') delete process.env[k];
}

require('dotenv').config({ path: path.join(root, '.env') });

const express = require('express');
const fs = require('fs');
const { handleFacebookOAuthToken } = require(path.join(root, 'server', 'facebook-oauth-token-handler.js'));

const buildDir = path.join(root, 'build');
if (!fs.existsSync(path.join(buildDir, 'index.html'))) {
  console.error('Pasta build/ em falta. Corra: npm run build');
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: '64kb' }));

app.post('/api/facebook-oauth-token', (req, res) => {
  handleFacebookOAuthToken(req, res).catch((e) => {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ message: e.message || 'Erro interno' });
  });
});

app.use(express.static(buildDir, { index: false }));
// Express 5: não usar app.get('*', …). Tudo o que o static não servir (rotas do React) → index.html
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  res.sendFile(path.join(buildDir, 'index.html'));
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`http://localhost:${port} — build estática + /api/facebook-oauth-token`);
});
