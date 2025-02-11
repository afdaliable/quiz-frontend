const express = require('express');
const path = require('path');
const app = express();

// Hapus redirect HTTPS karena ini sudah ditangani oleh Cloudflare
app.use(express.static(path.join(__dirname, 'dist/quiz-frontend/browser')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.send('OK');
});

// Send all requests to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/quiz-frontend/browser/index.html'));
});

const PORT = process.env.PORT || 4200;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 