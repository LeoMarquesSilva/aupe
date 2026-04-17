const path = require('path');
const root = path.join(__dirname, '..');
// Garante FACEBOOK_APP_SECRET / .env no processo do dev server (setupProxy corre antes do CRA injetar tudo).
try {
  require('dotenv').config({ path: path.join(root, '.env') });
  require('dotenv').config({ path: path.join(root, '.env.local'), override: true });
} catch {
  /* dotenv opcional */
}
const { createProxyMiddleware } = require('http-proxy-middleware');
const { handleFacebookOAuthToken } = require(path.join(
  root,
  'server',
  'facebook-oauth-token-handler.js',
));
const { handleInstagramBusinessOAuthToken } = require(path.join(
  root,
  'server',
  'instagram-business-oauth-token-handler.js',
));
const instagramBusinessDeauthorize = require(path.join(
  root,
  'api',
  'instagram-business-deauthorize.js',
));
const instagramBusinessDataDeletion = require(path.join(
  root,
  'api',
  'instagram-business-data-deletion.js',
));

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://mrkcoolfxqiwaqeyquuf.supabase.co';

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

module.exports = function (app) {
  app.post('/api/facebook-oauth-token', async (req, res) => {
    try {
      const body = await readJsonBody(req);
      await handleFacebookOAuthToken({ method: 'POST', body }, res);
    } catch (e) {
      res.status(400).json({ message: 'JSON inválido' });
    }
  });

  // Instagram API with Instagram Login (business) — dev-only mirror of the
  // Vercel serverless functions under /api. In production Vercel serves these
  // directly from the files in api/.
  app.post('/api/instagram-business-oauth-token', async (req, res) => {
    try {
      const body = await readJsonBody(req);
      await handleInstagramBusinessOAuthToken({ method: 'POST', body, headers: req.headers }, res);
    } catch (e) {
      res.status(400).json({ message: 'Invalid JSON body' });
    }
  });

  app.all('/api/instagram-business-deauthorize', async (req, res) => {
    try {
      const body = req.method === 'POST' ? await readJsonBody(req).catch(() => ({})) : undefined;
      await instagramBusinessDeauthorize(
        { method: req.method, body, headers: req.headers },
        res,
      );
    } catch (e) {
      res.status(500).json({ message: 'Internal error' });
    }
  });

  app.all('/api/instagram-business-data-deletion', async (req, res) => {
    try {
      const body = req.method === 'POST' ? await readJsonBody(req).catch(() => ({})) : undefined;
      await instagramBusinessDataDeletion(
        { method: req.method, body, headers: req.headers },
        res,
      );
    } catch (e) {
      res.status(500).json({ message: 'Internal error' });
    }
  });

  app.use(
    '/functions',
    createProxyMiddleware({
      target: supabaseUrl,
      changeOrigin: true,
      pathRewrite: { '^/functions': '/functions' },
    })
  );
};
