const express = require('express');
const path = require('path');
const app = express();

// Serve static files
app.use(express.static(path.join(__dirname, 'dist/quiz-frontend/browser')));

// Handle all routes by serving index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/quiz-frontend/browser/index.html'));
});

const PORT = process.env.PORT || 4200;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 