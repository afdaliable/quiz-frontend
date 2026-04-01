const express = require('express');
const path = require('path');
const https = require('https');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Dedicated HTTPS agent — keepAlive: false prevents ECONNRESET when
// the backend closes an idle connection before the body is fully sent.
const backendAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: false,
});

// Proxy middleware configuration
app.use('/api', createProxyMiddleware({
  target: 'https://quiz-backend.afdaliable.dev',
  changeOrigin: true,
  secure: false,
  agent: backendAgent,
  pathRewrite: {
    '^/api': ''
  },
  onProxyRes: function (proxyRes, req, res) {
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
  },
  onError: function (err, req, res) {
    console.error('[Proxy error]', req.method, req.url, err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Backend unreachable', detail: err.message });
    }
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