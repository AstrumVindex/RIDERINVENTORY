const express = require('express');
const fs = require('fs');
const path = require('path');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Security middleware
app.use(helmet());

// Enable CORS
app.use(cors());

// Enable compression
app.use(compression());

app.use(express.json());

// Set security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Serve static site from project root with caching
app.use(express.static(path.join(__dirname), {
  maxAge: '1d',
  etag: true
}));

const galleryPath = path.join(__dirname, 'gallery.json');

// Netlify-style function endpoint compatibility
app.get('/.netlify/functions/gallery', (req, res) => {
  try {
    const data = fs.readFileSync(galleryPath, 'utf8');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(data);
  } catch (err) {
    console.error('Failed to read gallery.json:', err);
    return res.status(500).json({ error: 'Failed to read gallery data.', details: err.message });
  }
});

app.post('/.netlify/functions/gallery', (req, res) => {
  try {
    const body = req.body;
    fs.writeFileSync(galleryPath, JSON.stringify(body, null, 2));
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Failed to write gallery.json:', err);
    return res.status(500).json({ error: 'Failed to save gallery data.', details: err.message });
  }
});

// Fallback for single-page app routes to serve index.html
app.get('*', (req, res, next) => {
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

const port = parseInt(process.env.PORT, 10) || 3000;
const server = app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
