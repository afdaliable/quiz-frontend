const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Proxy middleware configuration
app.use('/api', createProxyMiddleware({
  target: 'https://quiz-backend.afdaliable.dev',
  changeOrigin: true,
  secure: false,
  pathRewrite: {
    '^/api': ''
  },
  onProxyRes: function (proxyRes, req, res) {
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    if (req.url.includes('/auth/google/callback')) {
      console.log('[OAuth] backend status:', proxyRes.statusCode, req.method, req.url);
    }
  },
  onError: function (err, req, res) {
    console.error('[Proxy error]', req.method, req.url, err.message);
    res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'dist/quiz-frontend/browser')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.send('OK');
});

// Handle all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/quiz-frontend/browser/index.html'));
});

const port = process.env.PORT || 4200;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 