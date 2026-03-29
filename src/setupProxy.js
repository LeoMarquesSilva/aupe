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

  app.use(
    '/functions',
    createProxyMiddleware({
      target: supabaseUrl,
      changeOrigin: true,
      pathRewrite: { '^/functions': '/functions' },
    })
  );
};
