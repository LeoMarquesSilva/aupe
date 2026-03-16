const { createProxyMiddleware } = require('http-proxy-middleware');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://mrkcoolfxqiwaqeyquuf.supabase.co';

module.exports = function (app) {
  app.use(
    '/functions',
    createProxyMiddleware({
      target: supabaseUrl,
      changeOrigin: true,
      pathRewrite: { '^/functions': '/functions' },
    })
  );
};
