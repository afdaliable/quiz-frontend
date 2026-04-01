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

// Dedicated handler for OAuth callback — fully buffers the response so
// the JWT body (slow, large) isn't lost to streaming race conditions.
app.post('/api/auth/google/callback', (req, res) => {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    const requestBody = Buffer.concat(chunks);

    const forwardHeaders = {
      'content-type': 'application/json',
      'accept': 'application/json',
      'content-length': requestBody.length,
    };
    if (req.headers['authorization']) {
      forwardHeaders['authorization'] = req.headers['authorization'];
    }

    const backendReq = https.request({
      hostname: 'quiz-backend.afdaliable.dev',
      path: '/auth/google/callback',
      method: 'POST',
      headers: forwardHeaders,
      rejectUnauthorized: false,
    }, (backendRes) => {
      const responseChunks = [];
      backendRes.on('data', chunk => responseChunks.push(chunk));
      backendRes.on('end', () => {
        const body = Buffer.concat(responseChunks).toString('utf8');
        console.log('[OAuth] status:', backendRes.statusCode, 'body length:', body.length);
        res.status(backendRes.statusCode)
           .set('Content-Type', 'application/json')
           .set('Access-Control-Allow-Origin', '*')
           .send(body);
      });
    });

    backendReq.on('error', (err) => {
      console.error('[OAuth error]', err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Backend unreachable', detail: err.message });
      }
    });

    backendReq.write(requestBody);
    backendReq.end();
  });
});

// General proxy middleware configuration
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